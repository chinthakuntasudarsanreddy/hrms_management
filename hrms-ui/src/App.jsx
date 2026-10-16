import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import EmployeeManagement from "./pages/EmployeeManagement";
import LeaveManagement from "./pages/LeaveManagement";
import EmployeeLeave from "./pages/EmployeeLeave";
import EmployeePayroll from "./pages/EmployeePayroll";
import AdminPayroll from "./pages/AdminPayroll";
import Holidays from "./pages/Holidays";
import ShiftManagement from "./pages/ShiftManagement";
import NotificationPreferences from "./components/NotificationPreferences";
import NotificationBroadcast from "./pages/NotificationBroadcast";

function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("hrms_access_token");

  let user = {};

  try {
    user = JSON.parse(localStorage.getItem("hrms_user") || "{}");
  } catch {
    user = {};
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const role = String(user.role || "").toUpperCase();

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function LogoutRedirect() {
  localStorage.removeItem("hrms_access_token");
  localStorage.removeItem("hrms_refresh_token");
  localStorage.removeItem("hrms_user");

  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Home */}
        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        {/* Login */}
        <Route
          path="/login"
          element={<Login />}
        />

        {/* Admin and HR Dashboard */}
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "HR"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Employee Management */}
        <Route
          path="/employee-management"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "HR"]}>
              <EmployeeManagement />
            </ProtectedRoute>
          }
        />

        {/* Employee Dashboard */}
        <Route
          path="/employee-dashboard"
          element={
            <ProtectedRoute allowedRoles={["EMPLOYEE"]}>
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        />

        {/* Leave Management */}
        <Route
          path="/leave-management"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "HR"]}>
              <LeaveManagement />
            </ProtectedRoute>
          }
        />

        {/* Employee Leave Application */}
        <Route
          path="/employee-leave"
          element={
            <ProtectedRoute allowedRoles={["EMPLOYEE"]}>
              <EmployeeLeave />
            </ProtectedRoute>
          }
        />

        {/* Employee Payroll */}
        <Route
          path="/employee-payroll"
          element={
            <ProtectedRoute allowedRoles={["EMPLOYEE"]}>
              <EmployeePayroll />
            </ProtectedRoute>
          }
        />

        {/* Advanced Payroll Management */}
        <Route
          path="/admin-payroll"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "HR"]}>
              <AdminPayroll />
            </ProtectedRoute>
          }
        />

        {/* Holiday Calendar */}
        <Route
          path="/holidays"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "HR", "EMPLOYEE"]}
            >
              <Holidays />
            </ProtectedRoute>
          }
        />

        {/* Shift Management */}
        <Route
          path="/shifts"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "HR"]}>
              <ShiftManagement />
            </ProtectedRoute>
          }
        />

        {/* Notification Preferences */}
        <Route
          path="/notification-preferences"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "HR", "EMPLOYEE"]}
            >
              <NotificationPreferences />
            </ProtectedRoute>
          }
        />

        {/* Admin Notification Broadcast */}
        <Route
          path="/notification-broadcast"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <NotificationBroadcast />
            </ProtectedRoute>
          }
        />

        {/* Logout */}
        <Route
          path="/logout"
          element={<LogoutRedirect />}
        />

        {/* Unknown Routes */}
        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
