import { NextResponse } from "next/server";
import { WebPDFLoader } from "@langchain/community/document_loaders/web/pdf";
import { CharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { pc } from "@/lib/pinecone";
import { Md5 } from "ts-md5";
import { insertFile } from "@/db";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    console.log(file.name);

    // 1.分割成docs
    const buffer = await file.arrayBuffer();
    // Create a Blob from the buffer
    const blob = new Blob([buffer], { type: "application/pdf" });

    const loader = new WebPDFLoader(blob, {
      // required params = ...
      // optional params = ...
    });

    const docs = await loader.load();

    // 2.对docs进行分割成向量 split docs
    const splitDocs = await Promise.all(docs.map((doc) => splitDoc(doc)));

    // 3.上传向量数据库
    await Promise.all(splitDocs.map(embedChunks));

    // 4.存储文件信息到数据库
    await insertFile(file.name, Md5.hashStr(file.name));

    return NextResponse.json({ message: "File uploaded successfully" });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { message: "Error uploading file", error: (error as Error).message },
      { status: 500 }
    );
  }
}

const splitDoc = async (doc: Document) => {
  const textSplitter = new CharacterTextSplitter({
    chunkSize: 100,
    chunkOverlap: 0,
  });
  const texts = await textSplitter.splitText(doc.pageContent);

  return texts;
};

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

  return await pc
    .index(indexName)
    .namespace("__default__")
    .upsertRecords(records);
};
