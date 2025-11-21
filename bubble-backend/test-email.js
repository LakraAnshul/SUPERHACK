const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('📧 Testing Email Configuration...\n');

// Display current configuration (without showing password)
console.log('Current Configuration:');
console.log('EMAIL_USER:', process.env.EMAIL_USER || 'NOT SET');
console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✓ SET (hidden)' : 'NOT SET');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM || 'NOT SET');
console.log('DISABLE_EMAIL:', process.env.DISABLE_EMAIL || 'false');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('\n');

async function testEmailConfiguration() {
  // Check if email is disabled
  if (process.env.DISABLE_EMAIL === 'true') {
    console.log('❌ Email is currently DISABLED');
    console.log('Remove DISABLE_EMAIL=true from .env file to enable email testing');
    return;
  }

  // Check if credentials are provided
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log('❌ Email credentials not configured');
    console.log('Please set EMAIL_USER and EMAIL_PASSWORD in your .env file');
    return;
  }

  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      secure: true,
      port: 465,
    });

    console.log('🔍 Testing SMTP connection...');

    // Test connection
    await transporter.verify();
    console.log('✅ SMTP connection successful!');

    // Send test email to yourself
    console.log('📨 Sending test email...');

    const testEmail = {
      from: {
        name: 'SuperHack Support Test',
        address: process.env.EMAIL_FROM || process.env.EMAIL_USER
      },
      to: process.env.EMAIL_USER, // Send to yourself for testing
      subject: '🧪 SuperHack Email Test - Success!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">✅ Email Configuration Test Successful!</h2>
          <p>Congratulations! Your email configuration is working correctly.</p>

          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Configuration Details:</h3>
            <p><strong>Email Service:</strong> Gmail</p>
            <p><strong>From Address:</strong> ${process.env.EMAIL_FROM || process.env.EMAIL_USER}</p>
            <p><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
          </div>

          <p style="color: #666; font-size: 14px;">
            This test email confirms that your SuperHack Time Tracker system can successfully send emails to customers when tickets are created or updated.
          </p>

          <hr style="margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">
            This is an automated test email from SuperHack Time Tracker Email Service.
          </p>
        </div>
      `,
      text: `
Email Configuration Test Successful!

Your SuperHack Time Tracker email system is working correctly.

Configuration:
- Service: Gmail
- From: ${process.env.EMAIL_FROM || process.env.EMAIL_USER}
- Test Time: ${new Date().toLocaleString()}

This confirms that automated emails will be sent to customers when tickets are created or updated.
      `
    };

    const result = await transporter.sendMail(testEmail);

    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    console.log('📬 Check your Gmail inbox for the test email');
    console.log('\n🎉 Email configuration is working perfectly!');
    console.log('💡 You can now remove DISABLE_EMAIL=true from .env to enable real emails');

  } catch (error) {
    console.log('❌ Email configuration failed:');
    console.log('Error:', error.message);
    console.log('\n🔧 Troubleshooting:');

    if (error.code === 'EAUTH') {
      console.log('• Authentication failed - check your app password');
      console.log('• Make sure 2FA is enabled on Gmail');
      console.log('• Verify the 16-character app password (no spaces)');
      console.log('• Ensure EMAIL_USER matches your Gmail address');
    } else if (error.code === 'ENOTFOUND') {
      console.log('• Network connection issue');
      console.log('• Check your internet connection');
    } else if (error.code === 'ECONNECTION') {
      console.log('• Connection timeout');
      console.log('• Check firewall/network settings');
    } else {
      console.log('• Check your Gmail account settings');
      console.log('• Verify 2FA and app password are set up correctly');
    }

    console.log('\n📋 Expected .env format:');
    console.log('EMAIL_USER=youremail@gmail.com');
    console.log('EMAIL_PASSWORD=abcdefghijklmnop');
    console.log('EMAIL_FROM=youremail@gmail.com');
  }
}

// Run the test
testEmailConfiguration().catch(console.error);
