const { google } = require("googleapis");
const fs = require("fs");
const readline = require("readline");
const path = require("path");

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
const CREDENTIALS_PATH = "./gmail-credentials.json";

async function generateToken() {
  console.log("🚀 Gmail API Token Generator");
  console.log("============================");
  console.log(
    "This tool will help you set up Gmail API access for automatic email sync.\n",
  );

  try {
    // Check if credentials file exists
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      console.error("❌ Gmail credentials file not found!");
      console.log("\n📋 Setup Instructions:");
      console.log("======================");
      console.log(
        "1. 🌐 Go to Google Cloud Console: https://console.cloud.google.com/",
      );
      console.log("2. 📁 Create a new project or select existing project");
      console.log("3. 🔧 Enable Gmail API in APIs & Services > Library");
      console.log("4. 🔑 Create OAuth 2.0 credentials:");
      console.log("   - Go to APIs & Services > Credentials");
      console.log('   - Click "Create Credentials" > "OAuth 2.0 Client IDs"');
      console.log('   - Choose "Desktop application"');
      console.log("   - Download the JSON file");
      console.log('5. 📁 Rename file to "gmail-credentials.json"');
      console.log("6. 📂 Place it in the bubble-backend directory");
      console.log("\n📖 For detailed instructions, see: GMAIL_SETUP.md");
      console.log("\n❓ Current directory:", process.cwd());
      console.log("❓ Looking for file:", path.resolve(CREDENTIALS_PATH));
      process.exit(1);
    }

    // Load and validate credentials
    console.log("✅ Found credentials file!");
    let credentials;
    try {
      credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    } catch (error) {
      console.error("❌ Failed to parse credentials file!");
      console.log("💡 Ensure the file is valid JSON format");
      console.log("💡 Re-download from Google Cloud Console if needed");
      process.exit(1);
    }

    const clientConfig = credentials.installed || credentials.web;

    if (!clientConfig) {
      console.error("❌ Invalid credentials format!");
      console.log('💡 File should contain "installed" or "web" section');
      console.log(
        "💡 Make sure you downloaded OAuth 2.0 credentials (not API key)",
      );
      process.exit(1);
    }

    if (!clientConfig.client_id || !clientConfig.client_secret) {
      console.error("❌ Missing client_id or client_secret!");
      console.log("💡 Re-download credentials from Google Cloud Console");
      process.exit(1);
    }

    const { client_secret, client_id, redirect_uris } = clientConfig;

    const oauth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris ? redirect_uris[0] : "urn:ietf:wg:oauth:2.0:oob",
    );

    // Generate auth URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      prompt: "consent", // Force consent to get refresh token
    });

    console.log("✅ Credentials file loaded successfully");
    console.log("✅ OAuth client configured");
    console.log(`✅ Client ID: ${clientConfig.client_id.substring(0, 20)}...`);
    console.log("\n🔗 STEP 1: Browser Authorization");
    console.log("================================");
    console.log("📌 Copy this URL and open it in your browser:");
    console.log("");
    console.log("\x1b[36m%s\x1b[0m", authUrl);
    console.log("");
    console.log("📋 STEP 2: Complete Authorization");
    console.log("=================================");
    console.log("1. 🌐 Sign in with your Gmail account");
    console.log("2. ✅ Grant permissions to your app");
    console.log("3. 📋 Copy the authorization code you receive");
    console.log("4. 📝 Paste it below and press Enter");

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question("\n🔑 Enter authorization code: ", async (code) => {
      try {
        console.log("\n⏳ Exchanging code for tokens...");
        const { tokens } = await oauth2Client.getToken(code.trim());

        if (!tokens.refresh_token) {
          console.log("\n⚠️  Warning: No refresh token received!");
          console.log(
            "💡 This might happen if you've authorized this app before",
          );
          console.log("💡 Try revoking access and re-authorizing:");
          console.log("   https://myaccount.google.com/permissions");
          console.log("\n🔄 Continuing with available tokens...");
        }

        console.log("\n🎉 Success! Tokens generated successfully!");
        console.log("\n📋 Environment Variables for .env file:");
        console.log("========================================");
        console.log(
          "# Add these to your .env file in bubble-backend directory:",
        );
        console.log("");
        console.log(`GMAIL_CLIENT_ID=${client_id}`);
        console.log(`GMAIL_CLIENT_SECRET=${client_secret}`);
        if (tokens.refresh_token) {
          console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
        } else {
          console.log(
            `# GMAIL_REFRESH_TOKEN=<run this script again if needed>`,
          );
        }
        console.log("");
        console.log("========================================");

        // Test the token
        if (tokens.refresh_token) {
          console.log("\n🔍 Testing token...");
          oauth2Client.setCredentials(tokens);
          const gmail = google.gmail({ version: "v1", auth: oauth2Client });

          try {
            const profile = await gmail.users.getProfile({ userId: "me" });
            console.log("✅ Token verification successful!");
            console.log(`📧 Connected Gmail: ${profile.data.emailAddress}`);
            console.log(
              `📊 Total messages: ${profile.data.messagesTotal.toLocaleString()}`,
            );
            console.log(
              `📨 Total threads: ${profile.data.threadsTotal.toLocaleString()}`,
            );
          } catch (testError) {
            console.log(
              "⚠️  Token generated but verification failed:",
              testError.message,
            );
            console.log(
              "💡 This is usually temporary - the token should still work",
            );
          }
        }

        console.log("\n🚀 Next Steps:");
        console.log("==============");
        console.log(
          "1. 📝 Copy the environment variables above to your .env file",
        );
        console.log("2. 🔄 Restart your backend server:");
        console.log("   cd bubble-backend && node index.js");
        console.log("3. 🧪 Test configuration:");
        console.log(
          '   - Check startup logs for "Gmail API service initialized"',
        );
        console.log(
          "   - Visit http://localhost:3000/api/messages/sync-status",
        );
        console.log("4. 📧 Test email sync:");
        console.log("   - Create a ticket");
        console.log("   - Reply from customer email");
        console.log("   - Wait 5 minutes or trigger manual sync");
      } catch (error) {
        console.error("\n❌ Token generation failed!");
        console.error("Error:", error.message);

        if (error.message.includes("invalid_grant")) {
          console.log("\n💡 Common fixes:");
          console.log(
            "- ✂️  Copy the complete authorization code (no extra spaces)",
          );
          console.log(
            "- ⏰ Authorization codes expire quickly - get a fresh one",
          );
          console.log("- 🔄 Try the authorization URL again");
          console.log(
            "- 🚫 Revoke previous access: https://myaccount.google.com/permissions",
          );
        } else if (error.message.includes("invalid_client")) {
          console.log("\n💡 Credential issues:");
          console.log("- 📁 Re-download credentials from Google Cloud Console");
          console.log("- ✅ Ensure Gmail API is enabled");
          console.log("- 🔧 Check OAuth consent screen configuration");
        } else {
          console.log("\n💡 Try these steps:");
          console.log("- 🔄 Run this script again");
          console.log("- 📋 Check Google Cloud Console for any issues");
          console.log("- 🌐 Verify internet connection");
        }

        console.log("\n📖 For detailed help, see: GMAIL_SETUP.md");
      }
      rl.close();
    });
  } catch (error) {
    console.error("\n❌ Setup failed:", error.message);

    if (error.code === "ENOENT") {
      console.log("\n💡 Credential file missing:");
      console.log("- 📁 Download from Google Cloud Console");
      console.log("- 📂 Place in bubble-backend directory");
      console.log('- 🏷️  Rename to "gmail-credentials.json"');
    } else if (error.message.includes("JSON")) {
      console.log("\n💡 Credential file corrupted:");
      console.log("- 🔄 Re-download from Google Cloud Console");
      console.log("- ✅ Ensure file is complete and valid JSON");
    } else {
      console.log("\n💡 Unexpected error occurred");
      console.log("📖 Check GMAIL_SETUP.md for troubleshooting");
    }

    console.log("\n🆘 Need help? Check:");
    console.log("- 📖 GMAIL_SETUP.md for detailed instructions");
    console.log("- 🌐 Google Cloud Console for API status");
    console.log("- 📂 File permissions and locations");

    process.exit(1);
  }
}

// Add helpful startup information
console.log("Current working directory:", process.cwd());
console.log("Looking for credentials at:", path.resolve(CREDENTIALS_PATH));
console.log("");
generateToken().catch(console.error);
