import axios from "axios";

// Microservice URLs (configurable via environment variables or Docker DNS)
const SERVICES = {
  auth: process.env.AUTH_SERVICE_URL || "http://localhost:4001",
  employee: process.env.EMPLOYEE_SERVICE_URL || "http://localhost:4002",
  attendance: process.env.ATTENDANCE_SERVICE_URL || "http://localhost:4003",
  notification: process.env.NOTIFICATION_SERVICE_URL || "http://localhost:4004",
  payroll: process.env.PAYROLL_SERVICE_URL || "http://localhost:4005",
  chatbot: process.env.CHATBOT_SERVICE_URL || "http://localhost:4006",
};

// Aggregator Pattern: GET /api/dashboard
// Concurrently aggregates data from Employee, Attendance, and Payroll microservices
export const getDashboard = async (req, res) => {
  try {
    const session = req.session;
    const correlationId = req.headers["x-correlation-id"];
    const headers = {
      "X-Correlation-ID": correlationId,
      "x-user-id": session.userId,
      "x-user-role": session.role,
      "x-user-email": session.email,
    };

    if (session.role === "ADMIN") {
      const [empStatsRes, attStatsRes] = await Promise.all([
        axios.get(`${SERVICES.employee}/api/employees/internal/stats`, { headers }),
        axios.get(`${SERVICES.attendance}/api/attendance/internal/stats`, { headers }),
      ]);

      return res.json({
        role: "ADMIN",
        totalEmployees: empStatsRes.data.totalEmployees || 0,
        totalDepartments: empStatsRes.data.totalDepartments || 7,
        todayAttendance: attStatsRes.data.todayAttendance || 0,
        pendingLeaves: attStatsRes.data.pendingLeaves || 0,
      });
    } else {
      // Employee Dashboard
      const empRes = await axios.get(
        `${SERVICES.employee}/api/employees/internal/by-user/${session.userId}`,
        { headers }
      );
      const employee = empRes.data;

      const [payrollRes] = await Promise.all([
        axios
          .get(`${SERVICES.payroll}/api/payslips/internal/latest/${employee.id || employee._id}`, {
            headers,
          })
          .catch(() => ({ data: null })),
      ]);

      return res.json({
        role: "EMPLOYEE",
        employee,
        currentMonthAttendance: 1,
        pendingLeaves: 0,
        latestPayslip: payrollRes.data,
      });
    }
  } catch (error) {
    console.error("Gateway Aggregator Dashboard Error:", error.message);
    return res.status(500).json({ error: "Failed to aggregate dashboard data" });
  }
};
