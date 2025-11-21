import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { messageApi } from "../services/messageApi";
import MessagePanel from "../components/MessagePanel";
import {
  MessageCircle,
  Plus,
  Inbox,
  Send,
  User,
  Mail,
  Clock,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import toast from "react-hot-toast";

const MessagesTest = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showMessagePanel, setShowMessagePanel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messageStats, setMessageStats] = useState({});
  const [syncing, setSyncing] = useState(false);
  const [gmailStatus, setGmailStatus] = useState(null);
  const [showImportForm, setShowImportForm] = useState(false);
  const [importForm, setImportForm] = useState({
    ticketId: "",
    fromEmail: "",
    subject: "",
    content: "",
  });
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchTickets();
    fetchMessageStats();
    checkGmailStatus();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      // You can replace this with actual API call to get tickets
      const response = await fetch(
        "http://localhost:3000/api/tickets/my-tickets",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
      } else {
        // Mock data for testing if API fails
        setTickets([
          {
            _id: "1",
            ticketId: "T-2024-001",
            title: "Email Integration Test",
            clientName: "John Doe",
            clientEmail: "john.doe@example.com",
            status: "open",
            priority: "medium",
            createdAt: new Date().toISOString(),
          },
          {
            _id: "2",
            ticketId: "T-2024-002",
            title: "Chat Panel Demo",
            clientName: "Jane Smith",
            clientEmail: "jane.smith@example.com",
            status: "in-progress",
            priority: "high",
            createdAt: new Date(Date.now() - 86400000).toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const checkGmailStatus = async () => {
    try {
      const response = await fetch(
        "http://localhost:3000/api/messages/sync-status",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setGmailStatus(data);
      }
    } catch (error) {
      console.error("Error checking Gmail status:", error);
    }
  };

  const syncEmails = async () => {
    setSyncing(true);
    try {
      const response = await fetch(
        "http://localhost:3000/api/messages/sync-emails",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      const result = await response.json();
      if (result.success) {
        toast.success(
          `Synced ${result.data.processed} new emails out of ${result.data.total} found`,
        );
        fetchMessageStats(); // Refresh stats
        // Refresh tickets to update any reopened ones
        fetchTickets();
      } else {
        toast.error(result.error || "Failed to sync emails");
      }
    } catch (error) {
      console.error("Error syncing emails:", error);
      toast.error("Failed to sync emails");
    } finally {
      setSyncing(false);
    }
  };

  const fetchMessageStats = async () => {
    try {
      const result = await messageApi.getUnreadCount();
      if (result.success) {
        setMessageStats(result);
      }
    } catch (error) {
      console.error("Error fetching message stats:", error);
    }
  };

  const openMessagePanel = (ticket) => {
    setSelectedTicket(ticket);
    setShowMessagePanel(true);
  };

  const createSampleMessage = async (ticketId) => {
    try {
      const result = await messageApi.sendMessage({
        ticketId: ticketId,
        content: `This is a test message for ticket ${ticketId}. Testing the email integration and message panel functionality.`,
        isInternal: false,
      });

      if (result.success) {
        toast.success("Test message sent!");
        fetchMessageStats();
      } else {
        toast.error(result.error || "Failed to send test message");
      }
    } catch (error) {
      console.error("Error sending test message:", error);
      toast.error("Failed to send test message");
    }
  };

  const importEmailReply = async () => {
    if (
      !importForm.ticketId ||
      !importForm.fromEmail ||
      !importForm.subject ||
      !importForm.content
    ) {
      alert("Please fill in all fields");
      return;
    }

    setImporting(true);
    try {
      const response = await fetch("/api/messages/import-email-reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(importForm),
      });

      const result = await response.json();

      if (result.success) {
        alert(
          `Email reply imported successfully! ${result.data.ticketReopened ? "Ticket has been reopened." : ""}`,
        );
        setImportForm({
          ticketId: "",
          fromEmail: "",
          subject: "",
          content: "",
        });
        setShowImportForm(false);
        fetchTickets(); // Refresh tickets
      } else {
        alert(`Failed to import email: ${result.error}`);
      }
    } catch (error) {
      console.error("Import error:", error);
      alert("Failed to import email reply");
    } finally {
      setImporting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "open":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "in-progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "resolved":
        return "bg-green-100 text-green-800 border-green-200";
      case "closed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "open":
        return <AlertCircle className="h-4 w-4" />;
      case "in-progress":
        return <Clock className="h-4 w-4" />;
      case "resolved":
      case "closed":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <MessageCircle className="h-8 w-8 text-blue-600 mr-3" />
              Messages Test Panel
            </h1>
            <p className="text-gray-600 mt-1">
              Test the email integration and message panel functionality
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-sm text-blue-600 font-medium">
                Total Unread: {messageStats.totalUnread || 0}
              </p>
              <p className="text-xs text-blue-500">Across all tickets</p>
            </div>

            <div className="text-right">
              <div
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                  gmailStatus?.gmailConfigured
                    ? "bg-green-50 text-green-700"
                    : "bg-yellow-50 text-yellow-700"
                }`}
              >
                {gmailStatus?.gmailConfigured ? (
                  <Wifi className="h-4 w-4" />
                ) : (
                  <WifiOff className="h-4 w-4" />
                )}
                <span className="text-sm font-medium">
                  {gmailStatus?.gmailConfigured
                    ? "Gmail Connected"
                    : "Gmail Not Configured"}
                </span>
              </div>

              {gmailStatus?.gmailConfigured && (
                <button
                  onClick={syncEmails}
                  disabled={syncing}
                  className="mt-2 inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`}
                  />
                  {syncing ? "Syncing..." : "Sync Emails"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <h2 className="text-lg font-semibold text-blue-900 mb-3">
          How to Test Messages
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-start space-x-3">
            <div className="bg-blue-100 rounded-full p-2">
              <Mail className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-blue-900">1. Create Ticket</h3>
              <p className="text-blue-700">
                Create a new ticket to trigger automatic email
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="bg-blue-100 rounded-full p-2">
              <MessageCircle className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-blue-900">2. Customer Replies</h3>
              <p className="text-blue-700">
                Customer replies to email (appears automatically)
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="bg-blue-100 rounded-full p-2">
              <RefreshCw className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-blue-900">3. Sync Emails</h3>
              <p className="text-blue-700">
                Use "Sync Emails" button or wait 5 minutes
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="bg-blue-100 rounded-full p-2">
              <Send className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-blue-900">4. View & Respond</h3>
              <p className="text-blue-700">
                Open messages panel to see chat conversation
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Email Import (when Gmail API not configured) */}
      {!gmailStatus?.gmailConfigured && (
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-yellow-800 flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                Manual Email Import
              </h2>
              <p className="text-yellow-700 text-sm mt-1">
                Gmail API not configured. Manually import customer email replies
                here.
              </p>
            </div>
            <button
              onClick={() => setShowImportForm(!showImportForm)}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              {showImportForm ? "Hide Form" : "Import Reply"}
            </button>
          </div>

          {showImportForm && (
            <div className="bg-white rounded-lg p-4 border border-yellow-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ticket ID (e.g., T-2024-001)
                  </label>
                  <input
                    type="text"
                    value={importForm.ticketId}
                    onChange={(e) =>
                      setImportForm({ ...importForm, ticketId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="T-2024-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Email
                  </label>
                  <input
                    type="email"
                    value={importForm.fromEmail}
                    onChange={(e) =>
                      setImportForm({
                        ...importForm,
                        fromEmail: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="customer@example.com"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Subject
                </label>
                <input
                  type="text"
                  value={importForm.subject}
                  onChange={(e) =>
                    setImportForm({ ...importForm, subject: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Re: Support Ticket T-2024-001"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Content
                </label>
                <textarea
                  value={importForm.content}
                  onChange={(e) =>
                    setImportForm({ ...importForm, content: e.target.value })
                  }
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Customer's email reply content..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowImportForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={importEmailReply}
                  disabled={importing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {importing ? "Importing..." : "Import Reply"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tickets List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Inbox className="h-5 w-5 text-gray-600 mr-2" />
            Available Tickets for Testing
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {tickets.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">
                No tickets available for testing
              </p>
              <a
                href="/tickets/create"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Test Ticket
              </a>
            </div>
          ) : (
            tickets.map((ticket) => {
              const unreadCount =
                messageStats.byTicket?.find(
                  (item) => item.ticketId === ticket.ticketId,
                )?.count || 0;

              return (
                <div
                  key={ticket._id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {ticket.ticketId}
                        </h3>
                        <div
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(ticket.status)}`}
                        >
                          {getStatusIcon(ticket.status)}
                          <span className="ml-2 capitalize">
                            {ticket.status}
                          </span>
                        </div>
                        {unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 font-medium">
                            {unreadCount} new
                          </span>
                        )}
                      </div>

                      <p className="text-gray-900 font-medium mb-1">
                        {ticket.title}
                      </p>

                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {ticket.clientName}
                        </div>
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-1" />
                          {ticket.clientEmail}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => createSampleMessage(ticket._id)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send Test Message
                      </button>

                      <button
                        onClick={() => openMessagePanel(ticket)}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors relative"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Open Messages
                        {unreadCount > 0 && (
                          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Debug Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Debug Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="font-medium">User:</span> {user?.name} (
            {user?.email})
          </div>
          <div>
            <span className="font-medium">Role:</span> {user?.role}
          </div>
          <div>
            <span className="font-medium">Total Tickets:</span> {tickets.length}
          </div>
          <div>
            <span className="font-medium">Gmail API:</span>
            <span
              className={
                gmailStatus?.gmailConfigured ? "text-green-600" : "text-red-600"
              }
            >
              {gmailStatus?.gmailConfigured
                ? " ✓ Connected"
                : " ✗ Not Configured"}
            </span>
          </div>
        </div>
      </div>

      {/* Message Panel */}
      <MessagePanel
        ticket={selectedTicket}
        isOpen={showMessagePanel}
        onClose={() => {
          setShowMessagePanel(false);
          setSelectedTicket(null);
          fetchMessageStats(); // Refresh stats when closing
        }}
      />
    </div>
  );
};

export default MessagesTest;
