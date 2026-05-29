import db from "../../../../db/db.config.js";
import { GoogleGenAI } from "@google/genai";

// Gemini model
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// Gemini client
const geminiClient = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// GET RECENT CONVERSATIONS

const getRecentConversationsRows = async (limit = 5) => {
  const normalizedLimit = Number.parseInt(limit, 10);

  const safeLimit =
    Number.isNaN(normalizedLimit) || normalizedLimit <= 0 ? 5 : normalizedLimit;

  const [rows] = await db.execute(
    `
      SELECT id, role, content, created_at
      FROM conversations
      ORDER BY id DESC
      LIMIT ?
    `,
    [safeLimit],
  );

  // reverse to keep oldest -> newest
  return rows.reverse();
};

// GENERATE AI RESPONSE

const generateAssistantAnswer = async ({ historyRows, question }) => {
  try {
    // format history for Gemini
    const formattedHistory = historyRows.map((row) => ({
      role: row.role === "assistant" ? "model" : "user",
      parts: [{ text: row.content }],
    }));

    const chat = geminiClient.chats.create({
      model: GEMINI_MODEL,
      history: formattedHistory,
    });

    const result = await chat.sendMessage({
      message: question,
    });
    const text =
      result?.text ||
      result?.response?.candidates
        ?.map((candidate) =>
          candidate?.content?.parts?.map((part) => part?.text).join(" "),
        )
        .join(" ") ||
      "";

    return {
      text,
      totalTokens:
        result?.totalTokens ?? result?.usageMetadata?.totalTokenCount ?? 0,
    };
  } catch (error) {
    console.error("Gemini Error:", error);

    if (
      error?.message?.includes("429") ||
      error?.message?.includes("RESOURCE_EXHAUSTED")
    ) {
      const quotaError = new Error(
        "Gemini API quota exceeded. Please try again later.",
      );

      quotaError.status = 429;
      throw quotaError;
    }

    const apiError = new Error(
      error?.message || "Failed to generate AI response.",
    );

    apiError.status = error?.status || 500;
    throw apiError;
  }
};
// CREATE CONVERSATION

export async function createConversationService(question) {
  try {
    const safeQuestion = typeof question === "string" ? question.trim() : "";

    if (!safeQuestion) {
      const error = new Error("Question is required");
      error.status = 400;
      throw error;
    }

    const historyRows = await getRecentConversationsRows(5);

    const [userResult] = await db.execute(
      `
        INSERT INTO conversations
        (content, role)
        VALUES (?, "user")
      `,
      [safeQuestion],
    );

    const assistantResponse = await generateAssistantAnswer({
      historyRows,
      question: safeQuestion,
    });

    const [assistantResult] = await db.execute(
      `
        INSERT INTO conversations
        (content, role, token_count)
        VALUES (?, "assistant", ?)
      `,
      [assistantResponse.text, assistantResponse.totalTokens || 0],
    );

    return {
      userConversation: {
        id: userResult.insertId,
        role: "user",
        content: safeQuestion,
      },
      assistantConversation: {
        id: assistantResult.insertId,
        role: "assistant",
        content: assistantResponse.text,
      },
      totalTokens: assistantResponse.totalTokens || 0,
    };
  } catch (error) {
    throw error;
  }
}
// GET ALL CONVERSATIONS

export async function getConversationsService() {
  try {
    const [rows] = await db.execute(`
      SELECT *
      FROM conversations
      ORDER BY id ASC
    `);

    return {
      conversations: rows,
    };
  } catch (error) {
    throw error;
  }
}
