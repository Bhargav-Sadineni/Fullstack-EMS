import express from "express";
import Attendance from "../models/Attendance.js";
import LeaveApplication from "../models/LeaveApplication.js";
import { clockInOut, getAttendance } from "../controllers/attendanceController.js";

const router = express.Router();

router.post("/", clockInOut);
router.get("/", getAttendance);

// Internal Stats endpoint for Dashboard Aggregator
router.get("/internal/stats", async (req, res) => {
  try {
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const todayEnd = new Date(new Date().setHours(24, 0, 0, 0));

    const [todayAttendance, pendingLeaves] = await Promise.all([
      Attendance.countDocuments({ date: { $gte: todayStart, $lt: todayEnd } }),
      LeaveApplication.countDocuments({ status: "PENDING" }),
    ]);

    return res.json({ todayAttendance, pendingLeaves });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch attendance stats" });
  }
});

export default router;
