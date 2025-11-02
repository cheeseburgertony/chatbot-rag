import { convertToModelMessages, streamText, UIMessage } from "ai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { pc } from "@/lib/pinecone";

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY ?? "",
});

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  // 根据问题从向量库中匹配对应的内容并插入到content中
  const query = messages[messages.length - 1].parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join(" ");
  const content = await getContent(query);
  console.log("content", content);

  const result = streamText({
    model: deepseek("deepseek-chat"),
    system: "You are a helpful assistant, here is the context: " + content,
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}

const getContent = async (query: string) => {
  console.log("query", query);
  const index = pc.index("chatbot-rag").namespace("__default__");
  const results = await index.searchRecords({
    query: {
      topK: 10,
      inputs: { text: query },
    },
  });

  return results.result.hits
    .map((hit) => (hit.fields as { text: string }).text)
    .join(" ");
};
