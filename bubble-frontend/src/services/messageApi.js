import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create axios instance with interceptors
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

export const messageApi = {
  // Get all messages for a specific ticket
  async getTicketMessages(ticketId) {
    try {
      const response = await api.get(`/api/messages/ticket/${ticketId}`);
      return {
        success: true,
        messages: response.messages,
        count: response.count
      };
    } catch (error) {
      console.error('Error fetching ticket messages:', error);
      return {
        success: false,
        error: error.error || 'Failed to fetch messages'
      };
    }
  },

  // Send a new message
  async sendMessage(messageData) {
    try {
      const response = await api.post('/api/messages/send', messageData);
      return {
        success: true,
        data: response.data,
        message: response.message
      };
    } catch (error) {
      console.error('Error sending message:', error);
      return {
        success: false,
        error: error.error || 'Failed to send message'
      };
    }
  },

  // Get unread message count
  async getUnreadCount() {
    try {
      const response = await api.get('/api/messages/unread/count');
      return {
        success: true,
        totalUnread: response.totalUnread,
        byTicket: response.byTicket
      };
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return {
        success: false,
        error: error.error || 'Failed to fetch unread count'
      };
    }
  },

  // Mark messages as read
  async markAsRead(messageIds) {
    try {
      const response = await api.put('/api/messages/mark-read', {
        messageIds
      });
      return {
        success: true,
        modifiedCount: response.modifiedCount,
        message: response.message
      };
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return {
        success: false,
        error: error.error || 'Failed to mark messages as read'
      };
    }
  },

  // Get conversation history for a ticket
  async getConversation(ticketId, page = 1, limit = 50) {
    try {
      const response = await api.get(`/api/messages/conversation/${ticketId}`, {
        params: { page, limit }
      });
      return {
        success: true,
        messages: response.messages,
        pagination: response.pagination
      };
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return {
        success: false,
        error: error.error || 'Failed to fetch conversation'
      };
    }
  },

  // Get message statistics
  async getMessageStats(filters = {}) {
    try {
      const response = await api.get('/api/messages/stats', {
        params: filters
      });
      return {
        success: true,
        stats: response.stats
      };
    } catch (error) {
      console.error('Error fetching message stats:', error);
      return {
        success: false,
        error: error.error || 'Failed to fetch message statistics'
      };
    }
  }
};
