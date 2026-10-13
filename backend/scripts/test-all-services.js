import http from 'http';

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    const reqOptions = { ...options, headers: { ...(options.headers || {}) } };
    if (payload) {
      reqOptions.headers['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });
    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('   FULLSTACK-EMS END-TO-END VERIFICATION SUITE      ');
  console.log('====================================================');

  const results = [];

  // Helper log
  function logResult(service, testName, success, details) {
    results.push({ service, testName, success, details });
    const mark = success ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark} [${service}] ${testName}: ${details}`);
  }

  // 1. Health check
  try {
    const health = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/health',
      method: 'GET',
    });
    const upCount = Object.values(health.data.services || {}).filter(s => s.status === 'UP').length;
    logResult('GATEWAY', 'Health Check', health.status === 200, `All ${upCount}/6 microservices UP`);
  } catch (err) {
    logResult('GATEWAY', 'Health Check', false, err.message);
  }

  // 2. Admin Login
  let adminToken = null;
  try {
    const login = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        email: 'sadinenibhargav0@gmail.com',
        password: 'admin123',
        role_type: 'admin',
      }
    );
    if (login.status === 200 && login.data.token) {
      adminToken = login.data.token;
      logResult('AUTH', 'Admin Login', true, `Token received for ${login.data.user.email}`);
    } else {
      logResult('AUTH', 'Admin Login', false, `Status ${login.status}: ${JSON.stringify(login.data)}`);
    }
  } catch (err) {
    logResult('AUTH', 'Admin Login', false, err.message);
  }

  // 3. Employee Login
  let empToken = null;
  try {
    const login = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        email: 'sbv28012006@gmail.com',
        password: 'admin123',
        role_type: 'employee',
      }
    );
    if (login.status === 200 && login.data.token) {
      empToken = login.data.token;
      logResult('AUTH', 'Employee Login', true, `Token received for ${login.data.user.email}`);
    } else {
      logResult('AUTH', 'Employee Login', false, `Status ${login.status}: ${JSON.stringify(login.data)}`);
    }
  } catch (err) {
    logResult('AUTH', 'Employee Login', false, err.message);
  }

  if (!adminToken || !empToken) {
    console.log('\n❌ Aborting remaining tests due to login failure.');
    return;
  }

  const adminHeaders = {
    Authorization: `Bearer ${adminToken}`,
    'Content-Type': 'application/json',
  };
  const empHeaders = {
    Authorization: `Bearer ${empToken}`,
    'Content-Type': 'application/json',
  };

  // 4. Session Validation
  try {
    const sess = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/auth/session',
      method: 'GET',
      headers: empHeaders,
    });
    logResult('AUTH', 'Employee Session', sess.status === 200, `Authenticated as ${sess.data.user?.email} (${sess.data.user?.role})`);
  } catch (err) {
    logResult('AUTH', 'Employee Session', false, err.message);
  }

  // 5. Admin Dashboard
  try {
    const dash = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/dashboard',
      method: 'GET',
      headers: adminHeaders,
    });
    logResult('DASHBOARD', 'Admin Aggregator', dash.status === 200, `Total Employees: ${dash.data.totalEmployees}, Today Attendance: ${dash.data.todayAttendance}, Pending Leaves: ${dash.data.pendingLeaves}`);
  } catch (err) {
    logResult('DASHBOARD', 'Admin Aggregator', false, err.message);
  }

  // 6. Employee Dashboard
  try {
    const dash = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/dashboard',
      method: 'GET',
      headers: empHeaders,
    });
    const name = `${dash.data.employee?.firstName || ''} ${dash.data.employee?.lastName || ''}`;
    logResult('DASHBOARD', 'Employee Aggregator', dash.status === 200, `Name: ${name}, Current Month Attendance: ${dash.data.currentMonthAttendance}`);
  } catch (err) {
    logResult('DASHBOARD', 'Employee Aggregator', false, err.message);
  }

  // 7. Employee Profile
  try {
    const profile = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/profile',
      method: 'GET',
      headers: empHeaders,
    });
    logResult('EMPLOYEE', 'Employee Profile', profile.status === 200, `${profile.data.firstName} ${profile.data.lastName} - Department: ${profile.data.department}, Position: ${profile.data.position}`);
  } catch (err) {
    logResult('EMPLOYEE', 'Employee Profile', false, err.message);
  }

  // 8. Admin Employees List
  try {
    const emps = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/employees',
      method: 'GET',
      headers: adminHeaders,
    });
    const cacheHeader = emps.headers['x-cache'] || 'MISS';
    logResult('EMPLOYEE', 'Admin Employee List', emps.status === 200, `Found ${emps.data.length} employees (Cache: ${cacheHeader})`);
  } catch (err) {
    logResult('EMPLOYEE', 'Admin Employee List', false, err.message);
  }

  // 9. Attendance
  try {
    const att = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/attendance',
      method: 'GET',
      headers: empHeaders,
    });
    logResult('ATTENDANCE', 'Employee Attendance History', att.status === 200, `Retrieved ${att.data.data?.length || 0} attendance records`);
  } catch (err) {
    logResult('ATTENDANCE', 'Employee Attendance History', false, err.message);
  }

  // 10. Leaves
  try {
    const adminLeaves = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/leave',
      method: 'GET',
      headers: adminHeaders,
    });
    logResult('LEAVE', 'Admin Leave Management', adminLeaves.status === 200, `Retrieved ${adminLeaves.data.data?.length || 0} company-wide leave applications`);
  } catch (err) {
    logResult('LEAVE', 'Admin Leave Management', false, err.message);
  }

  try {
    const empLeaves = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/leave',
      method: 'GET',
      headers: empHeaders,
    });
    logResult('LEAVE', 'Employee Leave History', empLeaves.status === 200, `Retrieved ${empLeaves.data.data?.length || 0} personal leave applications`);
  } catch (err) {
    logResult('LEAVE', 'Employee Leave History', false, err.message);
  }

  // 11. Payslips
  try {
    const adminPayslips = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/payslips',
      method: 'GET',
      headers: adminHeaders,
    });
    logResult('PAYROLL', 'Admin Payslips List', adminPayslips.status === 200, `Retrieved ${adminPayslips.data.data?.length || 0} company payslips`);
  } catch (err) {
    logResult('PAYROLL', 'Admin Payslips List', false, err.message);
  }

  try {
    const empPayslips = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/payslips',
      method: 'GET',
      headers: empHeaders,
    });
    logResult('PAYROLL', 'Employee Payslip History', empPayslips.status === 200, `Retrieved ${empPayslips.data.data?.length || 0} personal payslips`);
  } catch (err) {
    logResult('PAYROLL', 'Employee Payslip History', false, err.message);
  }

  // 12. Chatbot Service
  try {
    const chat = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/chatbot',
        method: 'POST',
        headers: empHeaders,
      },
      {
        message: 'Hello! Can you summarize the company leave policy?',
      }
    );
    const replySnippet = (chat.data.reply || '').substring(0, 100);
    logResult('CHATBOT', 'AI Assistant Query', chat.status === 200, `Reply received: "${replySnippet}..."`);
  } catch (err) {
    logResult('CHATBOT', 'AI Assistant Query', false, err.message);
  }

  // 13. Notification Service DLQ Monitoring
  try {
    const dlq = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/notifications/dlq',
      method: 'GET',
      headers: adminHeaders,
    });
    logResult('NOTIFICATION', 'Dead Letter Queue (DLQ) Diagnostic API', dlq.status === 200, `DLQ Status: ${dlq.data.dlxExchange} -> ${dlq.data.dlqQueue} (Dead-Lettered: ${dlq.data.totalDeadLettered || 0})`);
  } catch (err) {
    logResult('NOTIFICATION', 'Dead Letter Queue (DLQ) Diagnostic API', false, err.message);
  }

  console.log('\n====================================================');
  const passCount = results.filter(r => r.success).length;
  console.log(`SUMMARY: ${passCount} / ${results.length} Tests Passed!`);
  console.log('====================================================');
}

runTests();
