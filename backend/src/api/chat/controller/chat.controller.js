import {
  createConversationService,
  getConversationsService,
} from "../service/chat.service.js";

export async function createConversationController(req, res) {
  try {
    const question =
      typeof req.body?.question === "string" ? req.body.question.trim() : "";

    const result = await createConversationService(question);

    res.status(201).json({
      success: true,
      message: "conversation posted successfully",
      data: result,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function getConversationsController(req, res) {
  try {
    const result = await getConversationsService();

    res.status(200).json({
      success: true,
      message: "conversations retrieved successfully",
      data: result,
    });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
    });
  }
}
