import { GoogleGenAI } from "@google/genai";

let ai = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

// Fallback canned responses if external API is temporarily unreachable
const getSmartFallback = (query, role) => {
  const q = query.toLowerCase();
  if (q.includes("leave") || q.includes("vacation") || q.includes("holiday")) {
    return "You can apply for leaves or check your leave status directly in the 'Leaves' tab from the sidebar. Standard company policy permits Sick Leave, Casual Leave, and Annual Paid Time Off.";
  }
  if (q.includes("attendance") || q.includes("clock") || q.includes("check in")) {
    return "You can clock in and clock out on the 'Attendance' page. Check-in after 9:00 AM is logged as 'LATE'. 8+ hours represents a Full Day of work.";
  }
  if (q.includes("payslip") || q.includes("salary") || q.includes("pay")) {
    return role === "ADMIN" 
      ? "As an Admin, you can generate monthly payslips and review salary history for all staff in the 'Payslips' section."
      : "You can view and download all your generated monthly payslips in the 'Payslips' section from the navigation menu.";
  }
  if (q.includes("profile") || q.includes("password") || q.includes("email")) {
    return "You can manage your bio and profile details on your Profile page, and update your security settings under Settings.";
  }
  return "I'm here to assist with your Employee Management System needs! You can ask me about applying for leaves, tracking attendance, reviewing payslips, or general organizational policies.";
};

// POST /api/chatbot
export const handleChat = async (req, res) => {
  try {
    const session = req.session;
    if (!session?.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { message, history = [] } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    if (!ai) {
      return res.json({
        reply: getSmartFallback(message, session.role),
      });
    }

    // Role-aware context
    const systemPrompt = `You are an AI assistant for the Employee Management System (EMS).
User Role: ${session.role || "EMPLOYEE"}
User Email: ${session.email || "user@example.com"}
Provide concise, helpful, polite answers focused on HR, employee management, leaves, attendance, payroll, and organization workflows. Keep responses formatted with clean markdown when helpful.`;

    // Format conversation history for context
    const contents = [];
    contents.push({
      role: "user",
      parts: [{ text: systemPrompt }],
    });
    contents.push({
      role: "model",
      parts: [{ text: "Understood. I am your EMS assistant. How can I assist you today?" }],
    });

    // Append last few messages of history if present
    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-4);
      for (const h of recentHistory) {
        if (h.content) {
          contents.push({
            role: h.role === "assistant" ? "model" : "user",
            parts: [{ text: String(h.content) }],
          });
        }
      }
    }

    // Append the latest user message
    contents.push({
      role: "user",
      parts: [{ text: message.trim() }],
    });

    // Try fast & reliable model first, with fallbacks
    const MODELS = ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.1-pro-preview"];
    let reply = null;
    let lastErr = null;

    for (const model of MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
        });

        if (response && response.text) {
          reply = response.text.trim();
          break;
        }
      } catch (err) {
        lastErr = err;
        console.warn(`[Chatbot] Model ${model} failed:`, err.message);
      }
    }

    if (!reply) {
      console.warn("[Chatbot] All Gemini models failed, falling back to smart helper:", lastErr?.message);
      reply = getSmartFallback(message, session.role);
    }

    return res.json({ reply });
  } catch (error) {
    console.error("Chatbot controller error:", error);
    return res.json({
      reply: getSmartFallback(req.body?.message || "", req.session?.role),
    });
  }
};
