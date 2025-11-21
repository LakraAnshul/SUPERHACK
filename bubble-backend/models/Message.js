const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true
  },
  messageId: {
    type: String,
    required: true,
    unique: true
  },
  from: {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['technician', 'customer'],
      required: true
    }
  },
  to: {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['technician', 'customer'],
      required: true
    }
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  isFromEmail: {
    type: Boolean,
    default: false
  },
  emailThreadId: {
    type: String,
    default: null
  },
  inReplyTo: {
    type: String,
    default: null
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    data: Buffer
  }],
  status: {
    type: String,
    enum: ['sent', 'delivered', 'failed', 'pending'],
    default: 'sent'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    emailProvider: String
  }
}, {
  timestamps: true
});

// Index for better query performance
messageSchema.index({ ticketId: 1, createdAt: -1 });
messageSchema.index({ 'from.email': 1 });
messageSchema.index({ 'to.email': 1 });
messageSchema.index({ messageId: 1 });
messageSchema.index({ emailThreadId: 1 });

// Virtual for formatted date
messageSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleString();
});

// Method to mark message as read
messageSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Message', messageSchema);
