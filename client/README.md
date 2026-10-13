# QuickEMS — Client Frontend (React 19 + Vite)

This is the frontend client for **QuickEMS**, built with **React 19**, **Vite**, and **TailwindCSS**. It communicates directly with the **API Gateway** on `http://localhost:4000/api`.

---

## 📖 Architecture & Full Documentation

For the complete architectural breakdown showing **how the system worked before vs. after dividing into microservices**, including **Redis caching**, **RabbitMQ queues**, **Load balancing**, and **Admin credentials**, please refer to the primary project documentation:

👉 **[Root README.md](../README.md)**

---

## 🚀 How to Run the Client

```bash
# From the client directory:
npm install
npm run dev
```

* Local URL: `http://localhost:5173`
* Target API Gateway: `http://localhost:4000/api` (configured in `.env`)

---

## 🔑 Test Credentials

* **Admin Portal**: `http://localhost:5173/login/admin`
  * **Email**: `sadinenibhargav0@gmail.com`
  * **Password**: `admin123`
