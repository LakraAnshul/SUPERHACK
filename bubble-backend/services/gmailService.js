const { google } = require("googleapis");
const Message = require("../models/Message");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
const crypto = require("crypto");

class GmailService {
  constructor() {
    this.gmail = null;
    this.oauth2Client = null;
    this.isConfigured = false;
    this.initializeGmail();
  }

  initializeGmail() {
    try {
      // Check if Gmail API credentials are configured
      if (
        !process.env.GMAIL_CLIENT_ID ||
        !process.env.GMAIL_CLIENT_SECRET ||
        !process.env.GMAIL_REFRESH_TOKEN
      ) {
        console.log("📧 Gmail API not configured - email fetching disabled");
        console.log("💡 To enable automatic email sync:");
        console.log("   1. Run: node generate-gmail-token.js");
        console.log("   2. Add GMAIL_* variables to .env");
        console.log("   3. Restart the server");
        return;
      }

      // Create OAuth2 client
      this.oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        "urn:ietf:wg:oauth:2.0:oob", // For installed applications
      );

      // Set refresh token
      this.oauth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      });

      // Create Gmail API client
      this.gmail = google.gmail({ version: "v1", auth: this.oauth2Client });
      this.isConfigured = true;

      console.log("📧 Gmail API service initialized successfully");
      console.log("📧 Email sync will check every 5 minutes for new replies");
    } catch (error) {
      console.error("❌ Failed to initialize Gmail API:", error.message);
      console.log("💡 Check your Gmail API credentials in .env file");
      console.log("💡 Run: node generate-gmail-token.js to regenerate tokens");
      this.isConfigured = false;
    }
  }

  // Fetch new emails since last check
  async fetchNewEmails() {
    if (!this.isConfigured) {
      console.log("⚠️ Gmail API not configured, skipping email fetch");
      console.log(
        '💡 To enable: run "node generate-gmail-token.js" and update .env',
      );
      return { success: false, error: "Gmail API not configured" };
    }

    try {
      console.log("📧 Checking for new emails...");

      // Get the last check timestamp (store this in database or config)
      const lastCheckTime = await this.getLastCheckTime();

      // Search for emails after last check time that match our pattern
      const query = this.buildSearchQuery(lastCheckTime);

      const response = await this.gmail.users.messages.list({
        userId: "me",
        q: query,
        maxResults: 50,
      });

      const messages = response.data.messages || [];
      console.log(`📧 Found ${messages.length} new emails to process`);

      let processedCount = 0;
      const errors = [];

      for (const message of messages) {
        try {
          await this.processIncomingEmail(message.id);
          processedCount++;
        } catch (error) {
          console.error(
            `❌ Error processing email ${message.id}:`,
            error.message,
          );
          errors.push({ messageId: message.id, error: error.message });
        }
      }

      // Update last check time
      await this.updateLastCheckTime();

      return {
        success: true,
        processed: processedCount,
        total: messages.length,
        errors: errors,
      };
    } catch (error) {
      console.error("❌ Error fetching emails:", error.message);

      // Provide specific error guidance
      if (error.message.includes("invalid_grant")) {
        console.log(
          "💡 Gmail token expired - run: node generate-gmail-token.js",
        );
      } else if (error.message.includes("quota")) {
        console.log("💡 Gmail API quota exceeded - try again later");
      } else if (error.message.includes("permission")) {
        console.log("💡 Check Gmail API permissions in Google Cloud Console");
      }

      return { success: false, error: error.message };
    }
  }

  // Process a single incoming email
  async processIncomingEmail(messageId) {
    try {
      // Get full email details
      const response = await this.gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full",
      });

      const email = response.data;
      const headers = this.parseHeaders(email.payload.headers);

      // Extract ticket ID from subject or references
      const ticketId = this.extractTicketId(headers);
      if (!ticketId) {
        console.log(`⚠️ No ticket ID found in email ${messageId}`);
        console.log(`📧 Subject: ${headers.subject}`);
        console.log(
          `💡 Make sure customer replies include ticket ID (e.g., T-2024-001)`,
        );
        return;
      }

      // Find the ticket in database
      const ticket = await Ticket.findOne({ ticketId }).populate("assignedTo");
      if (!ticket) {
        console.log(`⚠️ Ticket ${ticketId} not found in database`);
        console.log(`📧 Email ${messageId} cannot be linked to any ticket`);
        return;
      }

      // Extract email content
      const content = this.extractEmailContent(email.payload);

      // Check if this email is from the customer
      const fromEmail = headers.from.toLowerCase();
      const customerEmail = ticket.clientEmail.toLowerCase();

      if (!fromEmail.includes(customerEmail)) {
        console.log(
          `⚠️ Email from ${fromEmail} doesn't match customer ${customerEmail}`,
        );
        console.log(`💡 Only customer emails are imported as replies`);
        return;
      }

      // Check if we've already processed this email
      const existingMessage = await Message.findOne({
        "metadata.gmailMessageId": messageId,
      });

      if (existingMessage) {
        console.log(`⚠️ Email ${messageId} already processed, skipping`);
        return;
      }

      // Create message record
      const message = new Message({
        ticketId: ticket._id,
        messageId: this.generateMessageId(ticket.ticketId),
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
        subject: headers.subject || `Re: ${ticket.title}`,
        content: content.text,
        isFromEmail: true,
        emailThreadId: headers.references || headers.messageId,
        inReplyTo: headers.inReplyTo,
        status: "delivered",
        isRead: false,
        metadata: {
          gmailMessageId: messageId,
          originalSubject: headers.subject,
          receivedAt: new Date(parseInt(email.internalDate)),
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

      console.log(`✅ Successfully processed customer reply`);
      console.log(`📧 From: ${fromEmail}`);
      console.log(`🎫 Ticket: ${ticket.ticketId}`);
      console.log(`📝 Content length: ${content.text.length} characters`);
    } catch (error) {
      console.error(`❌ Error processing email ${messageId}:`, error.message);

      // Enhanced error context
      if (error.message.includes("validation")) {
        console.log("💡 Message validation failed - check email content");
      } else if (error.message.includes("duplicate")) {
        console.log("💡 This email was already processed");
      }

      throw error;
    }
  }

  // Build Gmail search query
  buildSearchQuery(lastCheckTime) {
    const supportEmail = process.env.EMAIL_USER || process.env.EMAIL_FROM;

    // Search for emails:
    // 1. Sent to our support email
    // 2. After last check time
    // 3. With ticket-related subjects
    let query = `to:${supportEmail}`;

    if (lastCheckTime) {
      const date = new Date(lastCheckTime);
      const formattedDate = date.toISOString().split("T")[0].replace(/-/g, "/");
      query += ` after:${formattedDate}`;
    }

    // Look for emails that might be ticket replies
    query += ` (subject:"Support Ticket" OR subject:"Re:" OR subject:"T-")`;

    return query;
  }

  // Parse email headers into a convenient object
  parseHeaders(headers) {
    const parsed = {};

    headers.forEach((header) => {
      const name = header.name.toLowerCase();
      parsed[name] = header.value;
    });

    return {
      from: parsed.from || "",
      to: parsed.to || "",
      subject: parsed.subject || "",
      messageId: parsed["message-id"] || "",
      references: parsed.references || "",
      inReplyTo: parsed["in-reply-to"] || "",
      date: parsed.date || "",
    };
  }

  // Extract ticket ID from email headers
  extractTicketId(headers) {
    // Try to extract from subject line
    const subject = headers.subject || "";

    // Pattern 1: "Support Ticket T-2024-001"
    let match = subject.match(/ticket\s+(T-\d{4}-\d{3})/i);
    if (match) return match[1];

    // Pattern 2: "T-2024-001" anywhere in subject
    match = subject.match(/(T-\d{4}-\d{3})/i);
    if (match) return match[1];

    // Pattern 3: From references header (email threading)
    if (headers.references) {
      match = headers.references.match(/thread-(T-\d{4}-\d{3})@/);
      if (match) return match[1];
    }

    return null;
  }

  // Extract text content from email payload
  extractEmailContent(payload) {
    let text = "";
    let html = "";

    const extractFromPart = (part) => {
      if (part.mimeType === "text/plain" && part.body.data) {
        text += Buffer.from(part.body.data, "base64").toString("utf-8");
      } else if (part.mimeType === "text/html" && part.body.data) {
        html += Buffer.from(part.body.data, "base64").toString("utf-8");
      } else if (part.parts) {
        part.parts.forEach(extractFromPart);
      }
    };

    if (payload.parts) {
      payload.parts.forEach(extractFromPart);
    } else if (payload.body.data) {
      if (payload.mimeType === "text/plain") {
        text = Buffer.from(payload.body.data, "base64").toString("utf-8");
      } else if (payload.mimeType === "text/html") {
        html = Buffer.from(payload.body.data, "base64").toString("utf-8");
      }
    }

    // Clean up the text content
    text = this.cleanEmailContent(text);

    return { text, html };
  }

  // Clean email content (remove signatures, quoted text, etc.)
  cleanEmailContent(content) {
    if (!content) return "";

    // Remove common email footers/signatures
    const cleanPatterns = [
      /-----Original Message-----[\s\S]*/i,
      /On .* wrote:[\s\S]*/i,
      /From:.*\r?\n.*Sent:.*\r?\n.*To:.*\r?\n.*Subject:.*\r?\n[\s\S]*/i,
      /________________________________[\s\S]*/,
      /This email was sent by.*[\s\S]*/i,
      /Sent from my iPhone[\s\S]*/i,
      /Sent from my Android[\s\S]*/i,
    ];

    let cleaned = content;
    cleanPatterns.forEach((pattern) => {
      cleaned = cleaned.replace(pattern, "");
    });

    // Remove excessive whitespace
    cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();

    return cleaned;
  }

  // Generate unique message ID
  generateMessageId(ticketId) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString("hex");
    return `email-${ticketId}-${timestamp}-${random}`;
  }

  // Get last email check timestamp
  async getLastCheckTime() {
    try {
      // Store in database or config - for now, check last 24 hours
      const lastDay = new Date();
      lastDay.setDate(lastDay.getDate() - 1);
      return lastDay.getTime();
    } catch (error) {
      console.error("Error getting last check time:", error);
      return null;
    }
  }

  // Update last email check timestamp
  async updateLastCheckTime() {
    try {
      // In a real implementation, store this in database
      console.log(
        "📧 Updated last email check time:",
        new Date().toISOString(),
      );
    } catch (error) {
      console.error("Error updating last check time:", error);
    }
  }

  // Start periodic email checking
  startPeriodicCheck(intervalMinutes = 5) {
    if (!this.isConfigured) {
      console.log("⚠️ Gmail API not configured, periodic check disabled");
      return;
    }

    console.log(
      `📧 Starting periodic email check every ${intervalMinutes} minutes`,
    );

    // Initial check
    this.fetchNewEmails();

    // Set up interval
    setInterval(
      () => {
        this.fetchNewEmails();
      },
      intervalMinutes * 60 * 1000,
    );
  }

  // Manual email sync endpoint
  async syncEmails() {
    console.log("📧 Manual email sync triggered");
    const result = await this.fetchNewEmails();

    if (result.success) {
      console.log(
        `✅ Manual sync completed: ${result.processed}/${result.total} emails processed`,
      );
    } else {
      console.log(`❌ Manual sync failed: ${result.error}`);
    }

    return result;
  }

  // Test Gmail API connection
  async testConnection() {
    if (!this.isConfigured) {
      return {
        success: false,
        error: "Gmail API not configured",
        help: "Run: node generate-gmail-token.js",
      };
    }

    try {
      console.log("🧪 Testing Gmail API connection...");
      const response = await this.gmail.users.getProfile({ userId: "me" });

      console.log(
        `✅ Gmail API test successful for: ${response.data.emailAddress}`,
      );

      return {
        success: true,
        email: response.data.emailAddress,
        messagesTotal: response.data.messagesTotal,
        threadsTotal: response.data.threadsTotal,
        lastTested: new Date().toISOString(),
      };
    } catch (error) {
      console.log(`❌ Gmail API test failed: ${error.message}`);

      return {
        success: false,
        error: error.message,
        help: error.message.includes("invalid_grant")
          ? "Token expired - run: node generate-gmail-token.js"
          : "Check Gmail API credentials and permissions",
      };
    }
  }
}

module.exports = new GmailService();
