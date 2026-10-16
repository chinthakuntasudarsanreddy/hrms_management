import { useState } from "react";
import { BellRing, Send, LoaderCircle } from "lucide-react";
import { djangoApi } from "../services/api";

export default function NotificationBroadcast() {
  const [form, setForm] = useState({
    title: "",
    message: "",
    notification_type: "GENERAL",
    target: "ALL",
    department: "",
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
    setSuccess("");
  }

  async function submitAnnouncement(event) {
    event.preventDefault();
    setSending(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        notification_type: form.notification_type,
        target: form.target,
      };

      if (form.target === "DEPARTMENT") {
        payload.department = form.department.trim();
      }

      const response = await djangoApi.post(
        "/notifications/broadcast/",
        payload
      );

      setSuccess(
        `Announcement processed successfully. ${response.data.created_count} notification(s) created.`
      );

      setForm({
        title: "",
        message: "",
        notification_type: "GENERAL",
        target: "ALL",
        department: "",
      });
    } catch (err) {
      const data = err.response?.data;

      if (err.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
      } else if (err.response?.status === 403) {
        setError("Only an Admin can send organization announcements.");
      } else if (data && typeof data === "object") {
        setError(
          Object.entries(data)
            .map(([key, value]) => {
              const message = Array.isArray(value)
                ? value.join(", ")
                : typeof value === "string"
                  ? value
                  : JSON.stringify(value);
              return `${key}: ${message}`;
            })
            .join(" | ")
        );
      } else {
        setError("Unable to send the announcement. Check your connection.");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-4 md:p-8">
      <header className="mb-6 flex items-center gap-3">
        <div className="rounded-xl bg-indigo-100 p-3 text-indigo-700">
          <BellRing size={26} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Send Announcement
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Notify employees across the organization or a department.
          </p>
        </div>
      </header>

      <form
        onSubmit={submitAnnouncement}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"
      >
        <div>
          <label
            htmlFor="announcement-title"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Announcement title
          </label>
          <input
            id="announcement-title"
            name="title"
            value={form.title}
            onChange={updateField}
            maxLength={150}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            placeholder="Example: Company town hall"
          />
        </div>

        <div>
          <label
            htmlFor="announcement-message"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Message
          </label>
          <textarea
            id="announcement-message"
            name="message"
            value={form.message}
            onChange={updateField}
            rows={5}
            required
            className="w-full resize-y rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            placeholder="Write your announcement..."
          />
        </div>

        <div>
          <label
            htmlFor="announcement-type"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Notification category
          </label>
          <select
            id="announcement-type"
            name="notification_type"
            value={form.notification_type}
            onChange={updateField}
            className="w-full rounded-lg border border-slate-300 px-3 py-3"
          >
            <option value="GENERAL">General</option>
            <option value="SYSTEM">System</option>
            <option value="ATTENDANCE">Attendance</option>
            <option value="LEAVE">Leave</option>
            <option value="PAYROLL">Payroll</option>
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Recipients who disable this category will not receive the announcement.
          </p>
        </div>

        <div>
          <label
            htmlFor="announcement-target"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Send to
          </label>
          <select
            id="announcement-target"
            name="target"
            value={form.target}
            onChange={updateField}
            className="w-full rounded-lg border border-slate-300 px-3 py-3"
          >
            <option value="ALL">Entire organization</option>
            <option value="DEPARTMENT">Specific department</option>
          </select>
        </div>

        {form.target === "DEPARTMENT" && (
          <div>
            <label
              htmlFor="announcement-department"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Department name
            </label>
            <input
              id="announcement-department"
              name="department"
              value={form.department}
              onChange={updateField}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-3"
              placeholder="Enter the exact department name"
            />
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {success && (
          <p
            role="status"
            className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
          >
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={sending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? (
            <LoaderCircle size={18} className="animate-spin" />
          ) : (
            <Send size={18} />
          )}
          {sending ? "Sending..." : "Send announcement"}
        </button>
      </form>
    </main>
  );
}
