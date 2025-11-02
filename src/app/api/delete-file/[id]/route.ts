import { deleteFileById, getFileById } from "@/db";
import { pc } from "@/lib/pinecone";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const fileId = parseInt(id, 10);

    if (isNaN(fileId)) {
      return new Response(JSON.stringify({ message: "Invalid file ID" }), {
        status: 400,
      });
    }

    // 根据id查找到对应的文件
    const file = await getFileById(fileId);

    if (!file) {
      return new Response(JSON.stringify({ message: "File not found" }), {
        status: 404,
      });
    }

    // 取到recordsIds从Pinecone中删除对应的向量
    if (file.records_ids && file.records_ids.length > 0) {
      const index = pc.index("chatbot-rag").namespace("__default__");
      await index.deleteMany(file.records_ids);
    }

    // 从数据库中删除文件记录
    await deleteFileById(fileId);

    return new Response(
      JSON.stringify({ message: "File deleted successfully" }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting file:", error);
    return new Response(JSON.stringify({ message: "Error deleting file" }), {
      status: 500,
    });
  }
}
