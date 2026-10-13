import axios from "axios";

const EMPLOYEE_SERVICE_URL = process.env.EMPLOYEE_SERVICE_URL || "http://localhost:4002";

export async function getEmployeeForUser(userId) {
  try {
    const res = await axios.get(`${EMPLOYEE_SERVICE_URL}/api/employees/internal/by-user/${userId}`);
    return res.data;
  } catch (err) {
    return null;
  }
}

export async function getEmployeeById(employeeId) {
  try {
    const res = await axios.get(`${EMPLOYEE_SERVICE_URL}/api/employees/internal/${employeeId}`);
    return res.data;
  } catch (err) {
    return null;
  }
}
