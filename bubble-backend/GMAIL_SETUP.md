# Gmail API Setup Guide

This guide will help you configure Gmail API to automatically fetch customer email replies.

## Step 1: Google Cloud Console Setup

### 1.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: `superhack-email-integration`
4. Click "Create"

### 1.2 Enable Gmail API
1. In Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Gmail API"
3. Click on "Gmail API" → Click "Enable"

### 1.3 Configure OAuth Consent Screen
1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" user type → Click "Create"
3. Fill in required information:
   - **App name**: `SuperHack Email Integration`
   - **User support email**: your email address
   - **Developer contact information**: your email address
4. Click "Save and Continue"
5. **Scopes**: Click "Add or Remove Scopes"
   - Search and add: `https://www.googleapis.com/auth/gmail.readonly`
   - Click "Update" → "Save and Continue"
6. **Test Users**: Add your Gmail address as a test user
7. Click "Save and Continue" → "Back to Dashboard"

### 1.4 Create OAuth 2.0 Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Configure OAuth client:
   - **Application type**: Desktop application
   - **Name**: `SuperHack Gmail Access`
   - Click "Create"
4. **IMPORTANT**: Download the JSON credentials file
5. Click "OK" to close the dialog

## Step 2: Install Credentials

1. **Rename** the downloaded file to `gmail-credentials.json`
2. **Move** it to the `bubble-backend` directory:
   ```
   SUPERHACK/bubble-backend/gmail-credentials.json
   ```

The file should look like this:
```json
{
  "installed": {
    "client_id": "123456789-abc.apps.googleusercontent.com",
    "project_id": "superhack-email-integration",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "GOCSPX-abcdefghijklmnopqrstuvwxyz",
    "redirect_uris": ["urn:ietf:wg:oauth:2.0:oob", "http://localhost"]
  }
}
```

## Step 3: Generate Access Tokens

1. **Open terminal** in the `bubble-backend` directory
2. **Run the token generator**:
   ```bash
   cd SUPERHACK/bubble-backend
   node generate-gmail-token.js
   ```

3. **Follow the prompts**:
   - Copy the authorization URL and open it in your browser
   - Sign in with your Gmail account
   - Grant permissions to your app
   - Copy the authorization code
   - Paste it back in the terminal

4. **Save the generated tokens** - you'll see output like:
   ```
   GMAIL_CLIENT_ID=123456789-abc.apps.googleusercontent.com
   GMAIL_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz
   GMAIL_REFRESH_TOKEN=1//0GWzt1234567890abcdefghijklmnop
   ```

## Step 4: Update Environment Variables

Add the generated tokens to your `.env` file in the `bubble-backend` directory:

```env
# Gmail API Configuration
GMAIL_CLIENT_ID=your_client_id_from_step_3
GMAIL_CLIENT_SECRET=your_client_secret_from_step_3
GMAIL_REFRESH_TOKEN=your_refresh_token_from_step_3

# Existing email configuration (keep these)
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=your_gmail@gmail.com
```

## Step 5: Test the Configuration

1. **Restart your backend server**:
   ```bash
   cd SUPERHACK/bubble-backend
   node index.js
   ```

2. **Check the startup logs** - you should see:
   ```
   📧 Gmail API service initialized successfully
   📧 Starting Gmail email sync service...
   ```

3. **Test Gmail API connection**:
   ```bash
   curl -X GET "http://localhost:3000/api/messages/test-gmail" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

4. **Check sync status**:
   ```bash
   curl -X GET "http://localhost:3000/api/messages/sync-status" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

## Step 6: Test Email Sync

1. **Create a test ticket** through the frontend
2. **Reply to the ticket email** from the customer's email address
3. **Wait up to 5 minutes** for automatic sync, or trigger manual sync:
   ```bash
   curl -X POST "http://localhost:3000/api/messages/sync-emails" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```
4. **Check the message panel** - the customer reply should appear

## Troubleshooting

### Common Issues:

**1. "Gmail API not configured" error**
- Verify all three environment variables are set in `.env`
- Restart the backend server
- Check for typos in environment variable names

**2. "Invalid credentials" error**
- Re-download credentials from Google Cloud Console
- Ensure the file is named exactly `gmail-credentials.json`
- Run `node generate-gmail-token.js` again

**3. "Access denied" error**
- Make sure your Gmail address is added as a test user in OAuth consent screen
- Verify Gmail API is enabled in Google Cloud Console

**4. "Quota exceeded" error**
- Gmail API has daily quotas - wait 24 hours or increase quotas in Google Cloud Console

### Security Notes:

- **Never commit** `gmail-credentials.json` or `.env` files to version control
- **Add to .gitignore**:
  ```
  gmail-credentials.json
  .env
  ```
- **Use environment variables** in production, not files

## Success Indicators

When everything is working correctly, you'll see:

1. ✅ **Startup logs**: "Gmail API service initialized successfully"
2. ✅ **Sync status**: `{"gmailConfigured": true}`
3. ✅ **Test connection**: Returns email address and message counts
4. ✅ **Automatic sync**: Customer replies appear in message panel within 5 minutes
5. ✅ **Manual sync**: Works without errors

## Next Steps

Once Gmail API is configured:

1. **Remove manual import workaround** (optional)
2. **Set up webhooks** for real-time email processing (advanced)
3. **Configure email filters** to improve reply detection
4. **Monitor Gmail API quotas** and usage

---

**Need Help?**

If you encounter issues, check:
1. Google Cloud Console audit logs
2. Backend server logs (`app.log`)
3. Browser network tab for API errors
4. Gmail API quotas in Google Cloud Console