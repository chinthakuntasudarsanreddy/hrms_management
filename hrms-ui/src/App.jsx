
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import LeaveManagement from "./pages/LeaveManagement";
import EmployeeLeave from "./pages/EmployeeLeave";
import EmployeePayroll from "./pages/EmployeePayroll";

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
        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        <Route path="/login" element={<Login />} />

        {/* Admin and HR Dashboard */}
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "HR"]}>
              <AdminDashboard />
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

        {/* HR Leave Management */}
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

        {/* Employee Payroll and Salary Slips */}
        <Route
          path="/employee-payroll"
          element={
            <ProtectedRoute allowedRoles={["EMPLOYEE"]}>
              <EmployeePayroll />
            </ProtectedRoute>
          }
        />

        {/* Logout */}
        <Route
          path="/logout"
          element={<LogoutRedirect />}
        />

        {/* Unknown routes */}
        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}
