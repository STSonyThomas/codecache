import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Conversation from "@/lib/db/conversation";
import connectDB from "@/lib/db/connect";
import Snippet from "@/lib/db/snippetModel"; // Adjust import path as needed

// Define types
interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

interface ConversationDocument {
  userId: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

interface GeminiMessage {
  role: "user" | "model"; // Changed from 'assistant' to 'model'
  parts: { text: string }[];
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function GET() {
  try {
    const { userId } = auth();
    console.log("[GET] User ID:", userId);

    if (!userId) {
      console.log("[GET] Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const conversations = await Conversation.find({ userId }).sort({
      updatedAt: -1,
    });
    console.log("[GET] Found conversations:", conversations.length);

    return NextResponse.json(conversations);
  } catch (error) {
    console.error("[GET] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    console.log("[POST] User ID:", userId);

    if (!userId) {
      console.log("[POST] Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, conversationId } = await req.json();
    console.log("[POST] Received:", { message, conversationId });

    await connectDB();

    let conversation;
    if (conversationId) {
      console.log("[POST] Finding existing conversation:", conversationId);
      conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        console.log("[POST] Conversation not found:", conversationId);
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 },
        );
      }
    } else {
      // Create new conversation without initial system message
      conversation = new Conversation({
        userId,
        messages: [], // Start with empty messages array
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Add user message to conversation
    const userMessage: Message = {
      role: "user",
      content: message,
      timestamp: new Date(),
    };
    conversation.messages.push(userMessage);

    // Get Gemini response
    console.log("[POST] Initializing Gemini chat");
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // If this is a new conversation, prepend system context to user's message
    let messageToSend = message;
    if (conversation.messages.length === 1) {
      // Only the user message we just added
      // Fetch available snippets
      const snippets = await Snippet.find({ userId }).limit(5);

      const snippetsContext = snippets
        .map((snippet) => `${snippet.title}: ${snippet.description}`)
        .join("\n");

      const systemContext = `You are CodeCache AI, an intelligent programming assistant.
      
Available Snippets:
${snippetsContext}

Guidelines:
1. Provide clear, concise explanations
2. Share code examples when relevant
3. Reference available snippets when appropriate
4. Follow best practices and security guidelines
5. Ask for clarification if needed
6. You are supposed to perform RAG on the available snippets and your knowledge base is limited to the available snippets.
7. If you are not sure about the answer, just say that you don't know. Don't try to make up an answer.
User's message: ${message}`;

      messageToSend = systemContext;
    }

    // Convert messages to Gemini format (excluding system messages)
    const chatHistory: GeminiMessage[] = conversation.messages.map(
      (msg: Message) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }),
    );

    const chat = model.startChat({
      history: chatHistory.slice(0, -1), // Exclude the last message since we'll send it
    });

    console.log("[POST] Sending message to Gemini");
    const result = await chat.sendMessage(messageToSend);
    const response = await result.response;
    const aiResponse = response.text();
    console.log(
      "[POST] Received Gemini response:",
      aiResponse.substring(0, 100) + "...",
    );

    // Add AI response to conversation
    const assistantMessage: Message = {
      role: "assistant",
      content: aiResponse,
      timestamp: new Date(),
    };
    conversation.messages.push(assistantMessage);
    conversation.updatedAt = new Date();
    await conversation.save();
    console.log("[POST] Saved conversation to database");

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("[POST] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
