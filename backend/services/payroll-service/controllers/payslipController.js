import Payslip from "../models/Payslip.js";
import { getEmployeeForUser, getEmployeeById } from "../helpers/employeeClient.js";

// POST /api/payslips
export const createPayslip = async (req, res) => {
  try {
    const { employeeId, month, year, basicSalary, allowances, deductions } = req.body;

    if (!employeeId || !month || !year || !basicSalary) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Concurrency guard: check if already generated
    const existing = await Payslip.findOne({
      employeeId,
      month: Number(month),
      year: Number(year),
    });
    if (existing) {
      return res.status(400).json({ error: "A payslip for this employee and period already exists." });
    }

    const netSalary = Number(basicSalary) + Number(allowances || 0) - Number(deductions || 0);

    const payslip = await Payslip.create({
      employeeId,
      month: Number(month),
      year: Number(year),
      basicSalary: Number(basicSalary),
      allowances: Number(allowances || 0),
      deductions: Number(deductions || 0),
      netSalary,
    });

    return res.json({ success: true, data: payslip });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "A payslip for this employee and period already exists." });
    }
    console.error("Create payslip error:", error);
    return res.status(500).json({ error: "Failed to generate payslip" });
  }
};

// GET /api/payslips
export const getPayslips = async (req, res) => {
  try {
    const session = req.session;
    if (!session?.userId) return res.status(401).json({ error: "Unauthorized" });

    const isAdmin = session.role === "ADMIN";

    if (isAdmin) {
      const payslips = await Payslip.find().sort({ createdAt: -1 }).lean();
      // Enrich with employee data from Employee Service
      const enriched = await Promise.all(
        payslips.map(async (p) => {
          const employee = await getEmployeeById(p.employeeId);
          return {
            ...p,
            id: p._id.toString(),
            employee,
            employeeId: p.employeeId?.toString(),
          };
        })
      );

      return res.json({ data: enriched });
    } else {
      const employee = await getEmployeeForUser(session.userId);
      if (!employee) return res.status(404).json({ error: "Employee not found" });

      const payslips = await Payslip.find({ employeeId: employee._id || employee.id })
        .sort({ createdAt: -1 })
        .lean();

      return res.json({ data: payslips });
    }
  } catch (error) {
    console.error("Get payslips error:", error);
    return res.status(500).json({ error: "Failed to fetch payslips" });
  }
};

// GET /api/payslips/:id
export const getPayslipById = async (req, res) => {
  try {
    const payslip = await Payslip.findById(req.params.id).lean();
    if (!payslip) return res.status(404).json({ error: "Payslip not found" });

    const employee = await getEmployeeById(payslip.employeeId);

    return res.json({
      ...payslip,
      id: payslip._id.toString(),
      employee,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch payslip" });
  }
};

// Internal API: Latest payslip for Employee Dashboard
export const getLatestPayslipInternal = async (req, res) => {
  try {
    const payslip = await Payslip.findOne({ employeeId: req.params.employeeId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json(payslip ? { ...payslip, id: payslip._id.toString() } : null);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch latest payslip" });
  }
};
