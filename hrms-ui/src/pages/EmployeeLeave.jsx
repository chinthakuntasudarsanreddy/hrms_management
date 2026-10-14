
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  RefreshCw,
  Send,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
} from "lucide-react";
import { fastApi } from "../services/api";

export default function EmployeeLeave() {
  const navigate = useNavigate();

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    leave_type: "CASUAL",
    start_date: "",
    end_date: "",
    reason: "",
  });

  let user = {};

  try {
    user = JSON.parse(localStorage.getItem("hrms_user") || "{}");
  } catch {
    user = {};
  }

  const employeeId = user.employee_id ?? user.employee?.id ?? null;

  const todayKey = [
    new Date().getFullYear(),
    String(new Date().getMonth() + 1).padStart(2, "0"),
    String(new Date().getDate()).padStart(2, "0"),
  ].join("-");

  const loadLeaves = useCallback(async () => {
    if (!employeeId) {
      setLeaves([]);
      setError(
        "Employee ID is missing from your account. Contact your HR administrator."
      );
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await fastApi.get(
        `/leave/employee/${employeeId}`
      );

      const data = response.data;

      setLeaves(
        Array.isArray(data)
          ? data
          : data.records || data.leaves || []
      );

      setError("");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load leave history. Please check the API connection."
      );
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!employeeId) {
      setError(
        "Employee ID is unavailable. Please contact your HR administrator."
      );
      return;
    }

    if (form.start_date < todayKey) {
      setError("Start date cannot be in the past.");
      return;
    }

    if (form.end_date < form.start_date) {
      setError("End date cannot be earlier than start date.");
      return;
    }

    if (!form.reason.trim()) {
      setError("Please enter a reason for your leave.");
      return;
    }

    setSubmitting(true);

    try {
      await fastApi.post("/leave/apply", {
        employee_id: employeeId,
        leave_type: form.leave_type,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason.trim(),
      });

      setMessage("Your leave application was submitted successfully.");

      setForm({
        leave_type: "CASUAL",
        start_date: "",
        end_date: "",
        reason: "",
      });

      await loadLeaves();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : "Unable to submit your leave application. Check the API request fields."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function getStatusStyle(status) {
    switch (String(status || "").toUpperCase()) {
      case "APPROVED":
        return "bg-emerald-50 text-emerald-700";
      case "REJECTED":
        return "bg-red-50 text-red-700";
      default:
        return "bg-amber-50 text-amber-700";
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-indigo-600 p-3 text-white">
              <CalendarDays size={24} />
            </div>

            <div>
              <h1 className="text-xl font-bold sm:text-2xl">
                My Leave
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Apply for leave and track your requests.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/employee-dashboard")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold transition hover:bg-slate-50 sm:px-4"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl bg-gradient-to-r from-indigo-700 to-violet-600 p-6 text-white shadow-lg sm:p-8">
          <p className="text-sm text-indigo-100">
            Employee self-service
          </p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
            Leave Application
          </h2>
          <p className="mt-2 text-sm leading-6 text-indigo-100">
            Submit your requested dates and reason. Your request will remain
            pending until reviewed by HR.
          </p>
        </section>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 shrink-0" size={19} />
            <p>{error}</p>
          </div>
        )}

        {message && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <CheckCircle2 className="mt-0.5 shrink-0" size={19} />
            <p>{message}</p>
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
              <Send size={21} />
            </div>
            <div>
              <h3 className="font-bold">Submit a request</h3>
              <p className="mt-1 text-sm text-slate-500">
                Complete all fields before submitting.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="leave_type"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Leave Type
                </label>
                <select
                  id="leave_type"
                  name="leave_type"
                  value={form.leave_type}
                  onChange={updateField}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                >
                  <option value="CASUAL">Casual Leave</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="EARNED">Earned Leave</option>
                  <option value="UNPAID">Unpaid Leave</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="start_date"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Start Date
                </label>
                <input
                  id="start_date"
                  name="start_date"
                  type="date"
                  min={todayKey}
                  value={form.start_date}
                  onChange={updateField}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>

              <div>
                <label
                  htmlFor="end_date"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  End Date
                </label>
                <input
                  id="end_date"
                  name="end_date"
                  type="date"
                  min={form.start_date || todayKey}
                  value={form.end_date}
                  onChange={updateField}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>

              <div>
                <label
                  htmlFor="reason"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Reason
                </label>
                <input
                  id="reason"
                  name="reason"
                  type="text"
                  value={form.reason}
                  onChange={updateField}
                  placeholder="Enter the reason for leave"
                  required
                  maxLength={500}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !employeeId}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : (
                <Send size={17} />
              )}
              {submitting ? "Submitting..." : "Submit Leave Request"}
            </button>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div>
              <h3 className="font-bold">My Leave History</h3>
              <p className="mt-1 text-sm text-slate-500">
                Check the status of your submitted requests.
              </p>
            </div>

            <button
              type="button"
              onClick={loadLeaves}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 px-5 py-12 text-sm text-slate-500">
              <LoaderCircle className="animate-spin" size={20} />
              Loading leave history...
            </div>
          ) : leaves.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <ClipboardList
                className="mx-auto text-slate-400"
                size={34}
              />
              <p className="mt-3 font-semibold text-slate-800">
                No leave requests yet
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Your applications will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Type</th>
                    <th className="px-5 py-4 font-semibold">Start Date</th>
                    <th className="px-5 py-4 font-semibold">End Date</th>
                    <th className="px-5 py-4 font-semibold">Reason</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaves.map((leave, index) => {
                    const status = String(
                      leave.status || "PENDING"
                    ).toUpperCase();

                    return (
                      <tr
                        key={leave.id ?? index}
                        className="hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-800">
                          {leave.leave_type || "—"}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {leave.start_date || "—"}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {leave.end_date || "—"}
                        </td>
                        <td className="max-w-64 px-5 py-4 text-slate-600">
                          <p
                            className="truncate"
                            title={leave.reason || ""}
                          >
                            {leave.reason || "—"}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(status)}`}
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
        </section>

        <footer className="pb-4 text-center text-xs text-slate-400">
          HRMS Employee Portal · Leave and workforce management
        </footer>
      </div>
    </main>
  );
}
