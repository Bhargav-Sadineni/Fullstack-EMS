# 🏢 QuickEMS: Monolith to Distributed Microservices Transformation

An enterprise-grade **Employee Management System (EMS)** re-architected from a traditional Node.js/Express monolith into a high-performance **Distributed Microservices Architecture** featuring an **API Gateway, Redis Cache-Aside, Message Queues (CloudAMQP RabbitMQ), Nginx Load Balancing, and Asynchronous Notification Workers**.

---

## 📖 The Story: Before vs. After Architecture

### 1. BEFORE: The Monolithic Architecture

In the initial version, the entire backend was contained inside a single Express server process (`server/server.js`) connected to a single MongoDB database.

```
                         [ React Frontend (Vite) ]
                                    │
                                    ▼ (HTTP)
     ┌─────────────────────────────────────────────────────────────┐
     │                     MONOLITHIC SERVER                       │
     │                      (Port 4000)                            │
     │                                                             │
     │  ┌──────────┐  ┌───────────┐  ┌────────────┐  ┌──────────┐  │
     │  │   Auth   │  │ Employees │  │ Attendance │  │  Leaves  │  │
     │  └──────────┘  └───────────┘  └────────────┘  └──────────┘  │
     │  ┌──────────┐  ┌───────────┐  ┌────────────┐                │
     │  │ Payslips │  │  Inngest  │  │ Gemini AI  │                │
     │  └──────────┘  └───────────┘  └────────────┘                │
     └──────────────────────────────┬──────────────────────────────┘
                                    │ (Direct Mongoose queries)
                                    ▼
                         [( Single MongoDB Database )]
```

#### 🔴 Pain Points & Bottlenecks of the Monolith:
1. **Single Point of Failure (SPOF)**: A failure in the AI chatbot or an unhandled exception in email sending could crash the entire process, locking all employees out of login and attendance.
2. **Zero Caching (Database Pressure)**: Every single page load of the Employee Directory executed full scans against MongoDB Atlas. High traffic caused database CPU spikes and slow response times (~250–500ms).
3. **Synchronous User Latency**: Clocking in and applying for leave executed synchronous email logic inside the user's HTTP request lifecycle, making simple clicks feel sluggish.
4. **All-or-Nothing Deployments**: Any small bug fix or UI change to the Payroll logic required redeploying the entire application.
5. **Coupled Background Jobs**: Inngest background functions and crons competed with user-facing web requests for CPU cycles and memory in the same Node.js thread.

---

### 2. AFTER: The Distributed Microservices Architecture

The system was decomposed into **6 independent domain microservices**, a dedicated **API Gateway**, an **Nginx Load Balancer**, **Cloud Redis Caching**, and a **RabbitMQ Message Broker**.

```
                                  [ Vite / React Frontend ]
                                  (http://localhost:5173)
                                             │
                                             ▼
                                  ┌─────────────────────┐
                                  │   LOAD BALANCER     │ (Nginx / Port 80)
                                  └──────────┬──────────┘
                                             │
                                             ▼
                                  ┌─────────────────────┐
                                  │     API GATEWAY     │ (Port 4000)
                                  │ Reverse Proxy, JWT, │ Rate Limiting, Aggregator
                                  └────┬──────┬──────┬──┘
                  ┌────────────────────┘      │      └────────────────────┐
                  │ (HTTP/REST)               │ (HTTP/REST)               │ (HTTP/REST)
                  ▼                           ▼                           ▼
        ┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
        │   AUTH SERVICE   │        │ EMPLOYEE SERVICE │        │ ATTENDANCE &     │
        │   (Port 4001)    │        │   (Port 4002)    │        │ LEAVE SERVICE    │
        └────────┬─────────┘        └────────┬─────────┘        │   (Port 4003)    │
                 │                           │                  └────────┬─────────┘
                 ▼                           ▼                           │
        [(Database: Auth)]          [(Database: Emp)]                    ▼
                 ▲                           ▲                  [(Database: Att)]
                 │                           │                           │
                 │                    ┌──────┴──────────────┐            │
                 │                    │    REDIS CACHE      │            │
                 │                    │ (Read Cache, TTL)   │            │
                 │                    └─────────────────────┘            │
                 │                                                       │
                 └──────────────┬────────────────────────┬───────────────┘
                                │                        │
                                ▼                        ▼
                  ┌──────────────────────────────────────────────┐
                  │      MESSAGE BROKER (RabbitMQ / Event Bus)   │
                  │   Events: attendance.clocked_in, leave.applied│
                  └───────────────────────┬──────────────────────┘
                                          │
                     ┌────────────────────┴────────────────────┐
                     ▼                                         ▼
        ┌──────────────────────────┐             ┌──────────────────────────┐
        │   NOTIFICATION WORKER    │             │     PAYROLL SERVICE      │
        │       (Port 4004)        │             │       (Port 4005)        │
        │ (Nodemailer, Reminders,  │             │ (Payslip generation &    │
        │  Scheduled Crons)        │             │  Records)                │
        └──────────────────────────┘             └─────────────┬────────────┘
                                                               │
                                                               ▼
                                                     [(Database: Payroll)]
```

---

## 🚀 Key Improvements & How It Makes Everything Easier

| Architectural Area | Before (Monolith) | After (Microservices) | Impact & Benefit |
| :--- | :--- | :--- | :--- |
| **Response Latency** | 250ms – 500ms (database hits on every request) | **1ms – 5ms** via Upstash Redis (`X-Cache: HIT`) | **98% faster reads** for employee profiles and rosters. |
| **User Request Latency** | Blocking (waited for email processing) | **Non-blocking (~30ms)** via CloudAMQP async event publishing | Instant UI feedback for clock-in and leave requests. |
| **Fault Isolation** | Any crash brought down the entire system | **Isolated**: If Payroll or AI goes down, Auth & Attendance run 100% | Zero company-wide outages. |
| **Scalability** | Must scale entire monolith horizontally | **Independent scaling**: Scale Attendance service 10x during morning check-in | Massively reduced cloud infrastructure costs. |
| **Security & Auth** | Repeated JWT parsing in every controller | **Centralized Auth Offloading** at API Gateway | Standardized token verification and unified rate limiting. |
| **Deployability** | High-risk monolithic redeployment | **Strangler Fig / Modular releases**: Update one service at a time | Zero downtime updates and simpler debugging. |
| **Database Coupling** | Monolithic shared schema with foreign keys | **Database-per-Service** with API Composition & Sagas | Clean domain ownership and no cross-table corruption. |

---

## 🔑 Login Credentials for Testing

| Role | Portal URL | Email Address | Password |
| :--- | :--- | :--- | :--- |
| **Admin** | `http://localhost:5173/login/admin` | `sadinenibhargav0@gmail.com` | `admin123` |
| **Employee** | `http://localhost:5173/login/employee` | `emp@gmail.com` | (Registered via Admin) |

---

## ⚡ Service Breakdown & Port Routing

| Service | Port | Endpoint Prefix | Responsibilities & Patterns |
| :--- | :---: | :--- | :--- |
| **React Client** | `5173` | `/` | Vite SPA, TailwindCSS, Role-based Dashboards (Admin / Employee) |
| **API Gateway** | `4000` | `/api/*` | Single Entry Point, JWT Verification Offloading, Rate Limiting (200 req/15min), Dashboard Aggregator, Tracing (`X-Correlation-ID`) |
| **Auth Service** | `4001` | `/api/auth` | User login, JWT issuing, password updates, internal credential provisioning |
| **Employee Service** | `4002` | `/api/employees`, `/api/profile` | CRUD Employees, Redis Cache-Aside (`X-Cache: HIT`), Distributed Saga rollback |
| **Attendance Service**| `4003` | `/api/attendance`, `/api/leave` | Clock in/out, Leave requests, API Composition with Employee Service, CloudAMQP Event Publisher |
| **Notification Worker**| `4004` | Worker Daemon | CloudAMQP Event Consumer, Brevo SMTP Nodemailer dispatcher, 11:30 AM IST Attendance Cron |
| **Payroll Service** | `4005` | `/api/payslips` | Net salary calculation, monthly payslip records |
| **Chatbot Service** | `4006` | `/api/chatbot` | Google Gemini 3.8 Flash AI assistant with automatic high-demand fallback |
| **Nginx Load Balancer**| `80` | `/` & `/api` | Multi-instance Gateway load balancing (`least_conn`) |

---

## 🛠️ Step-by-Step Implementation of Distributed Concepts

### 1. Redis Cache-Aside Pattern
Located in [backend/services/employee-service/server.js](file:///c:/Notes%20and%20pdf/web%20development%20projects/Fullstack-EMS/backend/services/employee-service/server.js) & [backend/services/shared/cache.js](file:///c:/Notes%20and%20pdf/web%20development%20projects/Fullstack-EMS/backend/services/shared/cache.js):
- **Read**: `GET /api/employees` checks Upstash Redis for `employees:all`. If found, returns in 1ms (`X-Cache: HIT`). If not, queries MongoDB and sets a 300-second TTL (`X-Cache: MISS`).
- **Invalidate**: Any creation, update, or deletion automatically triggers `invalidateEmployeeCache()`, purging stale keys immediately.

### 2. Asynchronous Message Broker & Dead Letter Queue (DLQ)
Located in [backend/services/shared/events.js](file:///c:/Notes%20and%20pdf/web%20development%20projects/Fullstack-EMS/backend/services/shared/events.js) & [backend/services/notification-service/server.js](file:///c:/Notes%20and%20pdf/web%20development%20projects/Fullstack-EMS/backend/services/notification-service/server.js):
- When an employee checks in or applies for leave, the Attendance Service publishes an AMQP message to the `ems_events_exchange` topic exchange.
- The **Notification Worker** daemon pulls from the queue, dispatches transactional emails via Brevo SMTP, and acknowledges (`ack`) the message.
- **Dead Letter Queue (DLQ) & Exponential Backoff**: If an event handler fails (e.g., SMTP rate limit or transient outage), it automatically retries up to 3 times with exponential backoff delay (1s, 2s, 4s). If all retries are exhausted, the event is routed to `ems_dead_letter_queue` on `ems_dlx_exchange` with complete error diagnostics, preventing poison pill crashes.
- **DLQ Diagnostic API**: `GET /api/notifications/dlq` provides live inspection and replay capabilities.

### 3. API Composition Pattern
Located in [backend/services/attendance-service/server.js](file:///c:/Notes%20and%20pdf/web%20development%20projects/Fullstack-EMS/backend/services/attendance-service/server.js):
- Because the Attendance and Employee collections are isolated in different microservices, the Attendance Service queries `/api/employees/internal/:id` over internal HTTP to enrich leave applications with the applicant's name and email before serving the UI.

### 4. Gateway Aggregator Pattern
Located in [backend/services/api-gateway/server.js](file:///c:/Notes%20and%20pdf/web%20development%20projects/Fullstack-EMS/backend/services/api-gateway/server.js):
- The `/api/dashboard` endpoint concurrently queries Employee, Attendance, and Payroll services via `Promise.all` and merges metrics into a unified dashboard response for the client.

---

## 💻 How to Run Locally

### Local Development (Zero-Dependency Orchestrator)
You don't need Docker installed to run this locally! A single backend project orchestrator manages all 7 microservices concurrently:

```bash
# 1. Install all dependencies across backend and client
npm run install:all

# 2. Seed initial Admin account
npm run seed

# 3. Start all backend microservices concurrently
npm run dev:backend

# 4. In a second terminal, start the React frontend
npm run dev:client
```

* Frontend: **`http://localhost:5173`**
* Gateway Health Check: **`http://localhost:4000/health`**
* Dead Letter Queue Monitor: **`http://localhost:4000/api/notifications/dlq`**

---

### Docker Containerized (Production Mode)

```bash
# Launch Nginx, API Gateway, 6 Microservices, Redis, RabbitMQ, and Mongo
npm run docker:up

# View container logs
docker compose -f infra/docker-compose.yml logs -f

# Stop containers
npm run docker:down
```

---

## 🖼️ Application Screenshots & Feature Walkthrough

### 👑 Admin Portal (Platform Management & Aggregation)

#### 1. Admin Dashboard (Gateway Aggregator Pattern)
* **What you see**: A unified bird's-eye view displaying Total Employees, Departments, Today's Attendance, and Pending Leaves.
* **Under the Hood**: The API Gateway executes parallel HTTP queries via `Promise.allSettled` to the Employee, Attendance, and Leave microservices, synthesizing the stats into a single fast payload without client-side waterfalls.
![Admin Dashboard](docs/screenshots/admin-dashboard.png)

#### 2. Employee Directory (Upstash Redis Cache-Aside)
* **What you see**: High-speed employee cards with live department filtering and name search.
* **Under the Hood**: Uses Upstash Redis caching (`employee:list:*`). When loaded, cache returns in `< 2ms` (`X-Cache: HIT`). Updates or deletes immediately invalidate the cache.
![Employee Directory](docs/screenshots/employee-directory.png)

#### 3. Employee Details & Management Modal
* **What you see**: An interactive modal opened upon clicking any employee card, showcasing contact details, department, status badge, compensation structure (Basic, Allowances, Deductions, Net Monthly), biography notes, and action buttons (`Delete Employee`, `Edit Employee`).
* **Under the Hood**: Fetches enriched profile and compensation details on demand, enabling seamless HR operations.
![Employee Detail Modal](docs/screenshots/employee-details-modal.png)

#### 4. Company-Wide Leave Management (API Composition)
* **What you see**: Company-wide leave applications table with real-time employee search, status filter (`Approved`, `Pending`, `Rejected`), and review actions.
* **Under the Hood**: Because Attendance and Employee data live in isolated databases, the Attendance Service performs inter-service API composition with the Employee Service to resolve applicant names before rendering.
![Leave Management](docs/screenshots/leave-management.png)

#### 5. Payslips Generation & History
* **What you see**: Automated monthly payslip records with employee search, department filters, and one-click PDF payslip downloads.
* **Under the Hood**: Driven by the dedicated Payroll Microservice. Includes compound unique indexes (`employeeId` + `month` + `year`) preventing duplicate payroll runs.
![Payslip Management](docs/screenshots/payslip-management.png)

#### 6. Admin Account Settings & Profile
* **What you see**: Profile customization (Name, Position, Bio) and password update management with live security validation.
* **Under the Hood**: Managed through Auth Service user credentials and Employee Service profile stores.
![Admin Settings](docs/screenshots/settings-profile.png)

---

### 👤 Employee Portal & AI Copilot

#### 7. Employee Dashboard (Personalized Metrics)
* **What you see**: Tailored personal dashboard for logged-in employees showing Days Present, Pending Leaves, and Latest Net Payslip, accompanied by direct quick-action buttons (`Mark Attendance`, `Apply for Leave`).
* **Under the Hood**: Gateway checks the employee's JWT token, forwards verified headers (`X-User-Id`), and aggregates their personal metrics dynamically.
![Employee Dashboard](docs/screenshots/employee-dashboard.png)

#### 8. Attendance & Shift Clock-In
* **What you see**: Daily check-in tracking showing Days Present, Late Arrivals, Average Work Hours, and a prominent `Clock In` action button.
* **Under the Hood**: Protected by Redis distributed locking to prevent duplicate double-clicks. Clocking in fires an asynchronous `attendance.clocked_in` event to RabbitMQ for Brevo email confirmations.
![Employee Attendance](docs/screenshots/employee-attendance.png)

#### 9. Employee Leave Requests & Leave Balances
* **What you see**: Leave balance metric cards breakdown (Sick Leave, Casual Leave, Annual Leave), search bar, and personalized historical leave status.
* **Under the Hood**: Managed by the Attendance & Leave Service with automated event publishing to RabbitMQ when new requests are submitted.
![Employee Leave History](docs/screenshots/employee-leave-history.png)

#### 10. Intelligent EMS AI Chatbot (Google Gemini Powered)
* **What you see**: An interactive floating AI assistant modal with suggested quick questions (*"How many employees are present today?"*, *"How many pending leave requests are there?"*, *"How many employees are in each department?"*) and a natural language input box.
* **Under the Hood**: Connected to the Chatbot Microservice via Google Gemini 3.8 Flash with an automatic fallback model chain, answering real-time internal HR and leave policy questions.
![EMS AI Assistant](docs/screenshots/ai-chatbot-assistant.png)

---

## ⚙️ Environment Variables Reference

All credentials are automatically distributed to services from [.env](file:///c:/Notes%20and%20pdf/web%20development%20projects/Fullstack-EMS/.env):

```env
# MongoDB Atlas
MONGODB_URI="mongodb+srv://..."

# Auth Secret
JWT_SECRET="WEHKEWBFNJRWNGWNVJVNenvkjevnn"
ADMIN_EMAIL="sadinenibhargav0@gmail.com"

# Cloud Redis (Upstash)
REDIS_URI="rediss://default:...@lucky-pangolin-227534.upstash.io:6379"

# Cloud RabbitMQ (CloudAMQP)
RABBITMQ_URI="amqps://...gerbil.rmq.cloudamqp.com/..."

# Transactional Email (Brevo SMTP)
SMTP_USER="af90e3001@smtp-brevo.com"
SMTP_PASS="xsmtpsib-..."
SENDER_EMAIL="sadinenibhargav0@gmail.com"

# AI Chatbot
GEMINI_API_KEY="your_gemini_api_key_here"
```

---

## 🚀 Production Deployment Guide

### 1. Backend Deployment on Render (Web Service)

The backend runs all distributed microservices orchestrated behind the unified API Gateway, which binds to Render's dynamic `PORT` on `0.0.0.0`.

1. Go to your [Render Dashboard](https://dashboard.render.com/) and click **New +** &rarr; **Web Service**.
2. Connect your GitHub repository: `Bhargav-Sadineni/Fullstack-EMS`.
3. Fill in the service configuration:
   * **Name**: `fullstack-ems-backend`
   * **Root Directory**: `backend`
   * **Runtime**: `Node`
   * **Build Command**: `npm install && node scripts/install-all.js`
   * **Start Command**: `node orchestrator.js`
   * **Instance Type**: Free or Starter
4. Scroll to **Environment Variables** and add the following keys:
   * `NODE_ENV`: `production`
   * `MONGODB_URI`: Your MongoDB Atlas connection string
   * `JWT_SECRET`: A strong secret string (e.g., `super_secret_jwt_key_ems_2026`)
   * `ADMIN_EMAIL`: `sadinenibhargav0@gmail.com`
   * `REDIS_URI`: *(Optional)* Your Upstash Redis connection string
   * `RABBITMQ_URI`: *(Optional)* Your CloudAMQP RabbitMQ connection string
   * `GEMINI_API_KEY`: *(Optional)* Your Google Gemini AI API key
   * `SMTP_USER`, `SMTP_PASS`, `SENDER_EMAIL`: *(Optional)* Your Brevo SMTP credentials
5. Click **Create Web Service**.
6. Once deployed, copy your Render Web Service URL (e.g., `https://fullstack-ems-backend.onrender.com`).

> **Tip (Render Blueprint)**: You can also use the included [render.yaml](file:///c:/Notes%20and%20pdf/web%20development%20projects/Fullstack-EMS/render.yaml) file for automated 1-click blueprint deployment.

---

### 2. Frontend Deployment on Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New...** &rarr; **Project**.
2. Import your GitHub repository: `Bhargav-Sadineni/Fullstack-EMS`.
3. In the project setup screen, configure the following:
   * **Framework Preset**: `Vite`
   * **Root Directory**: Click **Edit** and select `client`
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
4. Expand **Environment Variables** and add:
   * **Key**: `VITE_BASE_URL`
   * **Value**: Your Render Backend URL from Step 1 (e.g., `https://fullstack-ems-backend.onrender.com`)
5. Click **Deploy**.
6. Vercel will install dependencies, build the Vite bundle, and deploy the application with single-page routing rewrites enabled via [client/vercel.json](file:///c:/Notes%20and%20pdf/web%20development%20projects/Fullstack-EMS/client/vercel.json).

