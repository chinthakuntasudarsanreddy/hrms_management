
import { useEffect, useState } from "react";
import { Bell, Save, LoaderCircle } from "lucide-react";
import { djangoApi } from "../services/api";

const settingsList = [
  {
    key: "general_enabled",
    title: "General notifications",
    description: "Important messages and general updates",
  },
  {
    key: "leave_enabled",
    title: "Leave notifications",
    description: "Leave application and approval updates",
  },
  {
    key: "payroll_enabled",
    title: "Payroll notifications",
    description: "Salary and payroll updates",
  },
  {
    key: "attendance_enabled",
    title: "Attendance notifications",
    description: "Attendance and working-time updates",
  },
  {
    key: "system_enabled",
    title: "System announcements",
    description: "System alerts and announcements",
  },
];

export default function NotificationPreferences() {
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPreferences() {
      try {
        const response = await djangoApi.get(
          "/notifications/preferences/"
        );

        if (active) {
          setPreferences(response.data);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.status === 401
              ? "Please log in again to manage notification settings."
              : "Could not load notification settings. Check your backend and API URL."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPreferences();

    return () => {
      active = false;
    };
  }, []);

  function handleToggle(key) {
    setPreferences((current) => ({
      ...current,
      [key]: !current[key],
    }));
    setSuccess("");
  }

  async function savePreferences() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = Object.fromEntries(
        settingsList.map(({ key }) => [key, preferences[key]])
      );

      const response = await djangoApi.patch(
        "/notifications/preferences/",
        payload
      );

      setPreferences(response.data);
      setSuccess("Notification preferences saved successfully.");
    } catch (err) {
      setError(
        err.response?.status === 401
          ? "Your session may have expired. Please log in again."
          : "Failed to save settings. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-gray-600">
        Loading notification preferences...
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="m-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        {error || "Notification settings are unavailable."}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
          <Bell size={25} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Notification Preferences
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Choose which notifications you want to receive.
          </p>
        </div>
      </div>

      <div className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white px-5">
        {settingsList.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between gap-4 py-5"
          >
            <div>
              <h2 className="font-semibold text-gray-800">
                {item.title}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {item.description}
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={Boolean(preferences[item.key])}
              aria-label={item.title}
              onClick={() => handleToggle(item.key)}
              className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                preferences[item.key]
                  ? "bg-blue-600"
                  : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  preferences[item.key]
                    ? "left-6"
                    : "left-1"
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {success && (
        <p role="status" className="mt-4 text-sm text-green-700">
          {success}
        </p>
      )}

      <button
        type="button"
        onClick={savePreferences}
        disabled={saving}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? (
          <LoaderCircle size={18} className="animate-spin" />
        ) : (
          <Save size={18} />
        )}
        {saving ? "Saving..." : "Save Preferences"}
      </button>
    </div>
  );
}
