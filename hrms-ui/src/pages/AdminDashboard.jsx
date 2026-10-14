
import { useEffect, useState } from "react";
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
} from "lucide-react";

import { fastApi } from "../services/api";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showResponse, setShowResponse] = useState(false);

  let user = {};

  try {
    user = JSON.parse(localStorage.getItem("hrms_user") || "{}");
  } catch {
    user = {};
  }

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const response = await fastApi.get("/dashboard/summary");
      setData(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to load dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  function logout() {
    localStorage.removeItem("hrms_access_token");
    localStorage.removeItem("hrms_refresh_token");
    localStorage.removeItem("hrms_user");
    navigate("/login", { replace: true });
  }

  const cards = [
    {
      title: "Total Employees",
      value: data?.total_employees ?? 0,
      subtitle: `${data?.active_employees ?? 0} active employees`,
      icon: Users,
      iconStyle: "bg-blue-100 text-blue-700",
      accent: "border-l-blue-500",
    },
    {
      title: "Today's Attendance",
      value: data?.present_today ?? 0,
      subtitle: `${data?.attendance_records_today ?? 0} attendance records`,
      icon: CalendarCheck,
      iconStyle: "bg-emerald-100 text-emerald-700",
      accent: "border-l-emerald-500",
    },
    {
      title: "Pending Leaves",
      value: data?.pending_leave_requests ?? 0,
      subtitle: "Awaiting HR review",
      icon: ClipboardList,
      iconStyle: "bg-amber-100 text-amber-700",
      accent: "border-l-amber-500",
    },
    {
      title: "Monthly Payroll",
      value: `₹${Number(
        data?.total_net_payroll_this_month ?? 0
      ).toLocaleString("en-IN")}`,
      subtitle: data?.payroll_month ?? "Current month",
      icon: Wallet,
      iconStyle: "bg-violet-100 text-violet-700",
      accent: "border-l-violet-500",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-700 text-white shadow-sm">
              <Building2 size={26} />
            </div>

            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                HRMS WORKSPACE
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Admin / HR Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                {(user.username || "H").charAt(0).toUpperCase()}
              </div>

              <div>
                <p className="text-xs text-slate-500">Welcome back,</p>
                <p className="font-semibold text-slate-900">
                  {user.username || "hradmin"}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Page heading */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-700">
              <Activity size={17} />
              Overview
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Dashboard Overview
            </h2>

            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              Monitor employees, attendance, leave and payroll.
            </p>
          </div>

          <button
            onClick={loadDashboard}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            {loading ? "Loading..." : "Refresh Data"}
          </button>
        </section>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <AlertCircle
                className="mt-0.5 shrink-0 text-red-600"
                size={21}
              />
              <div>
                <h3 className="font-bold text-red-800">
                  Unable to load dashboard
                </h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>

            <button
              onClick={loadDashboard}
              disabled={loading}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              Retry
            </button>
          </div>
        )}

        {/* Statistics */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Key Statistics</h3>

            {data && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <CheckCircle2 size={15} />
                API connected
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => {
              const Icon = card.icon;

              return (
                <article
                  key={card.title}
                  className={`rounded-2xl border border-slate-200 border-l-4 ${card.accent} bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        {card.title}
                      </p>

                      <h3 className="mt-3 break-words text-3xl font-extrabold tracking-tight text-slate-900">
                        {loading && !data ? "…" : card.value}
                      </h3>
                    </div>

                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${card.iconStyle}`}
                    >
                      <Icon size={23} />
                    </div>
                  </div>

                  <p className="mt-4 text-xs font-medium text-slate-500">
                    {card.subtitle}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        {/* Additional information */}
        {data && (
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2.5 text-blue-700">
                  <CalendarCheck size={22} />
                </div>

                <div>
                  <h3 className="font-bold text-slate-900">
                    Attendance Summary
                  </h3>
                  <p className="text-sm text-slate-500">
                    {data.date || "Today's records"}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">
                    Attendance records
                  </span>
                  <span className="font-bold text-slate-900">
                    {data.attendance_records_today ?? 0}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{
                      width: `${
                        data.attendance_records_today > 0
                          ? Math.min(
                              100,
                              (data.present_today /
                                data.attendance_records_today) *
                                100
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">
                    Present today
                  </span>
                  <span className="font-bold text-emerald-700">
                    {data.present_today ?? 0}
                  </span>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-lg bg-amber-100 p-2.5 text-amber-700">
                  <ClipboardList size={22} />
                </div>

                <div>
                  <h3 className="font-bold text-slate-900">
                    Leave Requests
                  </h3>
                  <p className="text-sm text-slate-500">
                    Review pending employee requests
                  </p>
                </div>
              </div>

              <p className="text-3xl font-extrabold text-slate-900">
                {data.pending_leave_requests ?? 0}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Requests awaiting review
              </p>

              <button
                onClick={() => navigate("/leave-management")}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
              >
                Manage Leaves
                <ChevronDown className="-rotate-90" size={16} />
              </button>
            </article>
          </section>
        )}

        {/* API response inspection */}
        {data && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <button
              onClick={() => setShowResponse((current) => !current)}
              className="flex w-full items-center justify-between gap-3 p-5 text-left transition hover:bg-slate-50"
              aria-expanded={showResponse}
            >
              <div>
                <h3 className="font-bold text-slate-900">
                  Dashboard API Data
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Date: {data.date} · Active employees:{" "}
                  {data.active_employees ?? 0}
                </p>
              </div>

              <ChevronDown
                size={20}
                className={`shrink-0 text-slate-500 transition ${
                  showResponse ? "rotate-180" : ""
                }`}
              />
            </button>

            {showResponse && (
              <div className="border-t border-slate-200 bg-slate-950 p-5">
                <pre className="overflow-x-auto whitespace-pre-wrap break-words text-sm leading-6 text-emerald-300">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            )}
          </section>
        )}

        <footer className="pb-4 text-center text-xs text-slate-400">
          HRMS Workspace · Admin & HR Operations
        </footer>
      </main>
    </div>
  );
}
