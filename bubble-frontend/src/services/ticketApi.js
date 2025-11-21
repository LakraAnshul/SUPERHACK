import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

// Ticket API service
export const ticketApi = {
  // Create a new ticket
  createTicket: async (ticketData) => {
    try {
      const response = await axios.post('/tickets/create', ticketData);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create ticket'
      };
    }
  },

  // Get tickets for current user (technician)
  getMyTickets: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();

      if (params.status) queryParams.append('status', params.status);
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      const response = await axios.get(`/tickets/my-tickets?${queryParams}`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch tickets'
      };
    }
  },

  // Get all tickets (manager only)
  getAllTickets: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();

      if (params.status) queryParams.append('status', params.status);
      if (params.assignedTo) queryParams.append('assignedTo', params.assignedTo);
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      if (params.clientName) queryParams.append('clientName', params.clientName);
      if (params.priority) queryParams.append('priority', params.priority);

      const response = await axios.get(`/tickets/all?${queryParams}`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch tickets'
      };
    }
  },

  // Get single ticket by ID
  getTicket: async (ticketId) => {
    try {
      const response = await axios.get(`/tickets/${ticketId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch ticket'
      };
    }
  },

  // Upload log file and generate report
  uploadLog: async (ticketId, logFile) => {
    try {
      const formData = new FormData();
      formData.append('logFile', logFile);

      const response = await axios.post(
        `/tickets/${ticketId}/upload-log`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to upload log'
      };
    }
  },

  // Close a ticket
  closeTicket: async (ticketId, resolution) => {
    try {
      const response = await axios.put(`/tickets/${ticketId}/close`, {
        resolution
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to close ticket'
      };
    }
  },

  // Get dashboard statistics
  getDashboardStats: async () => {
    try {
      const response = await axios.get('/tickets/stats/dashboard');
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch dashboard stats'
      };
    }
  },

  // Legacy analyze endpoint (for backward compatibility)
  analyzeLog: async (rawLog, ticketId, clientName) => {
    try {
      const response = await axios.post(`${API_BASE_URL.replace('/api', '')}/analyze`, {
        rawLog,
        ticketId,
        clientName
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to analyze log'
      };
    }
  },

  // Legacy generate report endpoint (for backward compatibility)
  generateReport: async (rawLog, ticketId, clientName) => {
    try {
      const response = await axios.post(`${API_BASE_URL.replace('/api', '')}/generate-report`, {
        rawLog,
        ticketId,
        clientName
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to generate report'
      };
    }
  },

  // Download report as text file
  downloadReport: (report, ticketId, clientName) => {
    const blob = new Blob([report], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report-${ticketId}-${clientName.replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
};

export default ticketApi;
