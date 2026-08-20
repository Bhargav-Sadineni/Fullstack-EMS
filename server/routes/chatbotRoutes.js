// server/routes/chatbotRoutes.js
import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { chat } from "../controllers/chatbotController.js";

const chatbotRouter = Router();
chatbotRouter.post("/", protect, chat);

export default chatbotRouter;