import dotenv from "dotenv";
dotenv.config();

import http from "http";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";
import { configureUploadsDirectory } from "./config/cloudinary.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import { notFound, errorHandler } from "./middleware/error.middleware.js";
import { applySecurityHeaders, apiRateLimiter, sanitizeInput } from "./middleware/security.middleware.js";
import { initializeSocket } from "./services/socket.service.js";

const app = express();
const server = http.createServer(app);

const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
const allowedOrigins = new Set([
  frontendUrl,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin.replace(/\/$/, ""))) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);

app.use(applySecurityHeaders);
app.use(apiRateLimiter);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistDir = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendDistDir));

app.use(cookieParser());
app.use(sanitizeInput);
configureUploadsDirectory();

const io = initializeSocket(server);
app.use((req, _res, next) => {
  req.io = io;
  req.socketUsers = io.socketUsers;
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});



app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/notifications", notificationRoutes);

// Keep unknown API endpoints as JSON errors while allowing React Router to
// handle client-side paths such as /chat or /settings.
app.use("/api", notFound);

app.get("*name", (_req, res) => {
  res.sendFile(path.join(frontendDistDir, "index.html"));
});

app.use(errorHandler);

const port = Number(process.env.PORT || 5000);

const startServer = async () => {
  await connectDB();
  server.listen(port, () => {
    console.log(`ChatBlitz API listening on port ${port}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
