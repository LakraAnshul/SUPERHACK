# Chat/Message System Setup Guide

This guide will help you set up the chat/message system that enables communication between technicians and customers via email integration.

## Features Overview

The chat/message system provides:

- **Automated Email Notifications**: When a technician creates a ticket, an automated email is sent to the customer
- **Email Threading**: All messages maintain proper email threading for easy conversation tracking
- **Customer Reply Integration**: When customers reply to emails, their responses appear in the technician's message panel
- **Internal Notes**: Technicians can add internal notes that are not sent to customers
- **Unread Message Indicators**: Visual indicators show unread message counts
- **Message History**: Complete conversation history for each ticket

## Setup Instructions

### 1. Environment Configuration

Create or update your `.env` file in the `bubble-backend` directory:

```env
# Basic Configuration
MONGODB_URI=mongodb://localhost:27017/superhack-timetracker
API_KEY=your_google_ai_api_key_here
NODE_ENV=development

# Email Configuration
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password_here
EMAIL_FROM=support@superhack-timetracker.com
SUPPORT_PHONE=+1 (555) 123-4567
FRONTEND_URL=http://localhost:5173
```

### 2. Email Service Setup

#### Option A: Gmail Setup (Recommended for Development)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security > 2-Step Verification > App passwords
   - Generate a new app password for "Mail"
   - Use this password in `EMAIL_PASSWORD`

3. **Update Environment Variables**:
   ```env
   EMAIL_USER=your.email@gmail.com
   EMAIL_PASSWORD=your_app_password_here
   EMAIL_FROM=your.email@gmail.com
   ```

#### Option B: Professional Email Service (Production)

For production, consider using:
- **SendGrid**: Enterprise email delivery
- **Mailgun**: Developer-friendly email API
- **Amazon SES**: AWS email service

Example SendGrid setup:
```env
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key
EMAIL_FROM=support@yourdomain.com
```

### 3. Test Email Configuration

After setting up your environment variables:

1. **Start the backend server**:
   ```bash
   cd bubble-backend
   npm install
   npm start
   ```

2. **Test email configuration**:
   ```bash
   curl http://localhost:3000/api/email/test
   ```

   You should see output like:
   ```json
   {
     "success": true,
     "message": "Email service is configured correctly",
     "config": {
       "emailUser": "✓ Configured",
       "emailPassword": "✓ Configured",
       "emailFrom": "support@superhack-timetracker.com",
       "nodeEnv": "development"
     }
   }
   ```

### 4. Start the Frontend

```bash
cd bubble-frontend
npm install
npm run dev
```

## How It Works

### 1. Ticket Creation Flow

1. **Technician creates a ticket** with customer email
2. **Automated email is sent** to customer with:
   - Ticket details
   - Instructions to reply to the same thread
   - Technician contact information
3. **Message record is created** in the database for tracking

### 2. Customer Communication

1. **Customer receives email** with proper threading headers
2. **Customer replies** to the email (staying in the same thread)
3. **Reply appears** in technician's message panel
4. **Technician can respond** directly from the panel

### 3. Message Panel Features

- **Real-time message viewing** for each ticket
- **Send messages** that automatically email the customer
- **Add internal notes** that don't email the customer
- **Mark messages as read** to manage unread counts
- **View conversation history** with timestamps

## Using the System

### For Technicians

1. **View Messages**: Click the "Messages" button on any ticket details page
2. **Send Message**: Type your message and click "Send" (emails customer automatically)
3. **Add Internal Note**: Check "Internal note" to add notes that don't email the customer
4. **Check Unread**: Unread message counts appear as red badges

### For Customers

1. **Receive Email**: Get automated email when ticket is created
2. **Reply to Email**: Use "Reply" (not "Reply All" or new email)
3. **Stay in Thread**: Always reply to the same email thread
4. **Get Updates**: Receive email notifications when technicians respond

## Troubleshooting

### Email Not Sending

1. **Check Configuration**:
   ```bash
   curl http://localhost:3000/api/email/test
   ```

2. **Common Issues**:
   - Wrong email/password
   - 2FA not enabled (Gmail)
   - App password not generated (Gmail)
   - Firewall blocking SMTP ports

### Messages Not Appearing

1. **Check Database Connection**: Ensure MongoDB is running
2. **Check Console Logs**: Look for error messages in backend console
3. **Verify API Calls**: Use browser developer tools to check network requests

### Email Threading Issues

1. **Customer must reply to same email** (not create new email)
2. **Email client must preserve headers** (most modern clients do this)
3. **Check spam folder** for customer replies

## Email Templates

### Ticket Creation Email

The system automatically sends this when a ticket is created:

**Subject**: `Support Ticket Created: [TICKET-ID] - [TITLE]`

**Content**: Includes ticket details, technician info, and reply instructions

### Update Email

When technicians send messages:

**Subject**: `[UPDATE] Ticket [TICKET-ID] - [TITLE]`

**Content**: Update message with proper threading

### Resolution Email

When tickets are resolved:

**Subject**: `[RESOLVED] Ticket [TICKET-ID] - [TITLE]`

**Content**: Resolution details and feedback request

## Security Considerations

1. **Use App Passwords** (not main account passwords)
2. **Enable 2FA** on email accounts
3. **Use environment variables** for sensitive data
4. **Consider professional email services** for production
5. **Validate email addresses** before sending
6. **Rate limit email sending** to prevent abuse

## Development Tips

1. **Use Ethereal Email** for development testing (automatically configured)
2. **Check email logs** in backend console
3. **Test with real email** for full experience
4. **Monitor database** for message records
5. **Use browser dev tools** for frontend debugging

## Production Deployment

For production deployment:

1. **Use professional email service** (SendGrid, Mailgun, etc.)
2. **Set up proper domain authentication** (SPF, DKIM, DMARC)
3. **Configure email templates** with your branding
4. **Set up monitoring** for email delivery
5. **Implement bounce handling** for failed emails
6. **Add unsubscribe functionality** if required

## Support

If you encounter issues:

1. Check the backend console logs
2. Test email configuration endpoint
3. Verify environment variables
4. Check MongoDB connection
5. Review network connectivity

The message system is now ready to provide seamless communication between your support team and customers!