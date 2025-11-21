# Gmail API Setup Guide for Email Fetching

This guide will help you set up Gmail API integration to automatically fetch customer email replies and display them in your message panel.

## 🎯 What This Enables

- **Automatic Email Fetching**: Customer email replies appear in the message panel
- **Two-Way Communication**: Complete email conversation in chat format
- **Real-time Sync**: New emails checked every 5 minutes
- **Thread Preservation**: Maintains proper email conversation threading

## 🔧 Gmail API Setup

### Step 1: Create Google Cloud Project

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Gmail account

2. **Create New Project**
   - Click "Select a project" → "New Project"
   - Project name: `SuperHack Email Integration`
   - Click "Create"

3. **Enable Gmail API**
   - Go to "APIs & Services" → "Library"
   - Search for "Gmail API"
   - Click on "Gmail API" → "Enable"

### Step 2: Create Credentials

1. **Go to Credentials**
   - Navigate to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"

2. **Configure OAuth Consent Screen** (if prompted)
   - User Type: "External" → "Create"
   - App name: `SuperHack Email Integration`
   - User support email: Your email
   - Developer contact: Your email
   - Click "Save and Continue"
   - Scopes: Click "Save and Continue"
   - Test users: Add your Gmail address → "Save and Continue"

3. **Create OAuth Client ID**
   - Application type: "Desktop application"
   - Name: `SuperHack Email Client`
   - Click "Create"

4. **Download Credentials**
   - Download the JSON file
   - Rename it to `gmail-credentials.json`
   - Place it in your `bubble-backend` directory

### Step 3: Generate Refresh Token

Create a script to generate the refresh token:

```javascript
// bubble-backend/generate-gmail-token.js
const { google } = require('googleapis');
const fs = require('fs');
const readline = require('readline');

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const CREDENTIALS_PATH = './gmail-credentials.json';

async function generateToken() {
  // Load credentials
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  
  const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0] || 'urn:ietf:wg:oauth:2.0:oob');

  // Generate auth URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('📧 Gmail API Token Generation');
  console.log('=============================');
  console.log('1. Open this URL in your browser:');
  console.log(authUrl);
  console.log('\n2. Authorize the application');
  console.log('3. Copy the authorization code from the browser');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('\n4. Paste the authorization code here: ', async (code) => {
    try {
      const { tokens } = await oauth2Client.getToken(code);
      
      console.log('\n✅ Tokens generated successfully!');
      console.log('\nAdd these to your .env file:');
      console.log('=====================================');
      console.log(`GMAIL_CLIENT_ID=${client_id}`);
      console.log(`GMAIL_CLIENT_SECRET=${client_secret}`);
      console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log('=====================================');
      
    } catch (error) {
      console.error('❌ Error generating token:', error.message);
    }
    rl.close();
  });
}

generateToken().catch(console.error);
```

Run the token generation script:

```bash
cd bubble-backend
npm install googleapis
node generate-gmail-token.js
```

### Step 4: Update Environment Variables

Add the Gmail API credentials to your `.env` file:

```env
# Existing email config
EMAIL_USER=your.email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=your.email@gmail.com

# Gmail API credentials (new)
GMAIL_CLIENT_ID=your_client_id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your_client_secret
GMAIL_REFRESH_TOKEN=your_refresh_token

# Optional: Disable email fetching for testing
# DISABLE_EMAIL_FETCH=true
```

### Step 5: Test Gmail API Connection

Test the Gmail API setup:

```bash
# Start your server
node index.js

# In another terminal, test Gmail API
curl http://localhost:3000/api/messages/test-gmail

# Expected response:
{
  "success": true,
  "message": "Gmail API connection successful",
  "data": {
    "email": "your.email@gmail.com",
    "messagesTotal": 12345,
    "threadsTotal": 5678
  }
}
```

## 🔄 Email Sync Process

### Automatic Sync

Once configured, the system will:

1. **Check every 5 minutes** for new emails
2. **Look for emails** sent to your support address
3. **Match ticket IDs** from email subjects/references
4. **Create message records** in the database
5. **Display in chat panel** automatically

### Manual Sync

Trigger manual email sync:

```bash
# Sync emails immediately
curl -X POST http://localhost:3000/api/messages/sync-emails \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Or use the frontend Messages Test page with a "Sync Emails" button.

## 🧪 Testing the Complete Flow

### Test Scenario

1. **Create a ticket** through your app
2. **Customer receives email** automatically
3. **Customer replies** to that email
4. **Email appears** in your message panel within 5 minutes
5. **Technician responds** through the panel
6. **Customer gets email** with the response

### Test Commands

```bash
# Check sync status
curl http://localhost:3000/api/messages/sync-status

# Manual email sync
curl -X POST http://localhost:3000/api/messages/sync-emails \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check unread messages
curl http://localhost:3000/api/messages/unread/count \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🛠️ Frontend Integration

Add email sync controls to your Messages Test page:

```javascript
// Add to MessagesTest.jsx
const syncEmails = async () => {
  try {
    const response = await fetch('/api/messages/sync-emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    const result = await response.json();
    if (result.success) {
      toast.success(`Synced ${result.data.processed} new emails`);
      fetchMessageStats(); // Refresh stats
    } else {
      toast.error(result.error);
    }
  } catch (error) {
    toast.error('Failed to sync emails');
  }
};
```

## 🔍 Troubleshooting

### Common Issues

1. **"Gmail API not configured"**
   - Check all environment variables are set
   - Verify credentials file exists
   - Ensure Gmail API is enabled in Google Cloud Console

2. **"Authentication failed"**
   - Regenerate refresh token
   - Check client ID and secret are correct
   - Ensure OAuth consent screen is configured

3. **"No emails found"**
   - Check email search query
   - Verify customer is replying to correct email
   - Check spam/junk folders

4. **"Ticket ID not found"**
   - Ensure ticket ID is in email subject
   - Check email threading headers
   - Verify ticket exists in database

### Debug Logs

Enable debug logging:

```env
# Add to .env
DEBUG_EMAIL_SYNC=true
```

Check server logs for detailed email processing information.

## 📊 Monitoring

### Email Sync Statistics

Monitor email sync performance:

```bash
# Get message statistics
curl http://localhost:3000/api/messages/stats \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response includes:
{
  "success": true,
  "stats": {
    "totalMessages": 150,
    "technicianMessages": 75,
    "customerMessages": 75,
    "emailMessages": 60,
    "avgResponseTimeHours": 2.5
  }
}
```

### Health Check

```bash
# Check overall system health
curl http://localhost:3000/health

# Check email sync status
curl http://localhost:3000/api/messages/sync-status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🚀 Production Deployment

### Security Considerations

1. **Store credentials securely**
   - Use environment variables
   - Never commit credentials to version control
   - Consider using secret management services

2. **Rate limiting**
   - Gmail API has usage limits
   - Implement exponential backoff
   - Monitor API quotas

3. **Error handling**
   - Graceful degradation if Gmail API is down
   - Retry failed email processing
   - Log all email sync activities

### Performance Optimization

1. **Batch processing**
   - Process multiple emails in batches
   - Implement pagination for large volumes
   - Use database indexing for fast lookups

2. **Caching**
   - Cache last sync timestamp
   - Implement duplicate email detection
   - Store processed email IDs

## 🎉 Success!

Once configured, your system will have:

✅ **Complete Email Integration** - Bidirectional email communication
✅ **Automatic Sync** - New emails appear without manual intervention
✅ **Chat Interface** - Email conversations in modern chat format
✅ **Real-time Updates** - Live message counts and notifications
✅ **Thread Preservation** - Maintains proper email conversation flow

Your customers can now communicate seamlessly via email while you manage everything through the elegant chat panel interface!

## 📞 Support

If you encounter issues:

1. Check the server logs for error messages
2. Verify all environment variables are set correctly
3. Test Gmail API connection endpoint
4. Ensure customer emails contain proper ticket references
5. Check Google Cloud Console for API quota limits

The email fetching system is now ready to provide seamless customer communication! 🎉