const express = require("express");
const { body, validationResult } = require("express-validator");
const Message = require("../models/Message");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
const emailService = require("../services/emailService");
const gmailService = require("../services/gmailService");
const {
  auth,
  requireTechnician,
  requireTechnicianOrManager,
} = require("../middleware/auth");

const router = express.Router();

// Get all messages for a specific ticket
router.get("/ticket/:ticketId", auth, async (req, res) => {
  try {
    const { ticketId } = req.params;

    // Verify ticket exists and user has access
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: "Ticket not found",
      });
    }

    // Check if user has access to this ticket
    const canAccess =
      req.user.role === "manager" ||
      ticket.assignedTo.toString() === req.user._id.toString();

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
      });
    }

    // Get messages for this ticket
    const messages = await Message.find({ ticketId })
      .sort({ createdAt: 1 })
      .lean();

    // Mark messages as read if they're addressed to the current user
    const userEmail = req.user.email;
    await Message.updateMany(
      {
        ticketId,
        "to.email": userEmail,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
    );

    res.json({
      success: true,
      messages,
      count: messages.length,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch messages",
      details: error.message,
    });
  }
});

// Send a new message
router.post(
  "/send",
  [
    auth,
    body("ticketId").notEmpty().withMessage("Ticket ID is required"),
    body("content")
      .notEmpty()
      .trim()
      .withMessage("Message content is required"),
    body("content")
      .isLength({ min: 1, max: 5000 })
      .withMessage("Message content must be between 1 and 5000 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { ticketId, content, isInternal = false } = req.body;

      // Verify ticket exists and user has access
      const ticket = await Ticket.findById(ticketId).populate("assignedTo");
      if (!ticket) {
        return res.status(404).json({
          success: false,
          error: "Ticket not found",
        });
      }

      // Check if user has access to this ticket
      const canAccess =
        req.user.role === "manager" ||
        ticket.assignedTo._id.toString() === req.user._id.toString();

      if (!canAccess) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
        });
      }

      // Generate unique message ID
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Determine message participants
      const fromUser = {
        email: req.user.email,
        name: req.user.name,
        type: "technician",
      };

      const toUser = {
        email: ticket.clientEmail,
        name: ticket.clientName,
        type: "customer",
      };

      // Create message record
      const message = new Message({
        ticketId,
        messageId,
        from: fromUser,
        to: toUser,
        subject: `Re: Support Ticket ${ticket.ticketId} - ${ticket.title}`,
        content,
        isFromEmail: false,
        emailThreadId: `thread-${ticket.ticketId}@superhack-timetracker.com`,
        status: "pending",
      });

      await message.save();

      // If not internal message, send email to customer
      if (!isInternal) {
        try {
          const emailResult = await emailService.sendTicketUpdateEmail(
            ticket,
            req.user,
            content,
            ticket.status === "resolved",
          );

          if (emailResult.success) {
            message.status = "sent";
            message.emailThreadId = emailResult.threadId;
            await message.save();
          } else {
            message.status = "failed";
            await message.save();
            console.error("Failed to send email:", emailResult.error);
          }
        } catch (emailError) {
          console.error("Email sending error:", emailError);
          message.status = "failed";
          await message.save();
        }
      } else {
        message.status = "sent";
        await message.save();
      }

      // Update ticket's last activity
      ticket.updatedAt = new Date();
      await ticket.save();

      res.json({
        success: true,
        message: "Message sent successfully",
        data: {
          messageId: message._id,
          status: message.status,
          sentAt: message.createdAt,
        },
      });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({
        success: false,
        error: "Failed to send message",
        details: error.message,
      });
    }
  },
);

// Get unread message count for a user
router.get("/unread/count", auth, async (req, res) => {
  try {
    const userEmail = req.user.email;

    // Get count of unread messages for this user
    const unreadCount = await Message.countDocuments({
      "to.email": userEmail,
      isRead: false,
    });

    // Get unread count per ticket
    const unreadByTicket = await Message.aggregate([
      {
        $match: {
          "to.email": userEmail,
          isRead: false,
        },
      },
      {
        $group: {
          _id: "$ticketId",
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "tickets",
          localField: "_id",
          foreignField: "_id",
          as: "ticket",
        },
      },
      {
        $project: {
          ticketId: { $arrayElemAt: ["$ticket.ticketId", 0] },
          count: 1,
        },
      },
    ]);

    res.json({
      success: true,
      totalUnread: unreadCount,
      byTicket: unreadByTicket,
    });
  } catch (error) {
    console.error("Error getting unread count:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get unread count",
      details: error.message,
    });
  }
});

// Mark messages as read
router.put(
  "/mark-read",
  [
    auth,
    body("messageIds").isArray().withMessage("Message IDs must be an array"),
    body("messageIds.*").isMongoId().withMessage("Invalid message ID format"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { messageIds } = req.body;
      const userEmail = req.user.email;

      // Update messages as read
      const result = await Message.updateMany(
        {
          _id: { $in: messageIds },
          "to.email": userEmail,
          isRead: false,
        },
        {
          $set: {
            isRead: true,
            readAt: new Date(),
          },
        },
      );

      res.json({
        success: true,
        message: `Marked ${result.modifiedCount} messages as read`,
        modifiedCount: result.modifiedCount,
      });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({
        success: false,
        error: "Failed to mark messages as read",
        details: error.message,
      });
    }
  },
);

// Get conversation history for a ticket (for technicians/managers)
router.get(
  "/conversation/:ticketId",
  requireTechnicianOrManager,
  async (req, res) => {
    try {
      const { ticketId } = req.params;
      const { page = 1, limit = 50 } = req.query;

      // Verify ticket exists
      const ticket = await Ticket.findById(ticketId);
      if (!ticket) {
        return res.status(404).json({
          success: false,
          error: "Ticket not found",
        });
      }

      // Check access permissions
      const canAccess =
        req.user.role === "manager" ||
        ticket.assignedTo.toString() === req.user._id.toString();

      if (!canAccess) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
        });
      }

      // Get paginated conversation
      const skip = (page - 1) * limit;
      const messages = await Message.find({ ticketId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean();

      const totalMessages = await Message.countDocuments({ ticketId });

      res.json({
        success: true,
        messages: messages.reverse(), // Reverse to show chronological order
        pagination: {
          current: Number(page),
          total: Math.ceil(totalMessages / limit),
          count: messages.length,
          totalRecords: totalMessages,
        },
      });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch conversation",
        details: error.message,
      });
    }
  },
);

// Webhook endpoint for processing incoming email replies (placeholder)
router.post("/webhook/email-reply", async (req, res) => {
  try {
    // This would be implemented based on your email service provider
    // (Gmail API, SendGrid, Mailgun, etc.)

    // Example structure for processing incoming emails:
    const {
      from,
      to,
      subject,
      textContent,
      htmlContent,
      messageId,
      references,
      inReplyTo,
    } = req.body;

    // Extract ticket ID from subject or references
    const ticketIdMatch = subject.match(/ticket[:\-\s]+([a-zA-Z0-9\-]+)/i);
    if (!ticketIdMatch) {
      return res.status(400).json({
        success: false,
        error: "Could not identify ticket from email",
      });
    }

    const ticketIdentifier = ticketIdMatch[1];
    const ticket = await Ticket.findOne({
      ticketId: ticketIdentifier,
    }).populate("assignedTo");

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: "Ticket not found",
      });
    }

    // Create message record for the customer reply
    const message = new Message({
      ticketId: ticket._id,
      messageId:
        messageId ||
        `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      from: {
        email: from.email,
        name: from.name || ticket.clientName,
        type: "customer",
      },
      to: {
        email: ticket.assignedTo.email,
        name: ticket.assignedTo.name,
        type: "technician",
      },
      subject,
      content: textContent || htmlContent,
      isFromEmail: true,
      emailThreadId: references || inReplyTo,
      status: "delivered",
    });

    await message.save();

    // Update ticket status if it was closed
    if (ticket.status === "closed") {
      ticket.status = "open";
      await ticket.save();
    }

    res.json({
      success: true,
      message: "Email reply processed successfully",
    });
  } catch (error) {
    console.error("Error processing email reply:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process email reply",
      details: error.message,
    });
  }
});

// Get message statistics
router.get("/stats", requireTechnicianOrManager, async (req, res) => {
  try {
    const { startDate, endDate, ticketId } = req.query;

    let matchConditions = {};

    // Filter by date range if provided
    if (startDate && endDate) {
      matchConditions.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Filter by ticket if provided
    if (ticketId) {
      const ticket = await Ticket.findOne({ ticketId });
      if (ticket) {
        matchConditions.ticketId = ticket._id;
      }
    }

    // Filter by user's assigned tickets if not manager
    if (req.user.role !== "manager") {
      const userTickets = await Ticket.find({
        assignedTo: req.user._id,
      }).select("_id");
      const ticketIds = userTickets.map((t) => t._id);
      matchConditions.ticketId = { $in: ticketIds };
    }

    const stats = await Message.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalMessages: { $sum: 1 },
          technicianMessages: {
            $sum: { $cond: [{ $eq: ["$from.type", "technician"] }, 1, 0] },
          },
          customerMessages: {
            $sum: { $cond: [{ $eq: ["$from.type", "customer"] }, 1, 0] },
          },
          emailMessages: {
            $sum: { $cond: ["$isFromEmail", 1, 0] },
          },
          avgResponseTime: {
            $avg: {
              $subtract: ["$createdAt", { $min: "$createdAt" }],
            },
          },
        },
      },
    ]);

    const result = stats[0] || {
      totalMessages: 0,
      technicianMessages: 0,
      customerMessages: 0,
      emailMessages: 0,
      avgResponseTime: 0,
    };

    // Convert response time from milliseconds to hours
    result.avgResponseTimeHours = result.avgResponseTime
      ? Math.round((result.avgResponseTime / (1000 * 60 * 60)) * 100) / 100
      : 0;

    res.json({
      success: true,
      stats: result,
    });
  } catch (error) {
    console.error("Error getting message stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get message statistics",
      details: error.message,
    });
  }
});

// Manual email sync endpoint
router.post(
  "/sync-emails",
  auth,
  requireTechnicianOrManager,
  async (req, res) => {
    try {
      console.log("📧 Manual email sync requested by", req.user.name);

      const result = await gmailService.syncEmails();

      if (result.success) {
        res.json({
          success: true,
          message: `Successfully processed ${result.processed} out of ${result.total} emails`,
          data: {
            processed: result.processed,
            total: result.total,
            errors: result.errors,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || "Failed to sync emails",
        });
      }
    } catch (error) {
      console.error("Error in email sync:", error);
      res.status(500).json({
        success: false,
        error: "Failed to sync emails",
        details: error.message,
      });
    }
  },
);

// Test Gmail API connection
router.get(
  "/test-gmail",
  auth,
  requireTechnicianOrManager,
  async (req, res) => {
    try {
      const result = await gmailService.testConnection();

      res.json({
        success: result.success,
        message: result.success
          ? "Gmail API connection successful"
          : "Gmail API connection failed",
        data: result.success
          ? {
              email: result.email,
              messagesTotal: result.messagesTotal,
              threadsTotal: result.threadsTotal,
            }
          : null,
        error: result.error || null,
      });
    } catch (error) {
      console.error("Error testing Gmail connection:", error);
      res.status(500).json({
        success: false,
        error: "Failed to test Gmail connection",
        details: error.message,
      });
    }
  },
);

// Auto-sync status endpoint
router.get(
  "/sync-status",
  auth,
  requireTechnicianOrManager,
  async (req, res) => {
    try {
      res.json({
        success: true,
        gmailConfigured: gmailService.isConfigured,
        message: gmailService.isConfigured
          ? "Gmail API is configured and ready"
          : "Gmail API not configured - email fetching disabled",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to get sync status",
      });
    }
  },
);

// Manual email import endpoint (for when Gmail API is not configured)
router.post(
  "/import-email-reply",
  auth,
  requireTechnicianOrManager,
  [
    body("ticketId").notEmpty().withMessage("Ticket ID is required"),
    body("fromEmail").isEmail().withMessage("Valid from email is required"),
    body("subject").notEmpty().withMessage("Subject is required"),
    body("content").notEmpty().withMessage("Email content is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { ticketId, fromEmail, subject, content } = req.body;

      // Find the ticket
      const ticket = await Ticket.findOne({ ticketId }).populate("assignedTo");
      if (!ticket) {
        return res.status(404).json({
          success: false,
          error: "Ticket not found",
        });
      }

      // Check if user has access to this ticket
      const canAccess =
        req.user.role === "manager" ||
        ticket.assignedTo._id.toString() === req.user._id.toString();

      if (!canAccess) {
        return res.status(403).json({
          success: false,
          error: "Access denied",
        });
      }

      // Verify the email is from the customer
      if (fromEmail.toLowerCase() !== ticket.clientEmail.toLowerCase()) {
        return res.status(400).json({
          success: false,
          error: "Email must be from the ticket's customer",
        });
      }

      // Generate unique message ID
      const messageId = `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create message record for the customer reply
      const message = new Message({
        ticketId: ticket._id,
        messageId,
        from: {
          email: fromEmail,
          name: ticket.clientName,
          type: "customer",
        },
        to: {
          email: ticket.assignedTo.email,
          name: ticket.assignedTo.name,
          type: "technician",
        },
        subject,
        content,
        isFromEmail: true,
        emailThreadId: `thread-${ticket.ticketId}@superhack-timetracker.com`,
        status: "delivered",
        isRead: false,
        metadata: {
          manualImport: true,
          importedBy: req.user._id,
          importedAt: new Date(),
        },
      });

      await message.save();

      // Update ticket status if it was closed
      if (ticket.status === "closed" || ticket.status === "resolved") {
        ticket.status = "open";
        await ticket.save();
        console.log(
          `📧 Reopened ticket ${ticket.ticketId} due to customer response`,
        );
      }

      res.json({
        success: true,
        message: "Customer email reply imported successfully",
        data: {
          messageId: message._id,
          ticketId: ticket.ticketId,
          ticketReopened: ticket.status === "open",
        },
      });
    } catch (error) {
      console.error("Error importing email reply:", error);
      res.status(500).json({
        success: false,
        error: "Failed to import email reply",
        details: error.message,
      });
    }
  },
);

module.exports = router;
