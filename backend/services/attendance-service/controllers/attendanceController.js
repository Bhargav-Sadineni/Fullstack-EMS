import Attendance from "../models/Attendance.js";
import { getEmployeeForUser } from "../helpers/employeeClient.js";
import { publishEvent } from "../../shared/events.js";

// POST /api/attendance (Clock In / Clock Out)
export const clockInOut = async (req, res) => {
  try {
    const session = req.session;
    if (!session?.userId) return res.status(401).json({ error: "Unauthorized" });

    const employee = await getEmployeeForUser(session.userId);
    if (!employee) return res.status(404).json({ error: "Employee not found" });
    if (employee.isDeleted) return res.status(403).json({ error: "Your account is deactivated." });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await Attendance.findOne({
      employeeId: employee._id || employee.id,
      date: today,
    });

    const now = new Date();

    if (!existing) {
      const isLate = now.getHours() >= 9 && now.getMinutes() > 0;
      const attendance = await Attendance.create({
        employeeId: employee._id || employee.id,
        date: today,
        checkIn: now,
        status: isLate ? "LATE" : "PRESENT",
      });

      // Publish event to Message Queue
      await publishEvent("attendance.clocked_in", {
        employeeId: employee._id || employee.id,
        attendanceId: attendance._id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        email: employee.email,
        checkIn: now,
      });

      return res.json({ success: true, type: "CHECK_IN", data: attendance });
    } else if (!existing.checkOut) {
      const checkInTime = new Date(existing.checkIn).getTime();
      const diffMs = now.getTime() - checkInTime;
      const diffHours = diffMs / (1000 * 60 * 60);

      existing.checkOut = now;
      const workingHours = parseFloat(diffHours.toFixed(2));
      let dayType = "Half Day";
      if (workingHours >= 8) dayType = "Full Day";

      existing.workingHours = workingHours;
      existing.dayType = dayType;
      await existing.save();

      return res.json({ success: true, type: "CHECK_OUT", data: existing });
    } else {
      return res.status(400).json({ error: "You have already checked in and out for today." });
    }
  } catch (error) {
    if (error.code === 11000) {
      // Concurrency race condition handled: record was already created concurrently
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const existing = await Attendance.findOne({ date: today });
      return res.json({ success: true, type: "CHECK_IN", data: existing });
    }
    console.error("Clock in/out error:", error);
    return res.status(500).json({ error: "Attendance action failed" });
  }
};

// GET /api/attendance
export const getAttendance = async (req, res) => {
  try {
    const session = req.session;
    if (!session?.userId) return res.status(401).json({ error: "Unauthorized" });

    const isAdmin = session.role === "ADMIN";

    if (isAdmin) {
      const date = req.query.date ? new Date(req.query.date) : new Date();
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);

      const records = await Attendance.find({
        date: { $gte: date, $lt: nextDay },
      }).sort({ createdAt: -1 });

      return res.json({ data: records });
    } else {
      const employee = await getEmployeeForUser(session.userId);
      if (!employee) return res.status(404).json({ error: "Employee not found" });

      const records = await Attendance.find({
        employeeId: employee._id || employee.id,
      }).sort({ date: -1 });

      return res.json({ data: records });
    }
  } catch (error) {
    console.error("Get attendance error:", error);
    return res.status(500).json({ error: "Failed to fetch attendance" });
  }
};

// Internal API: Stats for Dashboard Aggregator
export const getAttendanceStatsInternal = async (req, res) => {
  try {
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const todayEnd = new Date(new Date().setHours(24, 0, 0, 0));

    const todayAttendance = await Attendance.countDocuments({
      date: { $gte: todayStart, $lt: todayEnd },
    });

    return res.json({ todayAttendance });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch attendance stats" });
  }
};
