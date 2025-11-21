const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

// Import routes
const authRoutes = require("./routes/auth");
const ticketRoutes = require("./routes/tickets");
const messageRoutes = require("./routes/messages");
const emailService = require("./services/emailService");
const gmailService = require("./services/gmailService");

// --- Configuration ---
const app = express();
const port = 3000;

// --- Middleware ---
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
    ],
    credentials: true,
  }),
);
app.use(express.json({ limit: "50mb" }));
app.use(express.text({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// --- MongoDB Connection ---
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/superhack-timetracker";

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ Connected to MongoDB successfully");
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  });

// --- Setup Google AI Client ---
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- Health Check Route ---
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    ai: process.env.API_KEY ? "configured" : "not configured",
  });
});

// --- API Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/messages", messageRoutes);

// --- Email Configuration Check ---
app.get("/api/email/test", async (req, res) => {
  try {
    const verification = await emailService.verifyConnection();
    res.json({
      success: verification.success,
      message: verification.success
        ? "Email service is configured correctly"
        : "Email service configuration failed",
      error: verification.error || null,
      config: {
        emailUser: process.env.EMAIL_USER ? "✓ Configured" : "✗ Missing",
        emailPassword: process.env.EMAIL_PASSWORD
          ? "✓ Configured"
          : "✗ Missing",
        emailFrom:
          process.env.EMAIL_FROM || "support@superhack-timetracker.com",
        nodeEnv: process.env.NODE_ENV || "development",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to verify email configuration",
      details: error.message,
    });
  }
});

// --- Legacy Routes (for backward compatibility) ---
// Legacy analyze endpoint
app.post("/analyze", async (req, res) => {
  console.log(
    "⚠️  Using legacy /analyze endpoint. Consider using /api/tickets/upload-log",
  );

  try {
    const { rawLog, ticketId, clientName } = req.body;

    if (!rawLog || !ticketId || !clientName) {
      return res.status(400).json({
        error: 'Missing "rawLog", "ticketId", or "clientName" in request body',
      });
    }

    const masterPrompt = `
You are an AI for an IT services company. Your job is to create a timesheet from a raw activity log. The technician is working on **Ticket ${ticketId} for ${clientName}**.

Analyze the following log. Group activities, assign them to the ticket, and estimate the time spent. Ignore non-work activity like "YouTube" or "Spotify".

Output **ONLY** a valid JSON object in the following structure:
{
  "ticket_id": "${ticketId}",
  "client_name": "${clientName}",
  "analyzed_activities": [
    { "description": "Short description of activity", "time_minutes": 2 },
    { "description": "Another activity", "time_minutes": 5 }
  ],
  "total_billable_time_minutes": 7
}

---
**Raw Log:**
${rawLog}
---

**Expected JSON Output:**
`;

    const result = await model.generateContent(masterPrompt);
    const response = await result.response;
    let aiResponseText = response.text();

    if (aiResponseText.startsWith("```json")) {
      aiResponseText = aiResponseText
        .substring(7, aiResponseText.length - 3)
        .trim();
    }

    const jsonOutput = JSON.parse(aiResponseText);
    res.status(200).json(jsonOutput);
  } catch (error) {
    console.error("Error in /analyze endpoint:", error);
    res
      .status(500)
      .json({ error: "Failed to analyze log", details: error.message });
  }
});

// Legacy generate report endpoint
app.post("/generate-report", async (req, res) => {
  console.log(
    "⚠️  Using legacy /generate-report endpoint. Consider using /api/tickets/upload-log",
  );

  try {
    const { rawLog, ticketId, clientName } = req.body;

    if (!rawLog || !ticketId || !clientName) {
      return res.status(400).json({
        error: 'Missing "rawLog", "ticketId", or "clientName" in request body',
      });
    }

    const reportPrompt = `
You are an IT technician for an MSP, writing a summary report for your manager about the work you just completed on **Ticket ${ticketId} for ${clientName}**.

Based on the provided raw activity log, write a professional, concise summary.
- Start with the ticket and client.
- Briefly list the key actions you took (e.g., "SSH'd into server," "ran patch script," "emailed client").
- Conclude with the status (e.g., "The issue is now resolved.").
- Keep it in a single paragraph.

---
**Raw Log:**
${rawLog}
---

**Report Output:**
`;

    const result = await model.generateContent(reportPrompt);
    const response = await result.response;
    const reportText = response.text();

    res.status(200).json({ report: reportText });
  } catch (error) {
    console.error("Error in /generate-report endpoint:", error);
    res
      .status(500)
      .json({ error: "Failed to generate report", details: error.message });
  }
});

// --- Error Handling Middleware ---
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      error: "File too large. Maximum size is 10MB.",
    });
  }

  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation failed",
      details: err.message,
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      error: "Invalid ID format",
    });
  }

  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// --- 404 Handler ---
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    availableRoutes: [
      "GET /health",
      "POST /api/auth/register",
      "POST /api/auth/login",
      "GET /api/auth/profile",
      "POST /api/tickets/create",
      "GET /api/tickets/my-tickets",
      "GET /api/tickets/all",
      "POST /api/tickets/:ticketId/upload-log",
      "GET /api/tickets/stats/dashboard",
      "GET /api/messages/ticket/:ticketId",
      "POST /api/messages/send",
      "GET /api/messages/unread/count",
      "PUT /api/messages/mark-read",
      "POST /api/messages/sync-emails",
      "POST /api/messages/import-email-reply",
      "GET /api/messages/test-gmail",
      "GET /api/messages/sync-status",
      "GET /api/email/test",
    ],
  });
});

// --- Graceful Shutdown ---
process.on("SIGTERM", async () => {
  console.log("Received SIGTERM, closing server gracefully...");
  await mongoose.connection.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("Received SIGINT, closing server gracefully...");
  await mongoose.connection.close();
  process.exit(0);
});

// --- Start the Server ---
app.listen(port, () => {
  console.log("🚀 Smart Time Tracker API Server Started");
  console.log("==========================================");
  console.log(`📡 Server running at: http://localhost:${port}`);
  console.log(`🗄️  Database: ${MONGODB_URI}`);
  console.log(
    `🧠 AI Model: ${process.env.API_KEY ? "Configured" : "Not Configured"}`,
  );
  console.log("==========================================");
  console.log("📋 Available Routes:");
  console.log("   • POST /api/auth/register - Register new user");
  console.log("   • POST /api/auth/login - User login");
  console.log("   • GET  /api/auth/profile - Get user profile");
  console.log("   • POST /api/tickets/create - Create new ticket");
  console.log("   • GET  /api/tickets/my-tickets - Get user tickets");
  console.log("   • GET  /api/tickets/all - Get all tickets (managers)");
  console.log(
    "   • POST /api/tickets/:id/upload-log - Upload log & generate report",
  );
  console.log("   • GET  /api/tickets/stats/dashboard - Dashboard stats");
  console.log("   • GET  /api/messages/ticket/:id - Get ticket messages");
  console.log("   • POST /api/messages/send - Send new message");
  console.log("   • GET  /api/messages/unread/count - Get unread count");
  console.log("   • POST /api/messages/sync-emails - Sync emails from Gmail");
  console.log(
    "   • POST /api/messages/import-email-reply - Manual email import",
  );
  console.log("   • GET  /api/messages/test-gmail - Test Gmail API");
  console.log("   • GET  /api/email/test - Test email configuration");
  console.log("   • GET  /health - Health check");
  console.log("==========================================");

  // Start Gmail periodic check if configured
  if (gmailService.isConfigured) {
    console.log("📧 Starting Gmail email sync service...");
    gmailService.startPeriodicCheck(5); // Check every 5 minutes
  } else {
    console.log("📧 Gmail API not configured - email fetching disabled");
  }
});
