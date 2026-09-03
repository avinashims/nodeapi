require("dotenv").config();

const path = require("path");
const { monitorEventLoopDelay } = require("perf_hooks");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { connectRedis, isRedisReady } = require("./lib/redis");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const cartRoutes = require("./routes/cartRoutes");
const checkoutRoutes = require("./routes/checkoutRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const orderRoutes = require("./routes/orderRoutes");
const aiRoutes = require("./routes/aiRoutes");
const importRoutes = require("./routes/importRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

const eventLoop = monitorEventLoopDelay({ resolution: 20 });
eventLoop.enable();

function getEventLoopStats() {
  const delayMs = eventLoop.mean / 1e6;
  const maxMs = eventLoop.max / 1e6;
  const stats = {
    eventLoopDelayMs: Number(delayMs.toFixed(2)),
    eventLoopMaxMs: Number(maxMs.toFixed(2)),
    eventLoopBlocked: delayMs > 100,
  };
  eventLoop.reset();
  return stats;
}

function sendHealth(res, message) {
  return res.json({
    success: true,
    message,
    redis: isRedisReady() ? "connected" : "disabled",
    ...getEventLoopStats(),
  });
}

app.get("/health", (req, res) => {
  sendHealth(res, "Ecommerce1222222 API is running");
});

app.get("/api/health", (req, res) => {
  sendHealth(res, "Ecommerce12222222 API is running");
});

app.get("/api/avi", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to avinash",
    redis: isRedisReady() ? "connected" : "disabled",
  });
});


app.get("/api/total", (req, res) => {

    const price = 200;
    const tax = 18;

    debugger;

    const total678 = price + tax;

    res.json({ total678 });
});
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/imports", importRoutes);

app.use(notFoundHandler);

app.use((err, req, res, next) => {
  if (err.name === "MulterError") {
    const message = err.code === "LIMIT_FILE_SIZE" ? "Image must be smaller than 5MB" : err.message;
    return res.status(400).json({ success: false, message, code: "UPLOAD_ERROR" });
  }
  if (err.message?.includes("images are allowed")) {
    return res.status(400).json({ success: false, message: err.message, code: "UPLOAD_ERROR" });
  }
  if (err.message?.includes("CSV files")) {
    return res.status(400).json({ success: false, message: err.message, code: "UPLOAD_ERROR" });
  }
  return errorHandler(err, req, res, next);
});

async function startServer() {
  await connectRedis();

  if (!isRedisReady()) {
    console.warn("REDIS_URL not set — product cache disabled; auth uses MySQL for refresh tokens");
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
