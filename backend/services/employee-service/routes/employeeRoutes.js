import express from "express";
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeByUserIdInternal,
  getEmployeeStatsInternal,
  getEmployeeByIdInternal,
} from "../controllers/employeeController.js";

const router = express.Router();

// Public / Protected Employee CRUD routes
router.get("/", getEmployees);
router.post("/", createEmployee);
router.put("/:id", updateEmployee);
router.delete("/:id", deleteEmployee);

// Internal Inter-Service RPC routes
router.get("/internal/by-user/:userId", getEmployeeByUserIdInternal);
router.get("/internal/stats", getEmployeeStatsInternal);
router.get("/internal/:id", getEmployeeByIdInternal);

export default router;
