import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ticketApi } from '../services/ticketApi';
import {
  Users,
  Ticket,
  Clock,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  Calendar,
  BarChart3,
  Activity,
  Loader
} from 'lucide-react';

const ManagerDashboard = () => {
  const { user, isManager } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      setError('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (!isManager()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need manager privileges to access this page.</p>
        </div>
      </div>
    );
  }

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
            <p className="text-gray-600">Overview of team performance and ticket statistics</p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <BarChart3 className="h-4 w-4" />
            <span>Manager View</span>
            <span>•</span>
            <span>{user?.employeeId}</span>
          </div>
        </div>
      </div>

      {/* Overall Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tickets</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.totalTickets || 0}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Ticket className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-sm text-gray-600">All time tickets</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Open Tickets</p>
              <p className="text-3xl font-bold text-yellow-600">{stats?.openTickets || 0}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-sm text-gray-600">Awaiting assignment</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-3xl font-bold text-blue-600">{stats?.inProgressTickets || 0}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-sm text-gray-600">Being worked on</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Resolved</p>
              <p className="text-3xl font-bold text-green-600">{stats?.resolvedTickets || 0}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-sm text-gray-600">Completed tickets</p>
          </div>
        </div>
      </div>

      {/* Revenue and Recent Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Total Revenue */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Total Revenue</h3>
            <DollarSign className="h-6 w-6 text-green-600" />
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-3xl font-bold text-green-600">${stats?.totalBillableHours * 75 || 0}</p>
              <p className="text-sm text-gray-600">Total billable revenue</p>
            </div>
            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Billable Hours:</span>
                <span className="font-medium">{stats?.totalBillableHours || 0}h</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-gray-600">Average Rate:</span>
                <span className="font-medium">$75/hour</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Tickets */}
        <div className="col-span-2 bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Tickets</h3>
            <a
              href="/manager/tickets"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View all →
            </a>
          </div>
          {stats?.recentTickets && stats.recentTickets.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {stats.recentTickets.map((ticket) => (
                <div key={ticket._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {ticket.status === 'open' && <AlertCircle className="h-5 w-5 text-yellow-500" />}
                        {ticket.status === 'in-progress' && <Clock className="h-5 w-5 text-blue-500" />}
                        {ticket.status === 'resolved' && <CheckCircle className="h-5 w-5 text-green-500" />}
                        {ticket.status === 'closed' && <XCircle className="h-5 w-5 text-gray-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{ticket.ticketId}</p>
                        <p className="text-sm text-gray-600 truncate">{ticket.clientName}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm text-gray-600">{ticket.assignedTo?.name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No recent tickets</p>
            </div>
          )}
        </div>
      </div>

      {/* Team Performance */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Team Performance</h3>
            <Users className="h-6 w-6 text-blue-600" />
          </div>
        </div>
        <div className="p-6">
          {stats?.technicianStats && stats.technicianStats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Technician</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Total Tickets</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Completed</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Billable Hours</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {stats.technicianStats.map((tech, index) => (
                    <tr key={tech._id} className="hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {tech.name.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{tech.name}</p>
                            <p className="text-sm text-gray-500">{tech.employeeId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-900">{tech.totalTickets}</td>
                      <td className="py-4 px-4 text-sm text-gray-900">{tech.completedTickets}</td>
                      <td className="py-4 px-4 text-sm text-gray-900">
                        {Math.round((tech.totalBillableTime / 60) * 100) / 100}h
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{
                                width: `${Math.min(100, (tech.completedTickets / Math.max(tech.totalTickets, 1)) * 100)}%`
                              }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 min-w-0 flex-shrink-0">
                            {Math.round((tech.completedTickets / Math.max(tech.totalTickets, 1)) * 100)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No technician data available</p>
              <p className="text-sm text-gray-500">Technicians will appear here once they start working on tickets</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/manager/tickets"
            className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <div className="p-2 bg-blue-500 rounded-lg mr-4">
              <Ticket className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-gray-900">View All Tickets</p>
              <p className="text-sm text-gray-600">Manage team tickets</p>
            </div>
          </a>

          <a
            href="/tickets/create"
            className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <div className="p-2 bg-green-500 rounded-lg mr-4">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Create Ticket</p>
              <p className="text-sm text-gray-600">New support ticket</p>
            </div>
          </a>

          <a
            href="/profile"
            className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <div className="p-2 bg-purple-500 rounded-lg mr-4">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Team Reports</p>
              <p className="text-sm text-gray-600">Performance analytics</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
