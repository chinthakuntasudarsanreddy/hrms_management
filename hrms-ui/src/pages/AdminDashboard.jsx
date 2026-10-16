
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  CalendarCheck,
  ClipboardList,
  Wallet,
  RefreshCw,
  LogOut,
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Building2,
  Settings,
  CalendarDays,
  Clock,
  Calculator,
} from "lucide-react";

import { fastApi } from "../services/api";
import NotificationBell from "../components/NotificationBell";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fastApi.get("/dashboard/summary");
      setSummary(response.data);
    } catch (err) {
      console.error("Dashboard loading failed:", err);
      setError(
        err.response?.data?.detail ||
          "Unable to load dashboard data. Check whether FastAPI is running on port 8001."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleLogout = () => {
    localStorage.removeItem("hrms_access_token");
    localStorage.removeItem("hrms_refresh_token");
    localStorage.removeItem("hrms_user");
    localStorage.removeItem("employee_id");
    navigate("/login", { replace: true });
  };

  const stats = [
    {
      title: "Total Employees",
      value: summary?.total_employees ?? 0,
      icon: Users,
      color: "bg-blue-100 text-blue-700",
    },
    {
      title: "Present Today",
      value: summary?.present_today ?? 0,
      icon: CalendarCheck,
      color: "bg-green-100 text-green-700",
    },
    {
      title: "Pending Leaves",
      value: summary?.pending_leaves ?? 0,
      icon: ClipboardList,
      color: "bg-amber-100 text-amber-700",
    },
    {
      title: "Payroll",
      value: summary?.payroll_total ?? 0,
      icon: Wallet,
      color: "bg-purple-100 text-purple-700",
    },
  ];

  const quickActions = [
    {
      title: "Employee Management",
      description: "View and manage employee profiles.",
      icon: Users,
      color: "bg-blue-600 hover:bg-blue-700",
      action: () => navigate("/employee-management"),
    },
    {
      title: "Leave Management",
      description: "Review and manage employee leave requests.",
      icon: ClipboardList,
      color: "bg-amber-600 hover:bg-amber-700",
      action: () => navigate("/leave-management"),
    },
    {
      title: "Advanced Payroll",
      description:
        "Process monthly salaries, calculate deductions, review payroll history, and download salary slips.",
      icon: Calculator,
      color: "bg-purple-600 hover:bg-purple-700",
      action: () => navigate("/admin-payroll"),
    },
    {
      title: "Holiday Calendar",
      description: "Manage company holidays and calendar dates.",
      icon: CalendarDays,
      color: "bg-green-600 hover:bg-green-700",
      action: () => navigate("/holidays"),
    },
    {
      title: "Shift Management",
      description: "Create shifts and assign schedules to employees.",
      icon: Clock,
      color: "bg-violet-600 hover:bg-violet-700",
      action: () => navigate("/shifts"),
    },
    {
      title: "Notification Settings",
      description: "Configure your notification preferences.",
      icon: Settings,
      color: "bg-slate-700 hover:bg-slate-800",
      action: () => navigate("/notification-preferences"),
    },
    {
      title: "Send Notifications",
      description:
        "Send announcements to employees or selected departments.",
      icon: Activity,
      color: "bg-indigo-600 hover:bg-indigo-700",
      action: () => navigate("/notification-broadcast"),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-600 p-3 text-white">
              <Building2 size={24} />
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-900">
                HRMS Admin Dashboard
              </h1>
              <p className="text-sm text-slate-500">
                Human Resource Management System
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <NotificationBell />

            <button
              type="button"
              onClick={loadDashboard}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={17}
                className={loading ? "animate-spin" : ""}
              />
              Refresh Data
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700"
            >
              <LogOut size={17} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">
            Welcome, Administrator
          </h2>
          <p className="mt-1 text-slate-500">
            Monitor employees, attendance, leave requests, payroll, and
            schedules.
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
            <AlertCircle className="mt-0.5 shrink-0" size={20} />
            <div>
              <p className="font-semibold">Dashboard data unavailable</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          </div>
        )}

        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">
              Organization Overview
            </h3>
            <Activity size={20} className="text-slate-400" />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        {stat.title}
                      </p>
                      <p className="mt-2 text-3xl font-bold text-slate-900">
                        {loading ? "..." : stat.value}
                      </p>
                    </div>

                    <div className={`rounded-xl p-3 ${stat.color}`}>
                      <Icon size={23} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mb-10">
          <h3 className="mb-4 text-lg font-bold text-slate-900">
            HR Management Modules
          </h3>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {quickActions.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={item.action}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className={`rounded-xl p-3 text-white ${item.color}`}
                    >
                      <Icon size={22} />
                    </div>

                    <ChevronDown
                      size={18}
                      className="-rotate-90 text-slate-400 transition group-hover:translate-x-1"
                    />
                  </div>

                  <h4 className="mt-4 font-bold text-slate-900">
                    {item.title}
                  </h4>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {item.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-green-100 p-3 text-green-700">
              <CheckCircle2 size={22} />
            </div>

            <div>
              <h3 className="font-bold text-slate-900">System Status</h3>
              <p className="mt-1 text-sm text-slate-500">
                {error
                  ? "The dashboard could not retrieve the latest FastAPI data."
                  : loading
                    ? "Checking dashboard data..."
                    : "Dashboard data loaded successfully."}
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
