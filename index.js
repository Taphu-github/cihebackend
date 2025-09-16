import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import authRoutes from "./routes/auth.routes.js";

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// 🔹 Global error handling for unhandled rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

// 🔹 Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// 🔹 Routes
app.use("/api/auth", authRoutes);

// 🔹 Health Check
app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", db: "disconnected", error: err.message });
  }
});

// 🔹 Start Server Function
async function startServer() {
  try {
    await prisma.$connect();
    console.log("✅ Database connected");

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

    // Keep Node process alive
    setInterval(() => {}, 1 << 30);

  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

// 🔹 Initialize server
startServer();
