const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
require("dotenv").config();

class GmailSetupVerifier {
  constructor() {
    this.results = {
      credentialsFile: false,
      envVariables: false,
      gmailConnection: false,
      errors: [],
      warnings: [],
      suggestions: [],
    };
  }

  async verify() {
    console.log("🔍 Gmail API Setup Verification");
    console.log("===============================\n");

    await this.checkCredentialsFile();
    await this.checkEnvironmentVariables();
    await this.checkGmailConnection();
    this.generateReport();

    return this.results;
  }

  async checkCredentialsFile() {
    console.log("📁 Checking Gmail credentials file...");

    const credentialsPath = "./gmail-credentials.json";

    try {
      if (!fs.existsSync(credentialsPath)) {
        this.results.errors.push("Gmail credentials file not found");
        console.log("❌ gmail-credentials.json not found");
        console.log("💡 Download from Google Cloud Console and place in bubble-backend/");
        return;
      }

      // Check if file is readable
      const credentials = JSON.parse(fs.readFileSync(credentialsPath));
      const clientConfig = credentials.installed || credentials.web;

      if (!clientConfig) {
        this.results.errors.push("Invalid credentials file format");
        console.log("❌ Invalid credentials format");
        console.log("💡 File should contain 'installed' or 'web' section");
        return;
      }

      if (!clientConfig.client_id || !clientConfig.client_secret) {
        this.results.errors.push("Missing client_id or client_secret");
        console.log("❌ Missing client_id or client_secret");
        console.log("💡 Re-download credentials from Google Cloud Console");
        return;
      }

      this.results.credentialsFile = true;
      console.log("✅ Credentials file found and valid");
      console.log(`   Client ID: ${clientConfig.client_id.substring(0, 20)}...`);

    } catch (error) {
      this.results.errors.push(`Credentials file error: ${error.message}`);
      console.log("❌ Error reading credentials file:", error.message);

      if (error.message.includes("JSON")) {
        console.log("💡 File appears to be corrupted - re-download from Google Cloud");
      }
    }
  }

  async checkEnvironmentVariables() {
    console.log("\n🔧 Checking environment variables...");

    const requiredVars = [
      "GMAIL_CLIENT_ID",
      "GMAIL_CLIENT_SECRET",
      "GMAIL_REFRESH_TOKEN"
    ];

    const missing = [];
    const present = [];

    for (const varName of requiredVars) {
      if (process.env[varName]) {
        present.push(varName);
        const value = process.env[varName];
        const preview = varName === "GMAIL_REFRESH_TOKEN"
          ? `${value.substring(0, 20)}...`
          : `${value.substring(0, 30)}...`;
        console.log(`✅ ${varName}: ${preview}`);
      } else {
        missing.push(varName);
        console.log(`❌ ${varName}: Not set`);
      }
    }

    if (missing.length === 0) {
      this.results.envVariables = true;
      console.log("✅ All required environment variables are set");
    } else {
      this.results.errors.push(`Missing environment variables: ${missing.join(", ")}`);
      console.log("💡 Run: node generate-gmail-token.js to get these values");
      console.log("💡 Add them to your .env file in bubble-backend/");
    }

    // Check for common issues
    if (present.length > 0 && missing.length > 0) {
      this.results.warnings.push("Partial configuration detected");
      console.log("⚠️  Partial configuration - some vars missing");
    }
  }

  async checkGmailConnection() {
    console.log("\n📧 Testing Gmail API connection...");

    if (!this.results.envVariables) {
      console.log("⏭️  Skipping Gmail test (environment variables not set)");
      return;
    }

    try {
      // Create OAuth2 client
      const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        "urn:ietf:wg:oauth:2.0:oob"
      );

      // Set refresh token
      oauth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      });

      // Create Gmail client
      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      // Test connection
      const profile = await gmail.users.getProfile({ userId: "me" });

      this.results.gmailConnection = true;
      console.log("✅ Gmail API connection successful");
      console.log(`📧 Connected to: ${profile.data.emailAddress}`);
      console.log(`📊 Total messages: ${profile.data.messagesTotal.toLocaleString()}`);
      console.log(`🧵 Total threads: ${profile.data.threadsTotal.toLocaleString()}`);

      // Test message listing
      try {
        const messages = await gmail.users.messages.list({
          userId: "me",
          maxResults: 1,
        });
        console.log("✅ Message listing test successful");
      } catch (listError) {
        this.results.warnings.push("Message listing test failed");
        console.log("⚠️  Message listing test failed:", listError.message);
      }

    } catch (error) {
      this.results.errors.push(`Gmail connection failed: ${error.message}`);
      console.log("❌ Gmail API connection failed:", error.message);

      if (error.message.includes("invalid_grant")) {
        console.log("💡 Refresh token expired - run: node generate-gmail-token.js");
      } else if (error.message.includes("invalid_client")) {
        console.log("💡 Invalid client credentials - check GMAIL_CLIENT_ID/SECRET");
      } else if (error.message.includes("access_denied")) {
        console.log("💡 Access denied - check OAuth consent screen and scopes");
      } else if (error.message.includes("quota")) {
        console.log("💡 API quota exceeded - check Google Cloud Console quotas");
      } else {
        console.log("💡 Check Google Cloud Console for API status and permissions");
      }
    }
  }

  generateReport() {
    console.log("\n📋 Setup Verification Summary");
    console.log("=============================");

    const allGood = this.results.credentialsFile &&
                   this.results.envVariables &&
                   this.results.gmailConnection;

    if (allGood) {
      console.log("🎉 Gmail API setup is complete and working!");
      console.log("✅ Automatic email sync will work");
      console.log("✅ Customer replies will appear in message panel");
      console.log("✅ No manual import needed");

      console.log("\n🚀 Next Steps:");
      console.log("1. Restart your backend server");
      console.log("2. Check logs for 'Gmail API service initialized successfully'");
      console.log("3. Create a test ticket and reply to test email sync");

    } else {
      console.log("❌ Gmail API setup is incomplete");

      if (this.results.errors.length > 0) {
        console.log("\n🔥 Errors that need to be fixed:");
        this.results.errors.forEach((error, i) => {
          console.log(`   ${i + 1}. ${error}`);
        });
      }

      if (this.results.warnings.length > 0) {
        console.log("\n⚠️  Warnings:");
        this.results.warnings.forEach((warning, i) => {
          console.log(`   ${i + 1}. ${warning}`);
        });
      }

      console.log("\n🛠️  Recommended Actions:");

      if (!this.results.credentialsFile) {
        console.log("1. 🌐 Go to Google Cloud Console");
        console.log("2. 📥 Download OAuth 2.0 credentials");
        console.log("3. 📁 Save as gmail-credentials.json in bubble-backend/");
      }

      if (!this.results.envVariables) {
        console.log("4. 🔑 Run: node generate-gmail-token.js");
        console.log("5. 📝 Add generated tokens to .env file");
      }

      if (!this.results.gmailConnection) {
        console.log("6. 🔄 Restart server and test again");
        console.log("7. 🧪 Run: node verify-gmail-setup.js");
      }
    }

    console.log("\n📖 For detailed setup instructions, see: GMAIL_SETUP.md");

    // Security reminders
    console.log("\n🔒 Security Reminders:");
    console.log("- Never commit gmail-credentials.json to version control");
    console.log("- Never commit .env files to version control");
    console.log("- Add both to .gitignore");

    return allGood;
  }
}

// Run verification if script is called directly
if (require.main === module) {
  async function main() {
    const verifier = new GmailSetupVerifier();

    try {
      const success = await verifier.verify();
      process.exit(success ? 0 : 1);
    } catch (error) {
      console.error("\n💥 Verification script crashed:", error.message);
      console.log("💡 This might indicate a serious configuration issue");
      console.log("📖 Check GMAIL_SETUP.md for troubleshooting steps");
      process.exit(1);
    }
  }

  main();
}

module.exports = GmailSetupVerifier;
