"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";

export default function ChatContainer() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });
  const [input, setInput] = useState("");

  const endRef = useRef<HTMLDivElement>(null);

  // 随着对话消息的增加，自动滚动到底部
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="h-full w-full flex flex-col">
      {/* 对话内容 */}
      <div className="flex-1 flex flex-col gap-2 h-full overflow-auto">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-2 flex flex-row ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <p
              className={`text-sm inline-block break-word whitespace-pre-wrap max-w-[80%] p-2 rounded-lg ${
                message.role === "user" ? "bg-blue-100" : "bg-white"
              }`}
            >
              {message.parts.map((part, index) =>
                part.type === "text" ? (
                  <span key={index}>{part.text}</span>
                ) : null
              )}
            </p>
          </div>
        ))}
        <div ref={endRef}></div>
      </div>

      {/* 输入框和发送按钮 */}
      <form
        className="flex flex-row gap-2 p-2 h-20 justify-center items-center"
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            sendMessage({ text: input });
            setInput("");
          }
        }}
      >
        <input
          className="flex-1 rounded-lg p-2 border border-gray-300"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={status !== "ready"}
          placeholder="Say something..."
        />
        <Button type="submit" disabled={status !== "ready"}>
          Send
        </Button>
      </form>
    </div>
  );
}
