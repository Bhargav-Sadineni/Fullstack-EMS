import LeaveApplication from "../models/LeaveApplication.js";
import { getEmployeeForUser, getEmployeeById } from "../helpers/employeeClient.js";
import { publishEvent } from "../../shared/events.js";

// POST /api/leave
export const createLeave = async (req, res) => {
  try {
    const session = req.session;
    if (!session?.userId) return res.status(401).json({ error: "Unauthorized" });

    const employee = await getEmployeeForUser(session.userId);
    if (!employee) return res.status(404).json({ error: "Employee not found" });
    if (employee.isDeleted) return res.status(403).json({ error: "Account deactivated." });

    const { type, startDate, endDate, reason } = req.body;
    if (!type || !startDate || !endDate || !reason) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(startDate) <= today || new Date(endDate) <= today) {
      return res.status(400).json({ error: "Leave dates must be in the future." });
    }
    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ error: "End date cannot be before start date." });
    }

    const leave = await LeaveApplication.create({
      employeeId: employee._id || employee.id,
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      status: "PENDING",
    });

    // Publish event to Message Queue for admin notifications
    await publishEvent("leave.applied", {
      leaveId: leave._id,
      employeeId: employee._id || employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      department: employee.department,
      startDate: leave.startDate,
      endDate: leave.endDate,
      reason,
    });

    return res.json({ success: true, data: leave });
  } catch (error) {
    console.error("Create leave error:", error);
    return res.status(500).json({ error: "Failed to apply leave" });
  }
};

// GET /api/leave
export const getLeaves = async (req, res) => {
  try {
    const session = req.session;
    if (!session?.userId) return res.status(401).json({ error: "Unauthorized" });

    const isAdmin = session.role === "ADMIN";

    if (isAdmin) {
      const status = req.query.status;
      const where = status ? { status } : {};
      const leaves = await LeaveApplication.find(where).sort({ createdAt: -1 }).lean();

      // Enrich leaves with employee details from Employee Service (Microservice Composition)
      const enrichedLeaves = await Promise.all(
        leaves.map(async (l) => {
          const employee = await getEmployeeById(l.employeeId);
          return {
            ...l,
            id: l._id.toString(),
            employee,
            employeeId: l.employeeId?.toString(),
          };
        })
      );

      return res.json({ data: enrichedLeaves });
    } else {
      const employee = await getEmployeeForUser(session.userId);
      if (!employee) return res.status(404).json({ error: "Employee not found" });

      const leaves = await LeaveApplication.find({
        employeeId: employee._id || employee.id,
      })
        .sort({ createdAt: -1 })
        .lean();

      return res.json({
        data: leaves.map((l) => ({
          ...l,
          id: l._id.toString(),
          employee,
        })),
        employee,
      });
    }
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch leaves" });
  }
};

// PATCH /api/leave/:id
export const updateLeaveStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const leave = await LeaveApplication.findByIdAndUpdate(
      req.params.id,
      { status },
      { returnDocument: "after" }
    );
    return res.json({ success: true, data: leave });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update leave status" });
  }
};
