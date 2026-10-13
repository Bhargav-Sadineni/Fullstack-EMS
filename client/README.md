# QuickEMS — Client Frontend (React 19 + Vite)

This is the frontend client for **QuickEMS**, built with **React 19**, **Vite**, and **TailwindCSS**. It communicates directly with the **API Gateway** (`/api/*`).

---

## 🌐 Live Deployments

* **Live Frontend**: [https://fullstack-ems-nuu3.vercel.app](https://fullstack-ems-nuu3.vercel.app)
* **Live Backend API**: [https://fullstack-ems-s25g.onrender.com](https://fullstack-ems-s25g.onrender.com)

---

## 📖 Architecture & Full Documentation

For the complete architectural breakdown showing **how the system worked before vs. after dividing into microservices**, including **Redis caching**, **RabbitMQ queues**, **Dead Letter Queues**, **Load balancing**, and complete diagrams, please refer to:

👉 **[Root README.md](../README.md)**

---

## 🔑 Login Credentials for Testing

### 🌐 Live Production Portals (Vercel)
* **Admin Portal**: [https://fullstack-ems-nuu3.vercel.app/login/admin](https://fullstack-ems-nuu3.vercel.app/login/admin)
  * **Email**: `sadinenibhargav0@gmail.com`
  * **Password**: `admin123`
* **Employee Portal**: [https://fullstack-ems-nuu3.vercel.app/login/employee](https://fullstack-ems-nuu3.vercel.app/login/employee)
  * **Email**: `sbv28012006@gmail.com`
  * **Password**: `admin123`

*(For local testing, access `http://localhost:5173/login/admin` or `http://localhost:5173/login/employee`)*

---

## 🚀 How to Run the Client Locally

```bash
# From the client directory:
npm install
npm run dev
```

* Local URL: `http://localhost:5173`
* Target API Gateway: `http://localhost:4000/api` (configured via `VITE_BASE_URL` in `.env`)
