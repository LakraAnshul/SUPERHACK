import { useState, useEffect, useCallback } from 'react';
import { messageApi } from '../services/messageApi';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export const useMessages = (ticketId = null) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadByTicket, setUnreadByTicket] = useState({});
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Fetch messages for a specific ticket
  const fetchTicketMessages = useCallback(async (id = ticketId) => {
    if (!id) return;

    setLoading(true);
    try {
      const result = await messageApi.getTicketMessages(id);
      if (result.success) {
        setMessages(result.messages);
        // Update unread count after fetching messages
        await fetchUnreadCount();
      } else {
        toast.error(result.error || 'Failed to load messages');
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  // Fetch unread message count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const result = await messageApi.getUnreadCount();
      if (result.success) {
        setUnreadCount(result.totalUnread);

        // Convert array to object for easier lookup
        const unreadMap = {};
        result.byTicket.forEach(item => {
          unreadMap[item.ticketId] = item.count;
        });
        setUnreadByTicket(unreadMap);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, []);

  // Send a new message
  const sendMessage = useCallback(async (messageData) => {
    setSending(true);
    try {
      const result = await messageApi.sendMessage(messageData);
      if (result.success) {
        // Refresh messages if we're viewing the same ticket
        if (messageData.ticketId === ticketId) {
          await fetchTicketMessages(ticketId);
        }
        // Update unread count
        await fetchUnreadCount();

        return { success: true };
      } else {
        toast.error(result.error || 'Failed to send message');
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      return { success: false, error: error.message };
    } finally {
      setSending(false);
    }
  }, [ticketId, fetchTicketMessages, fetchUnreadCount]);

  // Mark messages as read
  const markAsRead = useCallback(async (messageIds) => {
    try {
      const result = await messageApi.markAsRead(messageIds);
      if (result.success) {
        // Update local state
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            messageIds.includes(msg._id)
              ? { ...msg, isRead: true, readAt: new Date().toISOString() }
              : msg
          )
        );
        // Update unread count
        await fetchUnreadCount();
      }
      return result;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      return { success: false, error: error.message };
    }
  }, [fetchUnreadCount]);

  // Get unread count for a specific ticket
  const getTicketUnreadCount = useCallback((ticketIdOrNumber) => {
    return unreadByTicket[ticketIdOrNumber] || 0;
  }, [unreadByTicket]);

  // Auto-refresh unread count every 30 seconds
  useEffect(() => {
    fetchUnreadCount();

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch ticket messages when ticketId changes
  useEffect(() => {
    if (ticketId) {
      fetchTicketMessages(ticketId);
    }
  }, [ticketId, fetchTicketMessages]);

  // Helper to get latest message for a ticket
  const getLatestMessage = useCallback((messages) => {
    if (!messages || messages.length === 0) return null;
    return messages[messages.length - 1];
  }, []);

  // Helper to get message statistics
  const getMessageStats = useCallback(() => {
    const technicianMessages = messages.filter(msg => msg.from.type === 'technician').length;
    const customerMessages = messages.filter(msg => msg.from.type === 'customer').length;
    const emailMessages = messages.filter(msg => msg.isFromEmail).length;

    return {
      total: messages.length,
      technician: technicianMessages,
      customer: customerMessages,
      email: emailMessages,
      unread: unreadCount
    };
  }, [messages, unreadCount]);

  return {
    // State
    messages,
    unreadCount,
    unreadByTicket,
    loading,
    sending,

    // Actions
    sendMessage,
    markAsRead,
    fetchTicketMessages,
    fetchUnreadCount,

    // Helpers
    getTicketUnreadCount,
    getLatestMessage,
    getMessageStats
  };
};

export default useMessages;
