import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { ticketApi } from "../services/ticketApi";
import { useMessages } from "../hooks/useMessages";
import {
  Clock,
  Ticket,
  DollarSign,
  TrendingUp,
  FileText,
  User,
  Calendar,
  AlertCircle,
  MessageCircle,
} from "lucide-react";

const Dashboard = () => {
  const { user, isTechnician, isManager } = useAuth();
  const { unreadCount, getMessageStats } = useMessages();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const result = await ticketApi.getDashboardStats();

      if (result.success) {
        setStats(result.data.stats);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchDashboardStats}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Technician Dashboard
  if (isTechnician()) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {user?.name}!
              </h1>
              <p className="text-gray-600">Here's your activity overview</p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <User className="h-4 w-4" />
              <span>Technician</span>
              <span>•</span>
              <span>{user?.employeeId}</span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Tickets
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.myTickets || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Ticket className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Open Tickets
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.myOpenTickets || 0}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.myInProgressTickets || 0}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resolved</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.myResolvedTickets || 0}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Messages Stats */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Messages</h3>
            <MessageCircle className="h-6 w-6 text-blue-600" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {unreadCount || 0}
              </p>
              <p className="text-sm text-gray-600">Unread Messages</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">
                {getMessageStats()?.total || 0}
              </p>
              <p className="text-sm text-gray-600">Total Conversations</p>
            </div>
          </div>
        </div>

        {/* Billable Hours */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Billable Hours
              </h3>
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-green-600">
                {stats?.myBillableHours || 0}h
              </p>
              <p className="text-sm text-gray-600">Total billable time</p>
            </div>
          </div>

          <div className="col-span-2 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Tickets
            </h3>
            {stats?.myRecentTickets && stats.myRecentTickets.length > 0 ? (
              <div className="space-y-3">
                {stats.myRecentTickets.slice(0, 5).map((ticket) => (
                  <div
                    key={ticket._id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {ticket.ticketId}
                      </p>
                      <p className="text-sm text-gray-600">
                        {ticket.clientName}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          ticket.status === "open"
                            ? "bg-yellow-100 text-yellow-800"
                            : ticket.status === "in-progress"
                              ? "bg-blue-100 text-blue-800"
                              : ticket.status === "resolved"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {ticket.status}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No tickets yet</p>
                <p className="text-sm text-gray-500">
                  Create your first ticket to get started
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/tickets/create"
              className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <div className="p-2 bg-blue-500 rounded-lg mr-4">
                <Ticket className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Create Ticket</p>
                <p className="text-sm text-gray-600">
                  Start a new support ticket
                </p>
              </div>
            </a>

            <a
              href="/tickets"
              className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <div className="p-2 bg-green-500 rounded-lg mr-4">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">View My Tickets</p>
                <p className="text-sm text-gray-600">See all your tickets</p>
              </div>
            </a>

            <a
              href="/profile"
              className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <div className="p-2 bg-purple-500 rounded-lg mr-4">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Update Profile</p>
                <p className="text-sm text-gray-600">Manage your account</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Manager Dashboard (will be handled in ManagerDashboard component)
  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Manager Dashboard
      </h2>
      <p className="text-gray-600 mb-6">
        Please use the Manager Dashboard section for full analytics
      </p>
      <a
        href="/manager"
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Go to Manager Dashboard
      </a>
    </div>
  );
};

export default Dashboard;
