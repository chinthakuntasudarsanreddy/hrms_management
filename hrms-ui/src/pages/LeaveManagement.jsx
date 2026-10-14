
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Check,
  X,
  RefreshCw,
  ClipboardList,
  Clock3,
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  ArrowLeft,
} from "lucide-react";
import { fastApi } from "../services/api";

export default function LeaveManagement() {
  const navigate = useNavigate();

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [processingId, setProcessingId] = useState(null);

  const loadLeaves = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fastApi.get("/leave/pending");
      setLeaves(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load leave requests. Verify the FastAPI leave endpoint."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  async function reviewLeave(leaveId, decision) {
    setProcessingId(leaveId);
    setError("");
    setMessage("");

    try {
      await fastApi.patch(`/leave/${leaveId}/review`, null, {
        params: { decision },
      });

      setMessage(
        `Leave request #${leaveId} ${decision.toLowerCase()} successfully.`
      );

      await loadLeaves();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          `Unable to ${decision.toLowerCase()} this request.`
      );
    } finally {
      setProcessingId(null);
    }
  }

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  const pendingCount = leaves.filter(
    (leave) => String(leave.status).toUpperCase() === "PENDING"
  ).length;

  const approvedCount = leaves.filter(
    (leave) => String(leave.status).toUpperCase() === "APPROVED"
  ).length;

  const rejectedCount = leaves.filter(
    (leave) => String(leave.status).toUpperCase() === "REJECTED"
  ).length;

  function statusStyle(status) {
    switch (String(status || "").toUpperCase()) {
      case "APPROVED":
        return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
      case "REJECTED":
        return "bg-red-50 text-red-700 ring-red-600/20";
      case "PENDING":
        return "bg-amber-50 text-amber-700 ring-amber-600/20";
      default:
        return "bg-slate-100 text-slate-600 ring-slate-500/20";
    }
  }

  function SummaryCard({ title, value, icon: Icon, color }) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <span className={`rounded-xl p-3 ${color}`}>
            <Icon size={21} />
          </span>
        </div>
        <p className="mt-4 text-3xl font-bold text-slate-900">{value}</p>
        <p className="mt-1 text-sm text-slate-500">Loaded leave requests</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-indigo-600 p-3 text-white">
              <CalendarDays size={25} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
                HRMS · Administration
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight">
                Leave Management
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Review and manage employee leave applications.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/admin-dashboard")}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft size={17} />
              Dashboard
            </button>

            <button
              onClick={loadLeaves}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl bg-gradient-to-r from-indigo-700 to-violet-600 p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-100">
                Employee services
              </p>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                Leave Requests
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100">
                Review requested leave dates, check the reason, and approve or
                reject pending applications.
              </p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
              <ClipboardList size={32} />
            </div>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 shrink-0" size={20} />
            <div>
              <p className="font-semibold">Unable to complete the request</p>
              <p className="mt-1">{error}</p>
              <p className="mt-2 text-xs">
                If the endpoint returns 404, verify that
                <code className="mx-1 rounded bg-red-100 px-1 py-0.5">
                  GET /leave/pending
                </code>
                exists in your FastAPI backend.
              </p>
            </div>
          </div>
        )}

        {message && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <CheckCircle2 className="mt-0.5 shrink-0" size={20} />
            <p>{message}</p>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Pending Requests"
            value={pendingCount}
            icon={Clock3}
            color="bg-amber-50 text-amber-600"
          />
          <SummaryCard
            title="Total Requests"
            value={leaves.length}
            icon={ClipboardList}
            color="bg-indigo-50 text-indigo-600"
          />
          <SummaryCard
            title="Approved"
            value={approvedCount}
            icon={CheckCircle2}
            color="bg-emerald-50 text-emerald-600"
          />
          <SummaryCard
            title="Rejected"
            value={rejectedCount}
            icon={X}
            color="bg-red-50 text-red-600"
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5 sm:p-7">
            <h2 className="text-lg font-bold">Employee Applications</h2>
            <p className="mt-1 text-sm text-slate-500">
              Review each application and take action on pending requests.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 px-5 py-14 text-sm text-slate-500">
              <LoaderCircle className="animate-spin" size={21} />
              Loading leave requests...
            </div>
          ) : leaves.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <CalendarDays size={27} />
              </div>
              <h3 className="mt-4 font-semibold text-slate-800">
                No leave requests found
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Leave applications will appear here when the API returns them.
              </p>
              <button
                onClick={loadLeaves}
                className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Request</th>
                    <th className="px-5 py-4 font-semibold">Employee ID</th>
                    <th className="px-5 py-4 font-semibold">Leave Type</th>
                    <th className="px-5 py-4 font-semibold">Start Date</th>
                    <th className="px-5 py-4 font-semibold">End Date</th>
                    <th className="px-5 py-4 font-semibold">Reason</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {leaves.map((leave) => {
                    const status = String(
                      leave.status || "UNKNOWN"
                    ).toUpperCase();

                    const isProcessing = processingId === leave.id;
                    const isPending = status === "PENDING";

                    return (
                      <tr
                        key={leave.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-800">
                          #{leave.id}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {leave.employee_id ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <span className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700">
                            {leave.leave_type || "—"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {leave.start_date || "—"}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {leave.end_date || "—"}
                        </td>
                        <td className="max-w-56 px-5 py-4 text-slate-600">
                          <p className="truncate" title={leave.reason || ""}>
                            {leave.reason || "—"}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyle(
                              status
                            )}`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          {isPending ? (
                            <div className="flex items-center gap-2">
                              <button
                                disabled={processingId !== null}
                                onClick={() =>
                                  reviewLeave(leave.id, "APPROVED")
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isProcessing ? (
                                  <LoaderCircle
                                    size={14}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Check size={14} />
                                )}
                                Approve
                              </button>

                              <button
                                disabled={processingId !== null}
                                onClick={() =>
                                  reviewLeave(leave.id, "REJECTED")
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <X size={14} />
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-slate-400">
                              Reviewed
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
            Showing {leaves.length}{" "}
            {leaves.length === 1 ? "request" : "requests"}
          </div>
        </section>

        <footer className="pb-4 text-center text-xs text-slate-400">
          HRMS Admin Portal · Leave Management
        </footer>
      </div>
    </main>
  );
}
