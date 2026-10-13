import express from "express";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import cron from "node-cron";
import axios from "axios";
import { initEventBus, subscribeEvent, getDLQStats, replayDLQMessage } from "../shared/events.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4004;

app.use(express.json());

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async ({ to, subject, body }) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log(`[Notification Service Mock] Email to: ${to} | Subject: ${subject}`);
      return;
    }
    const info = await transporter.sendMail({
      from: process.env.SENDER_EMAIL || process.env.ADMIN_EMAIL,
      to,
      subject,
      html: body,
    });
    console.log(`[Notification Service] Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error("[Notification Service] Error sending email:", error.message);
  }
};

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    service: "notification-service",
    status: "healthy",
    uptime: process.uptime(),
    dlqStats: getDLQStats(),
  });
});

// Dead Letter Queue (DLQ) Diagnostic API
app.get("/dlq", (req, res) => {
  res.json({
    service: "notification-service",
    ...getDLQStats(),
  });
});

// Replay failed message from Dead Letter Queue
app.post("/dlq/replay/:id", async (req, res) => {
  try {
    const result = await replayDLQMessage(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Start workers and event listeners
async function startWorkers() {
  await initEventBus("notification-service");

  // 1. Subscribe to "attendance.clocked_in"
  await subscribeEvent("notification-service", "attendance.clocked_in", async (payload) => {
    const { employeeName, email, checkIn } = payload.data;
    console.log(`[Notification Service] Received event 'attendance.clocked_in' for ${employeeName}`);

    // Send check-in confirmation / reminder
    if (email) {
      await sendEmail({
        to: email,
        subject: "Attendance Check-In Confirmed",
        body: `<div style="font-family: sans-serif; max-width: 600px; padding: 20px;">
          <h2>Hi ${employeeName}, 👋</h2>
          <p>Your check-in has been recorded at <strong>${new Date(checkIn).toLocaleTimeString()}</strong>.</p>
          <p>Please remember to check out at the end of your shift!</p>
          <br/>
          <p>Best regards,<br/>EMS Team</p>
        </div>`,
      });
    }
  });

  // 2. Subscribe to "leave.applied"
  await subscribeEvent("notification-service", "leave.applied", async (payload) => {
    const { employeeName, department, startDate, endDate, reason } = payload.data;
    console.log(`[Notification Service] Received event 'leave.applied' from ${employeeName}`);

    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        subject: `New Leave Application - ${employeeName}`,
        body: `<div style="font-family: sans-serif; max-width: 600px; padding: 20px;">
          <h2>New Leave Request from ${employeeName} (${department})</h2>
          <p><strong>Period:</strong> ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p>Please review and approve/reject via the EMS Admin Dashboard.</p>
        </div>`,
      });
    }
  });

  // 3. Cron Job: Daily Attendance Reminder at 11:30 AM IST (06:00 UTC)
  cron.schedule("30 11 * * *", async () => {
    console.log("[Notification Service] Running 11:30 AM attendance reminder cron job...");
    // Can query Employee Service for absent employees and send reminders
  }, {
    timezone: "Asia/Kolkata"
  });

  console.log(" Notification Service event consumers and crons are active.");
}

app.listen(PORT, async () => {
  console.log(`🚀 [Notification Service] running on port ${PORT}`);
  await startWorkers();
});
