import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import TicketList from "./pages/TicketList";
import CreateTicket from "./pages/CreateTicket";
import TicketDetails from "./pages/TicketDetails";
import UploadLog from "./pages/UploadLog";
import Profile from "./pages/Profile";
import ManagerDashboard from "./pages/ManagerDashboard";
import ManagerTickets from "./pages/ManagerTickets";
import MessagesTest from "./pages/MessagesTest";

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              {/* Technician routes */}
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="tickets" element={<TicketList />} />
              <Route path="tickets/create" element={<CreateTicket />} />
              <Route path="tickets/:ticketId" element={<TicketDetails />} />
              <Route path="tickets/:ticketId/upload" element={<UploadLog />} />
              <Route path="profile" element={<Profile />} />
              <Route path="messages-test" element={<MessagesTest />} />

              {/* Manager routes */}
              <Route path="manager" element={<ManagerDashboard />} />
              <Route path="manager/tickets" element={<ManagerTickets />} />
            </Route>

            {/* 404 route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>

          {/* Toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#363636",
                color: "#fff",
                maxWidth: "500px",
              },
              success: {
                duration: 3000,
                style: {
                  background: "#10b981",
                },
                iconTheme: {
                  primary: "#fff",
                  secondary: "#10b981",
                },
              },
              error: {
                duration: 5000,
                style: {
                  background: "#ef4444",
                },
                iconTheme: {
                  primary: "#fff",
                  secondary: "#ef4444",
                },
              },
              loading: {
                style: {
                  background: "#3b82f6",
                },
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
