import express from "express";
import {
  createPayslip,
  getPayslips,
  getPayslipById,
  getLatestPayslipInternal,
} from "../controllers/payslipController.js";

const router = express.Router();

router.post("/", createPayslip);
router.get("/", getPayslips);
router.get("/:id", getPayslipById);

// Internal Inter-Service RPC Endpoint
router.get("/internal/latest/:employeeId", getLatestPayslipInternal);

export default router;
