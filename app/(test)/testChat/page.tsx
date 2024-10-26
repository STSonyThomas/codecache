"use client";

import { useState, useEffect, useRef } from "react";

interface Message {
  role: string;
  content: string;
  timestamp?: Date;
}

interface Conversation {
  _id?: string;
  messages: Message[];
}

export default function TestChat() {
  const [message, setMessage] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] =
    useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [currentConversation?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = async () => {
    try {
      console.log("Fetching conversations...");
      const response = await fetch("/api/conversation");
      const data = await response.json();
      console.log("Fetched conversations:", data);
      setConversations(data);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsLoading(true);
    console.log("Sending message:", {
      message,
      conversationId: currentConversation?._id,
    });

    try {
      const response = await fetch("/api/conversation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          conversationId: currentConversation?._id,
        }),
      });

      const data = await response.json();
      console.log("Received response:", data);

      if (response.ok) {
        setCurrentConversation(data);
        if (!currentConversation) {
          setConversations((prev) => [...prev, data]);
        }
        setMessage("");
      } else {
        console.error("Error response:", data);
        alert(`Error: ${data.error || "Something went wrong"}`);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Add logging to conversation switching
  const handleConversationSelect = (conv: Conversation) => {
    console.log("Switching to conversation:", conv._id);
    setCurrentConversation(conv);
  };

  // Add logging to new chat creation
  const handleNewChat = () => {
    console.log("Starting new chat");
    setCurrentConversation(null);
  };

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <div className="flex h-[80vh]">
        {/* Sidebar */}
        <div className="w-1/4 border-r p-4">
          <button
            onClick={handleNewChat}
            className="w-full mb-4 p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            New Chat
          </button>
          <div className="space-y-2">
            {conversations.map((conv) => (
              <div
                key={conv._id}
                onClick={() => handleConversationSelect(conv)}
                className={`p-2 cursor-pointer rounded ${
                  currentConversation?._id === conv._id
                    ? "bg-blue-100"
                    : "hover:bg-gray-100"
                }`}
              >
                {conv.messages[0]?.content.substring(0, 30)}...
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto">
            {currentConversation?.messages.map((msg, index) => (
              <div
                key={index}
                className={`mb-4 ${
                  msg.role === "user" ? "text-right" : "text-left"
                }`}
              >
                <div
                  className={`inline-block p-2 rounded-lg ${
                    msg.role === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-black"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="p-4 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 p-2 border rounded"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
              >
                {isLoading ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
