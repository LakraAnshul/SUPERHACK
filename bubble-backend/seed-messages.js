const mongoose = require('mongoose');
const Message = require('./models/Message');
const Ticket = require('./models/Ticket');
const User = require('./models/User');
require('dotenv').config();

console.log('📧 Message Database Seeder');
console.log('==========================');

const sampleMessages = [
  {
    type: 'ticket_creation',
    content: 'Your support ticket has been created and assigned. Our technical team is now working on resolving your issue.',
    isFromEmail: false,
    status: 'sent'
  },
  {
    type: 'customer_reply',
    content: 'Thank you for creating the ticket. I am still experiencing the same issue with my computer not connecting to the network. The error message says "Network adapter not found".',
    isFromEmail: true,
    status: 'delivered',
    fromCustomer: true
  },
  {
    type: 'technician_response',
    content: 'I understand you\'re having network connectivity issues. Let me guide you through some troubleshooting steps:\n\n1. First, let\'s check if your network adapter is properly recognized\n2. Press Windows + R, type "devmgmt.msc" and press Enter\n3. Look for "Network adapters" section\n\nCan you let me know what you see there?',
    isFromEmail: false,
    status: 'sent'
  },
  {
    type: 'customer_reply',
    content: 'I checked the Device Manager and I see "Network adapters" but there\'s a yellow warning triangle next to "Ethernet Controller". It says "The drivers for this device are not installed (Code 28)".',
    isFromEmail: true,
    status: 'delivered',
    fromCustomer: true
  },
  {
    type: 'technician_response',
    content: 'Perfect! That\'s exactly what I needed to know. The issue is a missing network driver. Here\'s how we\'ll fix this:\n\n1. I\'m sending you a driver download link via email\n2. Download and install the driver\n3. Restart your computer\n4. Test your network connection\n\nDriver link: [Network Driver v2.1.5]\n\nLet me know once you\'ve completed these steps!',
    isFromEmail: false,
    status: 'sent'
  },
  {
    type: 'customer_reply',
    content: 'Great! I downloaded and installed the driver you sent. After restarting, my computer is now connected to the network. The internet is working perfectly. Thank you so much for your help!',
    isFromEmail: true,
    status: 'delivered',
    fromCustomer: true
  },
  {
    type: 'technician_response',
    content: 'Excellent news! I\'m glad we got your network connectivity resolved. Your issue has been marked as resolved.\n\nFor future reference:\n- Keep your drivers updated\n- Windows Update usually handles this automatically\n- Contact us if you experience any other issues\n\nHave a great day!',
    isFromEmail: false,
    status: 'sent'
  }
];

async function connectDatabase() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/superhack-timetracker';
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

async function seedMessages() {
  try {
    console.log('\n🔍 Looking for existing tickets and users...');

    // Get first technician and first ticket
    const technician = await User.findOne({ role: 'technician' });
    const ticket = await Ticket.findOne();

    if (!technician) {
      console.log('❌ No technician found. Please create a user with role "technician" first.');
      return;
    }

    if (!ticket) {
      console.log('❌ No tickets found. Please create a ticket first.');
      return;
    }

    console.log(`📋 Found ticket: ${ticket.ticketId} - ${ticket.title}`);
    console.log(`👤 Found technician: ${technician.name} (${technician.email})`);
    console.log(`👤 Customer: ${ticket.clientName} (${ticket.clientEmail})`);

    // Clear existing messages for this ticket
    await Message.deleteMany({ ticketId: ticket._id });
    console.log('🧹 Cleared existing messages for this ticket');

    console.log('\n📧 Creating sample messages...');

    let messageCount = 0;
    let baseTime = new Date(ticket.createdAt);

    for (let i = 0; i < sampleMessages.length; i++) {
      const sample = sampleMessages[i];

      // Determine sender and receiver
      let fromUser, toUser;
      if (sample.fromCustomer) {
        fromUser = {
          email: ticket.clientEmail,
          name: ticket.clientName,
          type: 'customer'
        };
        toUser = {
          email: technician.email,
          name: technician.name,
          type: 'technician'
        };
      } else {
        fromUser = {
          email: technician.email,
          name: technician.name,
          type: 'technician'
        };
        toUser = {
          email: ticket.clientEmail,
          name: ticket.clientName,
          type: 'customer'
        };
      }

      // Create message time (spread messages over time)
      const messageTime = new Date(baseTime.getTime() + (i * 2 * 60 * 60 * 1000)); // 2 hours apart

      const message = new Message({
        ticketId: ticket._id,
        messageId: `seed-${ticket.ticketId}-${Date.now()}-${i}`,
        from: fromUser,
        to: toUser,
        subject: sample.fromCustomer
          ? `Re: Support Ticket ${ticket.ticketId} - ${ticket.title}`
          : `Support Ticket ${ticket.ticketId} - ${ticket.title}`,
        content: sample.content,
        isFromEmail: sample.isFromEmail,
        emailThreadId: `thread-${ticket.ticketId}@superhack-timetracker.com`,
        status: sample.status,
        isRead: false,
        createdAt: messageTime,
        updatedAt: messageTime
      });

      await message.save();
      messageCount++;

      const icon = sample.fromCustomer ? '👤' : '👨‍💻';
      const direction = sample.fromCustomer ? '→' : '←';
      console.log(`${icon} ${direction} ${sample.type}: "${sample.content.substring(0, 50)}..."`);
    }

    console.log(`\n✅ Successfully created ${messageCount} sample messages`);
    console.log('\n🎯 Test Instructions:');
    console.log('1. Start your frontend: npm run dev');
    console.log('2. Login to your account');
    console.log('3. Go to Messages Test page: /messages-test');
    console.log(`4. Click "Open Messages" on ticket: ${ticket.ticketId}`);
    console.log('5. You should see the conversation history!');

  } catch (error) {
    console.error('❌ Error seeding messages:', error.message);
  }
}

async function createSampleInternalNotes() {
  try {
    const tickets = await Ticket.find().limit(2);
    const technician = await User.findOne({ role: 'technician' });

    if (tickets.length === 0 || !technician) {
      console.log('⚠️ Skipping internal notes - insufficient data');
      return;
    }

    console.log('\n📝 Adding internal notes...');

    for (const ticket of tickets) {
      const internalNote = new Message({
        ticketId: ticket._id,
        messageId: `internal-${ticket.ticketId}-${Date.now()}`,
        from: {
          email: technician.email,
          name: technician.name,
          type: 'technician'
        },
        to: {
          email: technician.email,
          name: technician.name,
          type: 'technician'
        },
        subject: `Internal Note - ${ticket.ticketId}`,
        content: `Internal note for ticket ${ticket.ticketId}:\n\nCustomer seems to have driver issues. Network adapter not detected. Recommended driver update solution. Monitor for similar issues from this client.`,
        isFromEmail: false,
        emailThreadId: `thread-${ticket.ticketId}@superhack-timetracker.com`,
        status: 'sent',
        isRead: false,
        createdAt: new Date()
      });

      await internalNote.save();
      console.log(`📝 Created internal note for ${ticket.ticketId}`);
    }

  } catch (error) {
    console.error('❌ Error creating internal notes:', error.message);
  }
}

async function displayStats() {
  try {
    console.log('\n📊 Database Statistics:');
    const messageCount = await Message.countDocuments();
    const ticketCount = await Ticket.countDocuments();
    const userCount = await User.countDocuments();

    console.log(`   • Total Messages: ${messageCount}`);
    console.log(`   • Total Tickets: ${ticketCount}`);
    console.log(`   • Total Users: ${userCount}`);

    // Show messages per ticket
    const messagesByTicket = await Message.aggregate([
      {
        $group: {
          _id: '$ticketId',
          count: { $sum: 1 },
          lastMessage: { $max: '$createdAt' }
        }
      },
      {
        $lookup: {
          from: 'tickets',
          localField: '_id',
          foreignField: '_id',
          as: 'ticket'
        }
      }
    ]);

    if (messagesByTicket.length > 0) {
      console.log('\n💬 Messages per Ticket:');
      for (const item of messagesByTicket) {
        const ticket = item.ticket[0];
        if (ticket) {
          console.log(`   • ${ticket.ticketId}: ${item.count} messages`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error getting stats:', error.message);
  }
}

async function main() {
  await connectDatabase();

  console.log('\n🌱 Starting message seeding process...');

  // Seed main conversation
  await seedMessages();

  // Add some internal notes
  await createSampleInternalNotes();

  // Display final stats
  await displayStats();

  console.log('\n🎉 Message seeding completed!');
  console.log('\n🚀 Your message panel is ready to test!');

  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error.message);
  process.exit(1);
});

// Run the seeder
main().catch(console.error);
