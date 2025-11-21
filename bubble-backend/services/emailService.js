const nodemailer = require("nodemailer");
const crypto = require("crypto");

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // Check if email is disabled for testing
    if (process.env.DISABLE_EMAIL === "true") {
      console.log("📧 Email sending is DISABLED for testing");
      this.transporter = null;
      return;
    }

    // Configure email transporter based on available credentials
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      // Gmail configuration when credentials are provided
      this.transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
        secure: true,
        port: 465,
      });
      console.log("📧 Using Gmail email service for", process.env.EMAIL_USER);
    } else {
      // Fallback to Ethereal for development testing (no real emails sent)
      console.log(
        "📧 Using Ethereal email for development (no real emails sent)",
      );
      this.transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: "ethereal.user@ethereal.email",
          pass: "ethereal.pass",
        },
      });
    }
  }

  generateMessageId(ticketId) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString("hex");
    return `<ticket-${ticketId}-${timestamp}-${random}@superhack-timetracker.com>`;
  }

  generateThreadId(ticketId) {
    return `<thread-${ticketId}@superhack-timetracker.com>`;
  }

  async sendTicketCreationEmail(ticket, technician) {
    try {
      const messageId = this.generateMessageId(ticket.ticketId);
      const threadId = this.generateThreadId(ticket.ticketId);

      const subject = `Support Ticket Created: ${ticket.ticketId} - ${ticket.title}`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .ticket-info { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .footer { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 20px; font-size: 12px; }
            .important { color: #d32f2f; font-weight: bold; }
            .btn { background: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>🎫 Support Ticket Created</h2>
            <p>Dear ${ticket.clientName},</p>
            <p>We have received your support request and created a ticket for you. Our technical team is now working on resolving your issue.</p>
          </div>

          <div class="ticket-info">
            <h3>Ticket Details:</h3>
            <p><strong>Ticket ID:</strong> ${ticket.ticketId}</p>
            <p><strong>Title:</strong> ${ticket.title}</p>
            <p><strong>Priority:</strong> ${ticket.priority.toUpperCase()}</p>
            <p><strong>Category:</strong> ${ticket.category}</p>
            <p><strong>Status:</strong> ${ticket.status}</p>
            <p><strong>Assigned Technician:</strong> ${technician.name} (${technician.email})</p>
          </div>

          <div>
            <h3>Issue Description:</h3>
            <p>${ticket.description}</p>
          </div>

          <div class="footer">
            <p class="important">⚠️ IMPORTANT: To ensure proper tracking and quick response:</p>
            <ul>
              <li><strong>Please reply to this email thread</strong> for any updates or questions regarding this issue</li>
              <li>Do not create a new email - always use "Reply" to maintain the conversation thread</li>
              <li>Include your ticket ID (${ticket.ticketId}) in any communication</li>
              <li>Our team will respond within our standard SLA timeframes</li>
            </ul>

            <p>📞 <strong>Need urgent assistance?</strong> Contact us at: ${process.env.SUPPORT_PHONE || "+1 (555) 123-4567"}</p>
            <p>🌐 <strong>Check ticket status online:</strong> ${process.env.FRONTEND_URL || "https://support.company.com"}</p>

            <hr style="margin: 20px 0;">
            <p style="color: #666;">
              This is an automated message from SuperHack Time Tracker Support System.<br>
              Please do not reply to this email from a different email address.<br>
              Ticket created on: ${new Date(ticket.createdAt).toLocaleString()}
            </p>
          </div>
        </body>
        </html>
      `;

      const textContent = `
Support Ticket Created: ${ticket.ticketId}

Dear ${ticket.clientName},

We have received your support request and created a ticket for you. Our technical team is now working on resolving your issue.

Ticket Details:
- Ticket ID: ${ticket.ticketId}
- Title: ${ticket.title}
- Priority: ${ticket.priority.toUpperCase()}
- Category: ${ticket.category}
- Status: ${ticket.status}
- Assigned Technician: ${technician.name} (${technician.email})

Issue Description:
${ticket.description}

IMPORTANT: To ensure proper tracking and quick response:
- Please reply to this email thread for any updates or questions regarding this issue
- Do not create a new email - always use "Reply" to maintain the conversation thread
- Include your ticket ID (${ticket.ticketId}) in any communication
- Our team will respond within our standard SLA timeframes

Need urgent assistance? Contact us at: ${process.env.SUPPORT_PHONE || "+1 (555) 123-4567"}

This is an automated message from SuperHack Time Tracker Support System.
Ticket created on: ${new Date(ticket.createdAt).toLocaleString()}
      `;

      const mailOptions = {
        from: {
          name: "SuperHack Support",
          address:
            process.env.EMAIL_FROM || "support@superhack-timetracker.com",
        },
        to: {
          name: ticket.clientName,
          address: ticket.clientEmail,
        },
        cc: {
          name: technician.name,
          address: technician.email,
        },
        subject: subject,
        text: textContent,
        html: htmlContent,
        messageId: messageId,
        headers: {
          References: threadId,
          "In-Reply-To": threadId,
          "X-Ticket-ID": ticket.ticketId,
          "X-Priority":
            ticket.priority === "critical"
              ? "1"
              : ticket.priority === "high"
                ? "2"
                : "3",
        },
      };

      const result = await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: result.messageId,
        threadId: threadId,
        result: result,
      };
    } catch (error) {
      console.error("Email sending failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendTicketUpdateEmail(
    ticket,
    technician,
    updateMessage,
    isResolution = false,
  ) {
    try {
      const messageId = this.generateMessageId(ticket.ticketId);
      const threadId = this.generateThreadId(ticket.ticketId);

      const subject = isResolution
        ? `[RESOLVED] Ticket ${ticket.ticketId} - ${ticket.title}`
        : `[UPDATE] Ticket ${ticket.ticketId} - ${ticket.title}`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: ${isResolution ? "#e8f5e8" : "#f0f7ff"}; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .update-content { background: #f9f9f9; padding: 15px; border-left: 4px solid #1976d2; margin: 15px 0; }
            .footer { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 20px; font-size: 12px; }
            .important { color: #d32f2f; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${isResolution ? "✅" : "🔄"} Ticket ${isResolution ? "Resolved" : "Update"}</h2>
            <p>Dear ${ticket.clientName},</p>
            <p>${isResolution ? "Great news! Your support ticket has been resolved." : "We have an update on your support ticket."}</p>
          </div>

          <div class="update-content">
            <h3>${isResolution ? "Resolution Details:" : "Update from our technical team:"}</h3>
            <p>${updateMessage}</p>
            <p><strong>Updated by:</strong> ${technician.name}</p>
            <p><strong>Update time:</strong> ${new Date().toLocaleString()}</p>
          </div>

          <div>
            <p><strong>Ticket ID:</strong> ${ticket.ticketId}</p>
            <p><strong>Current Status:</strong> ${ticket.status.toUpperCase()}</p>
            ${isResolution ? "<p><strong>Resolution Time:</strong> " + (ticket.resolutionTime ? Math.floor(ticket.resolutionTime / 60) + " hours " + (ticket.resolutionTime % 60) + " minutes" : "N/A") + "</p>" : ""}
          </div>

          <div class="footer">
            <p class="important">📧 To respond to this update, please reply to this email thread.</p>
            ${
              isResolution
                ? "<p>🌟 <strong>We value your feedback!</strong> Please let us know if the issue is fully resolved or if you need any additional assistance.</p>"
                : "<p>If you have any questions or need clarification, please reply to this email.</p>"
            }

            <hr style="margin: 20px 0;">
            <p style="color: #666;">
              This is an automated message from SuperHack Time Tracker Support System.<br>
              Ticket ID: ${ticket.ticketId} | Updated on: ${new Date().toLocaleString()}
            </p>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: {
          name: `${technician.name} - SuperHack Support`,
          address:
            process.env.EMAIL_FROM || "support@superhack-timetracker.com",
        },
        to: {
          name: ticket.clientName,
          address: ticket.clientEmail,
        },
        replyTo: {
          name: technician.name,
          address: technician.email,
        },
        subject: subject,
        html: htmlContent,
        messageId: messageId,
        headers: {
          References: threadId,
          "In-Reply-To": threadId,
          "X-Ticket-ID": ticket.ticketId,
        },
      };

      const result = await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: result.messageId,
        threadId: threadId,
        result: result,
      };
    } catch (error) {
      console.error("Email sending failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
