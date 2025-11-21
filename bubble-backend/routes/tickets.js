const express = require("express");
const multer = require("multer");
const { body, validationResult } = require("express-validator");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
const Message = require("../models/Message");
const emailService = require("../services/emailService");
const {
  auth,
  requireManager,
  requireTechnician,
  requireTechnicianOrManager,
} = require("../middleware/auth");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const router = express.Router();

// Setup Google AI
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept text files and logs
    if (
      file.mimetype === "text/plain" ||
      file.originalname.endsWith(".txt") ||
      file.originalname.endsWith(".log")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only text files (.txt, .log) are allowed"), false);
    }
  },
});

// Create a new ticket
router.post(
  "/create",
  [
    auth,
    body("ticketId").trim().notEmpty().withMessage("Ticket ID is required"),
    body("clientName").trim().notEmpty().withMessage("Client name is required"),
    body("clientEmail")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid client email is required"),
    body("title")
      .trim()
      .notEmpty()
      .isLength({ min: 5, max: 200 })
      .withMessage("Title must be between 5 and 200 characters"),
    body("description")
      .trim()
      .notEmpty()
      .isLength({ min: 10, max: 1000 })
      .withMessage("Description must be between 10 and 1000 characters"),
    body("priority")
      .optional()
      .isIn(["low", "medium", "high", "critical"])
      .withMessage("Invalid priority level"),
    body("category")
      .isIn(["hardware", "software", "network", "security", "other"])
      .withMessage("Invalid category"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const {
        ticketId,
        clientName,
        clientEmail,
        title,
        description,
        priority = "medium",
        category,
        assignedTo,
      } = req.body;

      // Check if ticket ID already exists
      const existingTicket = await Ticket.findOne({ ticketId });
      if (existingTicket) {
        return res.status(400).json({
          error: "Ticket ID already exists",
        });
      }

      // If assignedTo is not provided, assign to current user (technician)
      let assignedTechnicianId = req.user._id;

      // If manager is creating ticket and specifying technician
      if (assignedTo && req.user.role === "manager") {
        const technician = await User.findById(assignedTo);
        if (!technician || technician.role !== "technician") {
          return res.status(400).json({
            error: "Invalid technician assignment",
          });
        }
        assignedTechnicianId = assignedTo;
      }

      const ticket = new Ticket({
        ticketId,
        clientName,
        clientEmail,
        title,
        description,
        priority,
        category,
        assignedTo: assignedTechnicianId,
        createdBy: req.user._id,
        status: "open",
      });

      await ticket.save();

      // Populate the assigned technician info
      await ticket.populate("assignedTo", "name email employeeId");

      // Send automated email to customer
      try {
        const emailResult = await emailService.sendTicketCreationEmail(
          ticket,
          ticket.assignedTo,
        );

        if (emailResult.success) {
          // Create initial message record for tracking
          const initialMessage = new Message({
            ticketId: ticket._id,
            messageId: emailResult.messageId,
            from: {
              email: ticket.assignedTo.email,
              name: ticket.assignedTo.name,
              type: "technician",
            },
            to: {
              email: ticket.clientEmail,
              name: ticket.clientName,
              type: "customer",
            },
            subject: `Support Ticket Created: ${ticket.ticketId} - ${ticket.title}`,
            content: `Your support ticket has been created and assigned to ${ticket.assignedTo.name}. We will begin working on your issue shortly.`,
            isFromEmail: false,
            emailThreadId: emailResult.threadId,
            status: "sent",
          });

          await initialMessage.save();
          console.log("✅ Ticket creation email sent successfully");
        } else {
          console.error(
            "❌ Failed to send ticket creation email:",
            emailResult.error,
          );
        }
      } catch (emailError) {
        console.error("❌ Error sending ticket creation email:", emailError);
        // Don't fail ticket creation if email fails
      }

      res.status(201).json({
        message: "Ticket created successfully",
        ticket,
      });
    } catch (error) {
      console.error("Ticket creation error:", error);
      res.status(500).json({
        error: "Failed to create ticket",
        details: error.message,
      });
    }
  },
);

// Upload log and generate report for ticket closure
router.post(
  "/:ticketId/upload-log",
  [auth, requireTechnician, upload.single("logFile")],
  async (req, res) => {
    try {
      const { ticketId } = req.params;

      const ticket = await Ticket.findOne({ ticketId });
      if (!ticket) {
        return res.status(404).json({
          error: "Ticket not found",
        });
      }

      // Check if technician is assigned to this ticket
      if (ticket.assignedTo.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          error: "You are not assigned to this ticket",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: "Log file is required",
        });
      }

      // Read log file content
      const rawLog = req.file.buffer.toString("utf8");

      // Store raw log
      ticket.rawLog = rawLog;
      ticket.logFileName = req.file.originalname;

      // Generate AI analysis
      const analysisPrompt = `
You are an AI for an IT services company. Your job is to create a timesheet from a raw activity log. The technician is working on **Ticket ${ticket.ticketId} for ${ticket.clientName}**.

Analyze the following log. Group activities, assign them to the ticket, and estimate the time spent. Ignore non-work activity like "YouTube" or "Spotify".

Output **ONLY** a valid JSON object in the following structure:
{
  "analyzed_activities": [
    { "description": "Short description of activity", "time_minutes": 2, "is_billable": true },
    { "description": "Another activity", "time_minutes": 5, "is_billable": false }
  ],
  "total_billable_time_minutes": 7
}

---
**Raw Log:**
${rawLog}
---

**Expected JSON Output:**
`;

      const analysisResult = await model.generateContent(analysisPrompt);
      const analysisResponse = await analysisResult.response;
      let aiResponseText = analysisResponse.text();

      // Clean up response
      if (aiResponseText.startsWith("```json")) {
        aiResponseText = aiResponseText
          .substring(7, aiResponseText.length - 3)
          .trim();
      }

      const analysisData = JSON.parse(aiResponseText);

      // Store analyzed activities
      ticket.analyzedActivities = analysisData.analyzed_activities.map(
        (activity) => ({
          description: activity.description,
          timeMinutes: activity.time_minutes,
          isBillable: activity.is_billable !== false,
        }),
      );

      ticket.totalBillableTime = analysisData.total_billable_time_minutes || 0;

      // Generate professional report
      const reportPrompt = `
You are an IT technician for an MSP, writing a summary report for your manager about the work you just completed on **Ticket ${ticket.ticketId} for ${ticket.clientName}**.

Based on the provided raw activity log, write a professional, concise summary.
- Start with the ticket and client.
- Briefly list the key actions you took (e.g., "SSH'd into server," "ran patch script," "emailed client").
- Conclude with the status (e.g., "The issue is now resolved.").
- Keep it in a single paragraph, professional tone.

---
**Ticket Details:**
- ID: ${ticket.ticketId}
- Client: ${ticket.clientName}
- Issue: ${ticket.title}
- Description: ${ticket.description}

**Raw Log:**
${rawLog}
---

**Report Output:**
`;

      const reportResult = await model.generateContent(reportPrompt);
      const reportResponse = await reportResult.response;
      ticket.generatedReport = reportResponse.text();

      // Mark ticket as resolved
      ticket.status = "resolved";

      await ticket.save();

      // Update technician stats
      await User.findByIdAndUpdate(req.user._id, {
        $inc: {
          "stats.totalTickets": 1,
          "stats.totalBillableHours": ticket.totalBillableTime / 60,
        },
      });

      res.json({
        message: "Log uploaded and report generated successfully",
        ticket: {
          id: ticket._id,
          ticketId: ticket.ticketId,
          clientName: ticket.clientName,
          analyzedActivities: ticket.analyzedActivities,
          totalBillableTime: ticket.totalBillableTime,
          generatedReport: ticket.generatedReport,
          status: ticket.status,
          totalCost: ticket.totalCost,
        },
      });
    } catch (error) {
      console.error("Log upload error:", error);
      res.status(500).json({
        error: "Failed to upload log and generate report",
        details: error.message,
      });
    }
  },
);

// Get tickets for current user (technician sees only their tickets)
router.get("/my-tickets", auth, async (req, res) => {
  try {
    const {
      status,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = { assignedTo: req.user._id };
    if (status) {
      query.status = status;
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { [sortBy]: sortOrder === "desc" ? -1 : 1 },
      populate: [
        { path: "assignedTo", select: "name email employeeId" },
        { path: "createdBy", select: "name email" },
      ],
    };

    const tickets = await Ticket.find(query)
      .populate(options.populate)
      .sort(options.sort)
      .limit(options.limit)
      .skip((options.page - 1) * options.limit);

    const total = await Ticket.countDocuments(query);

    res.json({
      tickets,
      pagination: {
        current: options.page,
        total: Math.ceil(total / options.limit),
        count: tickets.length,
        totalRecords: total,
      },
    });
  } catch (error) {
    console.error("Get my tickets error:", error);
    res.status(500).json({
      error: "Failed to fetch tickets",
      details: error.message,
    });
  }
});

// Get all tickets (manager only)
router.get("/all", [auth, requireManager], async (req, res) => {
  try {
    const {
      status,
      assignedTo,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
      clientName,
      priority,
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (assignedTo) query.assignedTo = assignedTo;
    if (clientName) query.clientName = new RegExp(clientName, "i");
    if (priority) query.priority = priority;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { [sortBy]: sortOrder === "desc" ? -1 : 1 },
      populate: [
        { path: "assignedTo", select: "name email employeeId" },
        { path: "createdBy", select: "name email" },
      ],
    };

    const tickets = await Ticket.find(query)
      .populate(options.populate)
      .sort(options.sort)
      .limit(options.limit)
      .skip((options.page - 1) * options.limit);

    const total = await Ticket.countDocuments(query);

    res.json({
      tickets,
      pagination: {
        current: options.page,
        total: Math.ceil(total / options.limit),
        count: tickets.length,
        totalRecords: total,
      },
    });
  } catch (error) {
    console.error("Get all tickets error:", error);
    res.status(500).json({
      error: "Failed to fetch tickets",
      details: error.message,
    });
  }
});

// Get single ticket details
router.get("/:ticketId", auth, async (req, res) => {
  try {
    const { ticketId } = req.params;

    const ticket = await Ticket.findOne({ ticketId })
      .populate("assignedTo", "name email employeeId")
      .populate("createdBy", "name email");

    if (!ticket) {
      return res.status(404).json({
        error: "Ticket not found",
      });
    }

    // Check permissions
    const canView =
      req.user.role === "manager" ||
      ticket.assignedTo._id.toString() === req.user._id.toString() ||
      (ticket.createdBy &&
        ticket.createdBy._id.toString() === req.user._id.toString());

    if (!canView) {
      return res.status(403).json({
        error: "Access denied to this ticket",
      });
    }

    res.json({ ticket });
  } catch (error) {
    console.error("Get ticket error:", error);
    res.status(500).json({
      error: "Failed to fetch ticket",
      details: error.message,
    });
  }
});

// Close ticket (technician only)
router.put(
  "/:ticketId/close",
  [
    auth,
    requireTechnician,
    body("resolution")
      .trim()
      .notEmpty()
      .isLength({ min: 10, max: 500 })
      .withMessage("Resolution must be between 10 and 500 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { ticketId } = req.params;
      const { resolution } = req.body;

      const ticket = await Ticket.findOne({ ticketId });

      if (!ticket) {
        return res.status(404).json({
          error: "Ticket not found",
        });
      }

      if (ticket.assignedTo.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          error: "You are not assigned to this ticket",
        });
      }

      if (ticket.status === "closed") {
        return res.status(400).json({
          error: "Ticket is already closed",
        });
      }

      ticket.resolution = resolution;
      ticket.status = "closed";

      await ticket.save();

      res.json({
        message: "Ticket closed successfully",
        ticket: {
          ticketId: ticket.ticketId,
          status: ticket.status,
          resolution: ticket.resolution,
          closedAt: ticket.closedAt,
          resolutionTime: ticket.resolutionTime,
        },
      });
    } catch (error) {
      console.error("Close ticket error:", error);
      res.status(500).json({
        error: "Failed to close ticket",
        details: error.message,
      });
    }
  },
);

// Get dashboard stats for current user
router.get("/stats/dashboard", auth, async (req, res) => {
  try {
    let stats;

    if (req.user.role === "manager") {
      // Manager sees all stats
      const totalTickets = await Ticket.countDocuments();
      const openTickets = await Ticket.countDocuments({ status: "open" });
      const inProgressTickets = await Ticket.countDocuments({
        status: "in-progress",
      });
      const resolvedTickets = await Ticket.countDocuments({
        status: "resolved",
      });
      const closedTickets = await Ticket.countDocuments({ status: "closed" });

      // Get total billable hours
      const billableHoursResult = await Ticket.aggregate([
        { $match: { status: { $in: ["resolved", "closed"] } } },
        { $group: { _id: null, totalMinutes: { $sum: "$totalBillableTime" } } },
      ]);

      const totalBillableHours =
        billableHoursResult.length > 0
          ? Math.round((billableHoursResult[0].totalMinutes / 60) * 100) / 100
          : 0;

      // Get recent tickets
      const recentTickets = await Ticket.find()
        .populate("assignedTo", "name employeeId")
        .sort({ createdAt: -1 })
        .limit(5);

      // Get technician performance
      const technicianStats = await User.aggregate([
        { $match: { role: "technician" } },
        {
          $lookup: {
            from: "tickets",
            localField: "_id",
            foreignField: "assignedTo",
            as: "tickets",
          },
        },
        {
          $project: {
            name: 1,
            employeeId: 1,
            totalTickets: { $size: "$tickets" },
            completedTickets: {
              $size: {
                $filter: {
                  input: "$tickets",
                  cond: { $in: ["$$this.status", ["resolved", "closed"]] },
                },
              },
            },
            totalBillableTime: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: "$tickets",
                      cond: { $in: ["$$this.status", ["resolved", "closed"]] },
                    },
                  },
                  as: "ticket",
                  in: "$$ticket.totalBillableTime",
                },
              },
            },
          },
        },
        { $sort: { completedTickets: -1 } },
        { $limit: 10 },
      ]);

      stats = {
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets,
        totalBillableHours,
        recentTickets,
        technicianStats,
      };
    } else {
      // Technician sees only their stats
      const myTickets = await Ticket.countDocuments({
        assignedTo: req.user._id,
      });
      const myOpenTickets = await Ticket.countDocuments({
        assignedTo: req.user._id,
        status: "open",
      });
      const myInProgressTickets = await Ticket.countDocuments({
        assignedTo: req.user._id,
        status: "in-progress",
      });
      const myResolvedTickets = await Ticket.countDocuments({
        assignedTo: req.user._id,
        status: { $in: ["resolved", "closed"] },
      });

      // Get my billable hours
      const myBillableHoursResult = await Ticket.aggregate([
        {
          $match: {
            assignedTo: req.user._id,
            status: { $in: ["resolved", "closed"] },
          },
        },
        { $group: { _id: null, totalMinutes: { $sum: "$totalBillableTime" } } },
      ]);

      const myBillableHours =
        myBillableHoursResult.length > 0
          ? Math.round((myBillableHoursResult[0].totalMinutes / 60) * 100) / 100
          : 0;

      // Get my recent tickets
      const myRecentTickets = await Ticket.find({ assignedTo: req.user._id })
        .sort({ createdAt: -1 })
        .limit(5);

      stats = {
        myTickets,
        myOpenTickets,
        myInProgressTickets,
        myResolvedTickets,
        myBillableHours,
        myRecentTickets,
      };
    }

    res.json({ stats });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      error: "Failed to fetch dashboard stats",
      details: error.message,
    });
  }
});

module.exports = router;
