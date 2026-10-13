import axios from "axios";
import Employee from "../models/Employee.js";
import { getCacheClient } from "../../shared/cache.js";
import { CircuitBreaker } from "../../shared/circuitBreaker.js";

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:4001";
const cache = getCacheClient();
const authBreaker = new CircuitBreaker("auth-service");

// Helper for cache invalidation
export const invalidateEmployeeCache = async () => {
  try {
    const keys = await cache.keys("employees:*");
    if (keys && keys.length > 0) {
      await cache.del(...keys);
      console.log(`[Cache Invalidation] Cleared ${keys.length} employee keys`);
    }
  } catch (err) {
    console.warn("Failed to invalidate cache:", err.message);
  }
};

// GET /api/employees (With Cache-Aside Pattern)
export const getEmployees = async (req, res) => {
  try {
    const { department } = req.query;
    const cacheKey = `employees:${department || "all"}`;

    // 1. Check Redis Cache
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      res.setHeader("X-Cache", "HIT");
      return res.json(JSON.parse(cachedData));
    }

    // 2. Fetch from database if cache miss
    res.setHeader("X-Cache", "MISS");
    const where = {};
    if (department) where.department = department;

    const employees = await Employee.find(where)
      .sort({ createdAt: -1 })
      .lean();

    const result = employees.map((emp) => ({
      ...emp,
      id: emp._id.toString(),
      user: { email: emp.email },
    }));

    // 3. Populate Redis Cache (TTL = 300 seconds)
    await cache.set(cacheKey, JSON.stringify(result), "EX", 300);

    return res.json(result);
  } catch (error) {
    console.error("Get employees error:", error);
    return res.status(500).json({ error: "Failed to fetch employees" });
  }
};

// POST /api/employees (Distributed Saga: Auth Service -> Employee Service)
export const createEmployee = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      position,
      department,
      basicSalary,
      allowances,
      deductions,
      joinDate,
      password,
      role,
      bio,
    } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if email already exists locally
    const existing = await Employee.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Step 1 of Saga: Call Auth Service via Circuit Breaker
    let authUser;
    try {
      const authRes = await authBreaker.execute(async () => {
        return await axios.post(`${AUTH_SERVICE_URL}/api/auth/internal/user`, {
          email,
          password,
          role: role || "EMPLOYEE",
        });
      });
      authUser = authRes.data.user;
    } catch (err) {
      const errMsg = err.response?.data?.error || "Failed to create user credentials in Auth Service";
      return res.status(400).json({ error: errMsg });
    }

    // Step 2 of Saga: Create Employee in Employee Service
    let employee;
    try {
      employee = await Employee.create({
        userId: authUser.id,
        firstName,
        lastName,
        email,
        phone,
        position,
        department: department || "Engineering",
        basicSalary: Number(basicSalary) || 0,
        allowances: Number(allowances) || 0,
        deductions: Number(deductions) || 0,
        joinDate: joinDate ? new Date(joinDate) : new Date(),
        bio: bio || "",
      });
    } catch (createErr) {
      // Compensating Transaction (Rollback Auth User if Employee creation fails)
      console.error("Employee creation failed. Rolling back user in Auth Service...");
      try {
        await axios.delete(`${AUTH_SERVICE_URL}/api/auth/internal/user/${authUser.id}`);
      } catch (e) {}
      throw createErr;
    }

    // Invalidate Redis cache
    await invalidateEmployeeCache();

    return res.status(201).json({ success: true, employee });
  } catch (error) {
    console.error("Create employee error:", error);
    return res.status(500).json({ error: "Failed to create employee" });
  }
};

// PUT /api/employees/:id
export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const {
      firstName,
      lastName,
      email,
      phone,
      position,
      department,
      basicSalary,
      allowances,
      deductions,
      password,
      role,
      bio,
      employmentStatus,
    } = body;

    const employee = await Employee.findById(id);
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    await Employee.findByIdAndUpdate(id, {
      firstName: firstName || employee.firstName,
      lastName: lastName || employee.lastName,
      email: email || employee.email,
      phone: phone !== undefined ? phone : employee.phone,
      position: position !== undefined ? position : employee.position,
      department: department || employee.department || "Engineering",
      basicSalary: basicSalary !== undefined ? Number(basicSalary) : employee.basicSalary,
      allowances: allowances !== undefined ? Number(allowances) : employee.allowances,
      deductions: deductions !== undefined ? Number(deductions) : employee.deductions,
      employmentStatus: employmentStatus || employee.employmentStatus || "ACTIVE",
      bio: bio !== undefined ? bio : employee.bio,
    });

    // Update user record in Auth Service
    if (employee.userId) {
      try {
        const userUpdate = {};
        if (email) userUpdate.email = email;
        if (role) userUpdate.role = role;
        if (password) userUpdate.password = password;

        if (Object.keys(userUpdate).length > 0) {
          await axios.put(`${AUTH_SERVICE_URL}/api/auth/internal/user/${employee.userId}`, userUpdate);
        }
      } catch (err) {
        console.warn("Failed to sync user changes to Auth Service:", err.message);
      }
    }

    // Invalidate Redis cache
    await invalidateEmployeeCache();

    return res.json({ success: true });
  } catch (error) {
    console.error("Update employee error:", error);
    return res.status(500).json({ error: "Failed to update employee" });
  }
};

// DELETE /api/employees/:id
export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await Employee.findById(id);
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    employee.isDeleted = true;
    employee.employmentStatus = "INACTIVE";
    await employee.save();

    await invalidateEmployeeCache();
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete employee" });
  }
};

// Internal API: Get employee by userId
export const getEmployeeByUserIdInternal = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.params.userId }).lean();
    if (!employee) return res.status(404).json({ error: "Employee not found" });
    return res.json({ ...employee, id: employee._id.toString() });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch employee" });
  }
};

// Internal API: Stats summary for Dashboard
export const getEmployeeStatsInternal = async (req, res) => {
  try {
    const totalEmployees = await Employee.countDocuments({ isDeleted: { $ne: true } });
    const departments = await Employee.distinct("department", { isDeleted: { $ne: true } });
    return res.json({ totalEmployees, totalDepartments: departments.length || 7 });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
};

// Internal API: Get employee by employeeId
export const getEmployeeByIdInternal = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).lean();
    if (!employee) return res.status(404).json({ error: "Employee not found" });
    return res.json({ ...employee, id: employee._id.toString() });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch employee" });
  }
};
