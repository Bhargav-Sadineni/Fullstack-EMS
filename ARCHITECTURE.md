# 🚀 Fullstack-EMS: Distributed Microservices Architecture

This project has been transformed from a single monolithic Express server into an enterprise-grade distributed microservices architecture featuring an **API Gateway, Redis Cache-Aside, Message Queues / Event Bus, Nginx Load Balancer, and Distributed Resilience Patterns**.

---

## 🏗️ Architecture Overview

```
                                  [ Vite / React Frontend ]
                                  (http://localhost:5173)
                                             │
                                             ▼
                                  ┌─────────────────────┐
                                  │   LOAD BALANCER     │ (Nginx / Cloud ALB - Port 80)
                                  └──────────┬──────────┘
                                             │
                                             ▼
                                  ┌─────────────────────┐
                                  │     API GATEWAY     │ (Reverse Proxy, JWT Auth,
                                  │     (Port 4000)     │  Rate Limiting, Aggregator)
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

## 🔌 Service Port Map & Routing Table

| Service | Port | Endpoint Prefix | Responsibilities |
| :--- | :--- | :--- | :--- |
| **API Gateway** | `4000` | `/api/*` | Single entry point, JWT verification, Rate limiter, Correlation IDs, Dashboard Aggregation, Health checks |
| **Auth Service** | `4001` | `/api/auth` | User authentication, token issuance, session checks, internal user provisioning |
| **Employee Service** | `4002` | `/api/employees`, `/api/profile` | Employee profiles, Redis Cache-Aside, Saga creation rollback |
| **Attendance Service** | `4003` | `/api/attendance`, `/api/leave` | Clock in/out tracking, leave requests, publishes queue events |
| **Notification Service** | `4004` | `/health`, `/dlq` | Consumes queue events with DLQ & retries, sends Brevo SMTP emails, runs crons |
| **Payroll Service** | `4005` | `/api/payslips` | Calculates net salary, issues payslips, fetches historical records |
| **Chatbot Service** | `4006` | `/api/chatbot` | Gemini AI integration querying internal service contracts |

---

## 🛡️ Enterprise HLD Patterns Implemented

1. **Dead Letter Queue (DLQ) & Exponential Backoff Retry**:
   - Implemented via RabbitMQ Topic Exchanges (`ems_events_exchange` and `ems_dlx_exchange`).
   - If an event handler fails (e.g. SMTP Brevo network hiccup), it retries up to 3 times with exponential backoff delay (1s, 2s, 4s).
   - Upon exceeding max retries, the event is routed to `ems_dead_letter_queue` with complete failure telemetry (`x-retry-count`, `x-fatal-error`, `x-failed-service`, `x-dlq-timestamp`) preventing worker starvation and poison pill loops.
   - Diagnostic API exposed at `GET /api/notifications/dlq`.

2. **Distributed Cache-Aside**:
   - Upstash Redis caching in Employee Service (`employee:list:*`, `employee:profile:*`) with automatic invalidation.

3. **Concurrency Control & Distributed Locking**:
   - Compound unique database indexes on Attendance (`{ employeeId: 1, date: 1 }`) and Payslip (`{ employeeId: 1, month: 1, year: 1 }`).
   - Redis distributed lock helper (`acquireLock` / `releaseLock`) for atomic operations.

4. **Tiered Rate Limiting & DoS Protection**:
   - Strict brute-force auth limiter (20 req / 15 min), Chatbot compute limiter (30 req / 1 min), General API limiter (300 req / 15 min).

---

## ⚡ How to Run

### Option 1: Local Development (Without Docker)

You do **not** need Docker to run this locally! A zero-dependency orchestrator launches all 7 backend services concurrently from the unified `backend/` folder:

```bash
# 1. Install all dependencies across services & client (first time only)
npm run install:all

# 2. Seed initial Admin account
npm run seed

# 3. Start all backend microservices together
npm run dev:backend

# 4. In a separate terminal, start your React frontend
npm run dev:client
```

Your React app on `http://localhost:5173` will talk to the API Gateway on `http://localhost:4000` without any configuration changes!

---

### Option 2: Docker Containerized (Production Mode)

When Docker Desktop is installed, start the full distributed stack with containerized Nginx, Redis, and RabbitMQ:

```bash
# Start all containers in the background
npm run docker:up

# Check container logs
docker compose -f infra/docker-compose.yml logs -f

# Stop containers
npm run docker:down
```

---

## 🛡️ Distributed Concepts Implemented

1. **API Gateway Pattern**: Centralizes cross-cutting concerns (authentication, CORS, rate limiting, and request correlation IDs) offloading them from downstream services.
2. **Cache-Aside Pattern (Redis)**: `GET /api/employees` checks Redis first (`X-Cache: HIT`). On cache miss, it reads from the DB, saves to Redis with a 300-second TTL, and invalidates keys automatically upon create/update/delete.
3. **Event-Driven Architecture (Queues)**: Clocking in or applying for leave immediately fires asynchronous events (`attendance.clocked_in`, `leave.applied`). The **Notification Service** consumes these events and sends emails without blocking user HTTP requests.
4. **Saga Pattern (Compensating Transactions)**: When creating an employee, Employee Service first provisions credentials in Auth Service. If employee document creation fails, it issues a compensating rollback to delete the auth user.
5. **Gateway Aggregator Pattern**: `/api/dashboard` queries Employee, Attendance, and Payroll services in parallel, assembling the consolidated response in memory.
6. **Distributed Tracing**: An `X-Correlation-ID` header is created or passed at the Gateway and propagated across all internal service calls and message payloads.
7. **Circuit Breaker**: Inter-service HTTP calls are wrapped with circuit breakers (`CircuitBreaker`) to prevent cascading failures when downstreams are slow or unresponsive.
