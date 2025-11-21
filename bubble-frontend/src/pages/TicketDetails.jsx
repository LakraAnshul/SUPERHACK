import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ticketApi } from "../services/ticketApi";
import MessagePanel from "../components/MessagePanel";
import { useMessages } from "../hooks/useMessages";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Mail,
  FileText,
  Upload,
  Download,
  AlertCircle,
  CheckCircle,
  XCircle,
  DollarSign,
  Building,
  Tag,
  Activity,
  Loader,
  MessageCircle,
} from "lucide-react";
import toast from "react-hot-toast";

const TicketDetails = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const { user, isTechnician } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [closing, setClosing] = useState(false);
  const [resolution, setResolution] = useState("");
  const [showMessagePanel, setShowMessagePanel] = useState(false);
  const { getTicketUnreadCount } = useMessages();

  useEffect(() => {
    fetchTicketDetails();
  }, [ticketId]);

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      const result = await ticketApi.getTicket(ticketId);

      if (result.success) {
        setTicket(result.data.ticket);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("Failed to fetch ticket details");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!resolution.trim()) {
      toast.error("Please enter a resolution description");
      return;
    }

    if (resolution.trim().length < 10) {
      toast.error("Resolution must be at least 10 characters");
      return;
    }

    try {
      setClosing(true);
      const result = await ticketApi.closeTicket(ticketId, resolution);

      if (result.success) {
        toast.success("Ticket closed successfully");
        fetchTicketDetails(); // Refresh ticket data
      } else {
        toast.error(result.error || "Failed to close ticket");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setClosing(false);
    }
  };

  const handleDownloadReport = () => {
    if (ticket?.generatedReport) {
      ticketApi.downloadReport(
        ticket.generatedReport,
        ticket.ticketId,
        ticket.clientName,
      );
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "open":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "in-progress":
        return <Clock className="h-5 w-5 text-blue-500" />;
      case "resolved":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "closed":
        return <XCircle className="h-5 w-5 text-gray-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
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

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading ticket details...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error || "Ticket not found"}</p>
          <button
            onClick={() => navigate("/tickets")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Tickets
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/tickets")}
              className="inline-flex items-center text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              Back to Tickets
            </button>
          </div>
          <div className="flex items-center space-x-3">
            {ticket.status === "resolved" && ticket.generatedReport && (
              <button
                onClick={handleDownloadReport}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </button>
            )}
            {isTechnician() &&
              ticket.status !== "closed" &&
              ticket.assignedTo._id === user.id && (
                <Link
                  to={`/tickets/${ticket.ticketId}/upload`}
                  className="inline-flex items-center px-4 py-2 bg-green-600 border border-transparent rounded-lg font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Log
                </Link>
              )}

            {/* Message Panel Toggle Button */}
            <button
              onClick={() => setShowMessagePanel(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-lg font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors relative"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Messages
              {getTicketUnreadCount(ticket?.ticketId) > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {getTicketUnreadCount(ticket?.ticketId)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Ticket Header */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {ticket.ticketId}
                  </h1>
                  <p className="text-gray-600">{ticket.title}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(ticket.status)}`}
                  >
                    {getStatusIcon(ticket.status)}
                    <span className="ml-2 capitalize">{ticket.status}</span>
                  </div>
                  <div
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border mt-2 ${getPriorityColor(ticket.priority)}`}
                  >
                    <span className="capitalize">
                      {ticket.priority} Priority
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ticket Details */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Description */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Description
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {ticket.description}
                    </p>
                  </div>
                </div>

                {/* Activities */}
                {ticket.analyzedActivities &&
                  ticket.analyzedActivities.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        Analyzed Activities
                      </h3>
                      <div className="space-y-3">
                        {ticket.analyzedActivities.map((activity, index) => (
                          <div
                            key={index}
                            className="bg-white border border-gray-200 rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="text-gray-900">
                                  {activity.description}
                                </p>
                                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                                  <div className="flex items-center">
                                    <Clock className="h-4 w-4 mr-1" />
                                    {activity.timeMinutes} minutes
                                  </div>
                                  <div className="flex items-center">
                                    <DollarSign className="h-4 w-4 mr-1" />
                                    {activity.isBillable
                                      ? "Billable"
                                      : "Non-billable"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Generated Report */}
                {ticket.generatedReport && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Generated Report
                    </h3>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-green-900 whitespace-pre-wrap">
                        {ticket.generatedReport}
                      </p>
                    </div>
                  </div>
                )}

                {/* Resolution */}
                {ticket.resolution && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Resolution
                    </h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-blue-900 whitespace-pre-wrap">
                        {ticket.resolution}
                      </p>
                    </div>
                  </div>
                )}

                {/* Close Ticket Section */}
                {isTechnician() &&
                  ticket.status !== "closed" &&
                  ticket.assignedTo._id === user.id && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        Close Ticket
                      </h3>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <strong>Note:</strong> You can close this ticket
                            with just a resolution summary. Log upload is
                            optional but recommended for detailed reporting.
                          </p>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label
                              htmlFor="resolution"
                              className="block text-sm font-medium text-gray-700 mb-2"
                            >
                              Resolution Summary
                            </label>
                            <textarea
                              id="resolution"
                              rows={4}
                              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Describe how the issue was resolved..."
                              value={resolution}
                              onChange={(e) => setResolution(e.target.value)}
                            />
                          </div>
                          <button
                            onClick={handleCloseTicket}
                            disabled={closing || !resolution.trim()}
                            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {closing ? (
                              <>
                                <Loader className="h-4 w-4 mr-2 animate-spin" />
                                Closing...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Close Ticket
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Client Information */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Client Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-600">Name:</span>
                      <span className="ml-2 text-gray-900">
                        {ticket.clientName}
                      </span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Mail className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-600">Email:</span>
                      <a
                        href={`mailto:${ticket.clientEmail}`}
                        className="ml-2 text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        {ticket.clientEmail}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Ticket Metadata */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Details
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm">
                      <Tag className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-600">Category:</span>
                      <span className="ml-2 text-gray-900 capitalize">
                        {ticket.category}
                      </span>
                    </div>
                    <div className="flex items-center text-sm">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-600">Assigned to:</span>
                      <span className="ml-2 text-gray-900">
                        {ticket.assignedTo?.name}
                      </span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-gray-600">Created:</span>
                      <span className="ml-2 text-gray-900">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {ticket.closedAt && (
                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">Closed:</span>
                        <span className="ml-2 text-gray-900">
                          {new Date(ticket.closedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Billing Information */}
                {ticket.totalBillableTime > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Billing
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Billable Time:</span>
                        <span className="text-gray-900 font-medium">
                          {Math.round((ticket.totalBillableTime / 60) * 100) /
                            100}
                          h
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Rate:</span>
                        <span className="text-gray-900 font-medium">
                          ${ticket.billableRate || 75}/hour
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200">
                        <span className="text-gray-900 font-medium">
                          Total Cost:
                        </span>
                        <span className="text-green-600 font-bold">
                          ${ticket.totalCost || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Message Panel */}
      <MessagePanel
        ticket={ticket}
        isOpen={showMessagePanel}
        onClose={() => setShowMessagePanel(false)}
      />
    </>
  );
};

export default TicketDetails;
