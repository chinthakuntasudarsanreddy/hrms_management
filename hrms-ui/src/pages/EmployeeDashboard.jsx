
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Clock,
  LogOut,
  RefreshCw,
  UserRound,
  ClockArrowDown,
  ClockArrowUp,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  Wallet,
  FileText,
} from "lucide-react";
import { fastApi } from "../services/api";

export default function EmployeeDashboard() {
  const navigate = useNavigate();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  let user = {};

  try {
    user = JSON.parse(localStorage.getItem("hrms_user") || "{}");
  } catch {
    user = {};
  }

  const employeeId = user.employee_id ?? user.employee?.id ?? null;
  const displayName = user.username || user.email || "Employee";

  const loadAttendance = useCallback(async () => {
    if (!employeeId) {
      setRecords([]);
      setError(
        "Employee ID is missing. Please connect your login account to an employee profile."
      );
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await fastApi.get(
        `/attendance/employee/${employeeId}`
      );

      const data = response.data;

      setRecords(
        Array.isArray(data)
          ? data
          : data?.records || data?.attendance || []
      );

      setError("");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load attendance. Please check the API connection."
      );
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  async function performAttendance(action) {
    if (!employeeId) {
      setError("Employee ID is unavailable.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fastApi.post(
        `/attendance/${action}?employee_id=${employeeId}`
      );

      setMessage(
        response.data?.message || "Attendance updated successfully."
      );

      await loadAttendance();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Attendance action failed. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem("hrms_access_token");
    localStorage.removeItem("hrms_refresh_token");
    localStorage.removeItem("hrms_user");
    navigate("/login", { replace: true });
  }

  const now = new Date();

  const today = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const todayKey = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  const todayRecord = records.find((record) => {
    const recordDate = (
      record.attendance_date ||
      record.date ||
      ""
    )
      .toString()
      .slice(0, 10);

    return recordDate === todayKey;
  });

  const presentCount = records.filter(
    (record) =>
      String(record.status || "").toUpperCase() === "PRESENT"
  ).length;

  const StatCard = ({ icon: Icon, label, value, description }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>

        <span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
          <Icon size={21} />
        </span>
      </div>

      <p className="mt-4 break-words text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-indigo-600 p-3 text-white shadow-sm">
              <UserRound size={25} />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
                HRMS · Employee Workspace
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight">
                My Dashboard
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Welcome back, {displayName}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate("/employee-payroll")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <Wallet size={17} />
              My Payroll
            </button>

            <button
              onClick={() => navigate("/employee-leave")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <CalendarDays size={17} />
              Apply for Leave
            </button>

            <button
              onClick={logout}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={17} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Banner */}
        <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-100">
                Your workday at a glance
              </p>

              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                Hello, {displayName}!
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
                Manage your attendance, apply for leave, check salary
                records, and download your salary slips.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={() => navigate("/employee-leave")}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
                >
                  <CalendarDays size={18} />
                  Manage My Leave
                </button>

                <button
                  onClick={() => navigate("/employee-payroll")}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/20"
                >
                  <FileText size={18} />
                  View Salary Slips
                </button>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/20 bg-white/10 p-4">
              <CalendarDays size={26} />

              <div>
                <p className="text-xs text-indigo-100">Today</p>
                <p className="mt-1 text-sm font-semibold">{today}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Dashboard Statistics */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            icon={CalendarDays}
            label="Attendance Records"
            value={records.length}
            description="Total recorded entries"
          />

          <StatCard
            icon={CheckCircle2}
            label="Days Present"
            value={presentCount}
            description="Based on recorded attendance"
          />

          <StatCard
            icon={Clock}
            label="Today's Status"
            value={todayRecord?.status || "—"}
            description={
              todayRecord
                ? "Attendance record found for today"
                : "Today's attendance is not recorded"
            }
          />
        </section>

        {/* Attendance Actions */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">Attendance Actions</h2>

              <p className="mt-1 text-sm text-slate-500">
                Record your start and end times for the working day.
              </p>
            </div>

            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Attendance
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <button
              disabled={busy || loading || !employeeId}
              onClick={() => performAttendance("clock-in")}
              className="flex min-h-24 items-center justify-center gap-3 rounded-2xl bg-indigo-600 p-5 text-left text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <LoaderCircle className="animate-spin" size={25} />
              ) : (
                <ClockArrowDown size={26} />
              )}

              <span>
                <span className="block font-bold">
                  {busy ? "Please wait..." : "Clock In"}
                </span>

                <span className="mt-1 block text-sm text-indigo-100">
                  Start your workday
                </span>
              </span>
            </button>

            <button
              disabled={busy || loading || !employeeId}
              onClick={() => performAttendance("clock-out")}
              className="flex min-h-24 items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left text-slate-800 transition hover:border-indigo-200 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <LoaderCircle className="animate-spin" size={25} />
              ) : (
                <ClockArrowUp size={26} />
              )}

              <span>
                <span className="block font-bold">
                  {busy ? "Please wait..." : "Clock Out"}
                </span>

                <span className="mt-1 block text-sm text-slate-500">
                  Finish your workday
                </span>
              </span>
            </button>
          </div>

          {message && (
            <div
              role="status"
              className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
            >
              <CheckCircle2 className="mt-0.5 shrink-0" size={19} />
              <p>{message}</p>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <AlertCircle className="mt-0.5 shrink-0" size={19} />
              <p>{error}</p>
            </div>
          )}
        </section>

        {/* Attendance History */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div>
              <h2 className="text-lg font-bold">Attendance History</h2>

              <p className="mt-1 text-sm text-slate-500">
                Review your recorded check-in and check-out times.
              </p>
            </div>

            <button
              onClick={loadAttendance}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 px-5 py-14 text-sm text-slate-500">
              <LoaderCircle className="animate-spin" size={20} />
              Loading attendance records...
            </div>
          ) : records.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <CalendarDays size={26} />
              </div>

              <h3 className="mt-4 font-semibold text-slate-800">
                No attendance records yet
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Your attendance records will appear here after they are created.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Date</th>
                    <th className="px-6 py-4 font-semibold">Clock In</th>
                    <th className="px-6 py-4 font-semibold">Clock Out</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {records.map((record, index) => {
                    const status = String(
                      record.status || "—"
                    ).toUpperCase();

                    return (
                      <tr
                        key={record.id ?? index}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-800">
                          {record.attendance_date || record.date || "—"}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                          {record.check_in || "—"}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                          {record.check_out || "—"}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              status === "PRESENT"
                                ? "bg-emerald-50 text-emerald-700"
                                : status === "ABSENT"
                                  ? "bg-red-50 text-red-700"
                                  : status === "LEAVE"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-slate-100 px-6 py-4 text-xs text-slate-500">
            {records.length} attendance{" "}
            {records.length === 1 ? "record" : "records"}
          </div>
        </section>

        <footer className="pb-4 text-center text-xs text-slate-400">
          HRMS Employee Portal · Attendance and workforce management
        </footer>
      </div>
    </main>
  );
}
