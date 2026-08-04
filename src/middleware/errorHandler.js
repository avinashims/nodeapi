const { AppError } = require("../lib/errors");

function notFoundHandler(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, "NOT_FOUND"));
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const isOperational = err instanceof AppError || err.isOperational;
  const statusCode = err.statusCode || 500;
  const code = err.code || "INTERNAL_ERROR";

  if (!isOperational) {
    console.error("Unhandled error:", err);
  }

  const payload = {
    success: false,
    message: isOperational ? err.message : "Internal server error",
    code,
  };

  if (process.env.NODE_ENV !== "production" && !isOperational && err.stack) {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
}

module.exports = { notFoundHandler, errorHandler };
