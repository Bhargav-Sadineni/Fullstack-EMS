import { GoogleGenAI } from "@google/genai";
import { DEPARTMENTS } from "../constants/departments.js";
import Employee from "../models/Employee.js";
import Attendance from "../models/Attendance.js";
import LeaveApplication from "../models/LeaveApplication.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = "gemini-3.7-flash";

const EMPLOYEE_TOOLS = [
  {
    type: "function",
    name: "get_leave_summary",
    description: "Count of the employee's own leave applications, optionally filtered by status.",
    parameters: {
      type: "object",
      properties: { status: { type: "string", enum: ["PENDING", "APPROVED", "REJECTED"] } },
    },
  },
  {
    type: "function",
    name: "get_attendance_summary",
    description: "Present / late / absent day counts for the employee's own attendance in a date range. Defaults to the current month if no dates given.",
    parameters: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "YYYY-MM-DD" },
        endDate: { type: "string", description: "YYYY-MM-DD" },
      },
    },
  },
  {
    type: "function",
    name: "get_my_profile",
    description: "The employee's own department, position, phone, email, join date, and bio.",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function",
    name: "update_my_bio",
    description: "Updates the employee's own bio text.",
    parameters: {
      type: "object",
      properties: { bio: { type: "string" } },
      required: ["bio"],
    },
  },
];

const ADMIN_TOOLS = [
  {
    type: "function",
    name: "get_today_attendance",
    description: "Company-wide present / late / absent counts for today.",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function",
    name: "get_leave_summary",
    description: "Company-wide leave counts, optionally filtered by status (e.g. pending).",
    parameters: {
      type: "object",
      properties: { status: { type: "string", enum: ["PENDING", "APPROVED", "REJECTED"] } },
    },
  },
  {
    type: "function",
    name: "get_leaves_by_employee",
    description: "Leave application counts broken down per employee.",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function",
    name: "get_employee_count",
    description: "Total active employee count, optionally filtered by department.",
    parameters: {
      type: "object",
      properties: { department: { type: "string", enum: DEPARTMENTS } },
    },
  },
  {
    type: "function",
    name: "get_department_breakdown",
    description: "Active employee count per department, across all departments.",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function",
    name: "update_employee_profile",
    description: "Updates one field on a named employee's record. Allowed fields: bio, phone, position, department, basicSalary, allowances, deductions, employmentStatus.",
    parameters: {
      type: "object",
      properties: {
        employeeEmail: { type: "string", description: "The employee's work email, used to find them." },
        field: { type: "string", enum: ["bio", "phone", "position", "department", "basicSalary", "allowances", "deductions", "employmentStatus"] },
        value: { type: "string" },
      },
      required: ["employeeEmail", "field", "value"],
    },
  },
];

async function dateHasApprovedLeave(employeeId, date) {
  const leave = await LeaveApplication.findOne({
    employeeId,
    status: "APPROVED",
    startDate: { $lte: date },
    endDate: { $gte: date },
  });
  return !!leave;
}

async function runEmployeeTool(name, args, employee) {
  if (name === "get_leave_summary") {
    const where = { employeeId: employee._id };
    if (args.status) where.status = args.status;
    const leaves = await LeaveApplication.find(where).lean();

    const byStatus = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
    let i = 0;
    while (i < leaves.length) {
      byStatus[leaves[i].status]++;
      i++;
    }
    return { total: leaves.length, byStatus };
  }

  if (name === "get_attendance_summary") {
    const now = new Date();
    const start = args.startDate ? new Date(args.startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const rawEnd = args.endDate ? new Date(args.endDate) : now;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = rawEnd < today ? rawEnd : today;

    const records = await Attendance.find({
      employeeId: employee._id,
      date: { $gte: start, $lte: end },
    }).lean();

    const byDate = {};
    let i = 0;
    while (i < records.length) {
      byDate[records[i].date.toDateString()] = records[i].status;
      i++;
    }

    let present = 0, late = 0, absent = 0;
    const cursor = new Date(start);
    while (cursor <= end) {
      const key = cursor.toDateString();
      const status = byDate[key];
      if (status === "PRESENT") present++;
      else if (status === "LATE") late++;
      else {
        const onLeave = await dateHasApprovedLeave(employee._id, new Date(cursor));
        if (!onLeave) absent++;
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return { present, late, absent };
  }

  if (name === "get_my_profile") {
    return {
      firstName: employee.firstName,
      lastName: employee.lastName,
      department: employee.department,
      position: employee.position,
      phone: employee.phone,
      email: employee.email,
      joinDate: employee.joinDate,
      bio: employee.bio,
    };
  }

  if (name === "update_my_bio") {
    if (employee.isDeleted) return { error: "Account deactivated, cannot update." };
    await Employee.findByIdAndUpdate(employee._id, { bio: args.bio });
    return { success: true };
  }

  return { error: "Unknown tool" };
}

async function runAdminTool(name, args) {
  if (name === "get_today_attendance") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const activeEmployees = await Employee.find({ isDeleted: false, employmentStatus: "ACTIVE" }).lean();
    const records = await Attendance.find({ date: { $gte: today, $lt: tomorrow } }).lean();
    const onLeave = await LeaveApplication.find({
      status: "APPROVED",
      startDate: { $lte: today },
      endDate: { $gte: today },
    }).lean();

    const checkedInIds = new Set(records.map((r) => r.employeeId.toString()));
    const onLeaveIds = new Set(onLeave.map((l) => l.employeeId.toString()));

    let present = 0, late = 0, absent = 0;
    let i = 0;
    while (i < activeEmployees.length) {
      const id = activeEmployees[i]._id.toString();
      if (checkedInIds.has(id)) {
        const rec = records.find((r) => r.employeeId.toString() === id);
        if (rec.status === "LATE") late++; else present++;
      } else if (!onLeaveIds.has(id)) {
        absent++;
      }
      i++;
    }
    return { present, late, absent, onLeave: onLeaveIds.size, totalActive: activeEmployees.length };
  }

  if (name === "get_leave_summary") {
    const where = {};
    if (args.status) where.status = args.status;
    const leaves = await LeaveApplication.find(where).lean();
    const byStatus = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
    let i = 0;
    while (i < leaves.length) {
      byStatus[leaves[i].status]++;
      i++;
    }
    return { total: leaves.length, byStatus };
  }

  if (name === "get_leaves_by_employee") {
    const leaves = await LeaveApplication.find().populate("employeeId").lean();
    const map = {};
    let i = 0;
    while (i < leaves.length) {
      const emp = leaves[i].employeeId;
      const key = emp ? `${emp.firstName} ${emp.lastName}` : "Unknown";
      if (!map[key]) map[key] = { total: 0, PENDING: 0, APPROVED: 0, REJECTED: 0 };
      map[key].total++;
      map[key][leaves[i].status]++;
      i++;
    }
    return map;
  }

  if (name === "get_employee_count") {
    const where = { isDeleted: { $ne: true } };
    if (args.department) where.department = args.department;
    const count = await Employee.countDocuments(where);
    return { count };
  }

  if (name === "get_department_breakdown") {
    const employees = await Employee.find({ isDeleted: { $ne: true } }).lean();
    const counts = {};
    let i = 0;
    while (i < employees.length) {
      const dept = employees[i].department || "Unassigned";
      counts[dept] = (counts[dept] || 0) + 1;
      i++;
    }
    return counts;
  }

  if (name === "update_employee_profile") {
    const allowed = ["bio", "phone", "position", "department", "basicSalary", "allowances", "deductions", "employmentStatus"];
    if (!allowed.includes(args.field)) return { error: "Field not allowed" };

    const employee = await Employee.findOne({ email: args.employeeEmail });
    if (!employee) return { error: "Employee not found with that email" };

    const numericFields = ["basicSalary", "allowances", "deductions"];
    const value = numericFields.includes(args.field) ? Number(args.value) : args.value;

    await Employee.findByIdAndUpdate(employee._id, { [args.field]: value });
    return { success: true, updated: `${employee.firstName} ${employee.lastName}`, field: args.field, value };
  }

  return { error: "Unknown tool" };
}

// POST /api/chatbot
export const chat = async (req, res) => {
  try {
    const session = req.session;
    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    const isAdmin = session.role === "ADMIN";
    const employee = isAdmin ? null : await Employee.findOne({ userId: session.userId });
    if (!isAdmin && !employee) return res.status(404).json({ error: "Employee not found" });

    const tools = isAdmin ? ADMIN_TOOLS : EMPLOYEE_TOOLS;
    const systemPrompt = isAdmin
      ? "You are the EMS admin assistant. Answer using the provided tools only — never invent numbers. Be concise."
      : `You are the EMS employee assistant for ${employee.firstName}. You can ONLY access THEIR OWN data via the provided tools. Be concise.`;

    let convo = `${systemPrompt}\n\n`;
    let i = 0;
    while (i < history.length) {
      convo += `${history[i].role === "user" ? "User" : "Assistant"}: ${history[i].content}\n`;
      i++;
    }
    convo += `User: ${message}`;

    let interaction = await ai.interactions.create({ model: MODEL, input: convo, tools });
    let guard = 0;

    while (guard < 5) {
      const calls = interaction.steps.filter((s) => s.type === "function_call");
      if (calls.length === 0) break;

      const resultInputs = [];
      let j = 0;
      while (j < calls.length) {
        const call = calls[j];
        const result = isAdmin
          ? await runAdminTool(call.name, call.arguments || {})
          : await runEmployeeTool(call.name, call.arguments || {}, employee);
        resultInputs.push({
          type: "function_result",
          name: call.name,
          call_id: call.id,
          result: [{ type: "text", text: JSON.stringify(result) }],
        });
        j++;
      }

      interaction = await ai.interactions.create({
        model: MODEL,
        previous_interaction_id: interaction.id,
        tools,
        input: resultInputs,
      });
      guard++;
    }

    return res.json({ reply: interaction.output_text });
  } catch (error) {
    console.error("Chatbot error:", error);
    return res.status(500).json({ error: "Chatbot failed" });
  }
};