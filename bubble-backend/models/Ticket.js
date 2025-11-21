const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  clientName: {
    type: String,
    required: true,
    trim: true
  },
  clientEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed'],
    default: 'open'
  },
  category: {
    type: String,
    enum: ['hardware', 'software', 'network', 'security', 'other'],
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  rawLog: {
    type: String,
    default: null
  },
  logFileName: {
    type: String,
    default: null
  },
  analyzedActivities: [{
    description: {
      type: String,
      required: true
    },
    timeMinutes: {
      type: Number,
      required: true,
      min: 0
    },
    isBillable: {
      type: Boolean,
      default: true
    }
  }],
  totalBillableTime: {
    type: Number,
    default: 0,
    min: 0
  },
  generatedReport: {
    type: String,
    default: null
  },
  resolution: {
    type: String,
    default: null
  },
  customerSatisfaction: {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    feedback: {
      type: String,
      default: null
    }
  },
  billableRate: {
    type: Number,
    default: 75, // Default hourly rate
    min: 0
  },
  totalCost: {
    type: Number,
    default: 0,
    min: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  closedAt: {
    type: Date,
    default: null
  },
  resolutionTime: {
    type: Number, // in minutes
    default: null
  }
}, {
  timestamps: true
});

// Calculate total cost before saving
ticketSchema.pre('save', function(next) {
  if (this.totalBillableTime && this.billableRate) {
    const hours = this.totalBillableTime / 60;
    this.totalCost = Number((hours * this.billableRate).toFixed(2));
  }
  next();
});

// Calculate resolution time when ticket is closed
ticketSchema.pre('save', function(next) {
  if (this.status === 'closed' && !this.closedAt) {
    this.closedAt = new Date();
    this.resolutionTime = Math.floor((this.closedAt - this.createdAt) / (1000 * 60)); // in minutes
  }
  next();
});

// Index for better query performance
ticketSchema.index({ assignedTo: 1, status: 1 });
ticketSchema.index({ clientName: 1 });
ticketSchema.index({ ticketId: 1 });
ticketSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Ticket', ticketSchema);
