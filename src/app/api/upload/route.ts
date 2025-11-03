import { NextResponse } from "next/server";
import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { CharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { pc } from "@/lib/pinecone";
import { Md5 } from "ts-md5";
import { insertFile } from "@/db";

// 支持的文件类型
const SUPPORTED_FILE_TYPES = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "application/msword": ".doc",
  "text/markdown": ".md",
  "text/plain": ".txt",
};

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ message: "没有上传文件" }, { status: 400 });
    }

    const fileExtension = file.name.toLowerCase().split(".").pop();
    const isSupported =
      Object.values(SUPPORTED_FILE_TYPES).some(
        (ext) => ext === `.${fileExtension}`
      ) || Object.keys(SUPPORTED_FILE_TYPES).includes(file.type);

    if (!isSupported) {
      return NextResponse.json(
        {
          message: "不支持的文件类型. 请上传以下类型的文件: PDF, DOCX, MD, TXT",
          supportedTypes: Object.values(SUPPORTED_FILE_TYPES).join(", "),
        },
        { status: 400 }
      );
    }

    // 1.对不同类型文件进行处理并分割成docs
    const docs = await loadDocument(file);

    // 2.对docs进行分割成向量 split docs
    const splitDocs = await Promise.all(docs.map((doc) => splitDoc(doc)));

    // 3.上传向量数据库
    const recordsIds = await Promise.all(splitDocs.map(embedChunks));

    // 4.存储文件信息到数据库
    await insertFile(file.name, Md5.hashStr(file.name), recordsIds.flat());

    return NextResponse.json({ message: "File uploaded successfully" });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { message: "Error uploading file", error: (error as Error).message },
      { status: 500 }
    );
  }
}

// 根据文件类型加载文档
const loadDocument = async (file: File): Promise<Document[]> => {
  const buffer = await file.arrayBuffer();
  const fileExtension = file.name.toLowerCase().split(".").pop();

  switch (fileExtension) {
    case "pdf": {
      const blob = new Blob([buffer], { type: "application/pdf" });
      const loader = new WebPDFLoader(blob);
      return await loader.load();
    }

    case "docx":
    case "doc": {
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const loader = new DocxLoader(blob);
      return await loader.load();
    }

    case "md":
    case "txt": {
      // 直接读取文本内容，手动创建 Document
      const text = new TextDecoder("utf-8").decode(buffer);
      return [
        new Document({
          pageContent: text,
          metadata: {
            source: file.name,
            type: fileExtension,
          },
        }),
      ];
    }

    default:
      throw new Error(`不支持的文件类型: ${fileExtension}`);
  }
};

// 文档分割成块
const splitDoc = async (doc: Document) => {
  const textSplitter = new CharacterTextSplitter({
    chunkSize: 100,
    chunkOverlap: 0,
  });
  const texts = await textSplitter.splitText(doc.pageContent);

  return texts;
};

// 将切割后的文档的向量上传到 Pinecone
const embedChunks = async (chunks: string[]) => {
  /**
  // 手动使用 Pinecone SDK 进行嵌入和上传
  const model = "multilingual-e5-large";

  const embeddings = await pc.inference.embed(model, chunks, {
    inputType: "passage",
    truncate: "END",
  });

  const records = chunks.map((c, i) => ({
    id: Md5.hashStr(c),
    values:
      embeddings.data[i].vectorType === "dense"
        ? embeddings.data[i].values
        : [],
    metadata: { text: c },
  }));

  return await pc.index("chatbot-rag").upsert(records);
*/

  // 使用 Pinecone 的 createIndexForModel 方法创建索引，自动处理向量嵌入
  const indexName = "chatbot-rag";

  // 检查是否已经存在该索引
  const indexes = await pc.listIndexes();
  const indexExists = indexes.indexes?.some((idx) => idx.name === indexName);

  if (!indexExists) {
    await pc.createIndexForModel({
      name: indexName,
      cloud: "aws",
      region: "us-east-1",
      embed: {
        model: "multilingual-e5-large",
        fieldMap: { text: "text" },
      },
      waitUntilReady: true,
    });
  }
  const records = chunks.map((c) => ({
    _id: Md5.hashStr(c),
    text: c,
  }));

  const recordsIds = records.map((r) => r._id);

  await pc.index(indexName).namespace("__default__").upsertRecords(records);

  return recordsIds;
};
