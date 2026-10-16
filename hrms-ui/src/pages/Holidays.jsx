
import { useCallback, useEffect, useState } from "react";

const API_BASE =
  import.meta.env.VITE_DJANGO_API_URL ||
  "http://127.0.0.1:8000/api";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Holidays() {
  const today = new Date();

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHolidays = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // Use the same access-token key as the HRMS login.
      const token = localStorage.getItem("hrms_access_token");

      if (!token) {
        throw new Error("Please log in again. Your access token was not found.");
      }

      const response = await fetch(
        `${API_BASE}/holidays/?year=${year}&month=${month + 1}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        throw new Error(
          "Authentication failed. Please log out and log in again."
        );
      }

      if (response.status === 403) {
        throw new Error(
          "You do not have permission to view holidays."
        );
      }

      if (!response.ok) {
        throw new Error(
          `Unable to load holidays. Server returned ${response.status}.`
        );
      }

      const data = await response.json();

      setHolidays(
        Array.isArray(data)
          ? data
          : Array.isArray(data.results)
            ? data.results
            : []
      );
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadHolidays();
  }, [loadHolidays]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarCells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  function holidaysOn(day) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;

    return holidays.filter(
      (holiday) =>
        holiday.start_date <= date && holiday.end_date >= date
    );
  }

  function changeMonth(direction) {
    const next = new Date(year, month + direction, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Holiday Calendar
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              View company holidays and your monthly schedule.
            </p>
          </div>

          <button
            type="button"
            onClick={loadHolidays}
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              aria-label="Previous month"
              className="rounded-lg border border-slate-200 px-4 py-2 text-lg hover:bg-slate-100"
            >
              ←
            </button>

            <h2 className="text-center text-lg font-semibold sm:text-2xl">
              {MONTHS[month]} {year}
            </h2>

            <button
              type="button"
              onClick={() => changeMonth(1)}
              aria-label="Next month"
              className="rounded-lg border border-slate-200 px-4 py-2 text-lg hover:bg-slate-100"
            >
              →
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center text-slate-500">
              Loading holidays...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="border-b border-slate-200 bg-slate-50 py-3 text-center text-xs font-semibold text-slate-600 sm:text-sm"
                  >
                    {day}
                  </div>
                ))}

                {calendarCells.map((day, index) => (
                  <div
                    key={`${year}-${month}-${index}`}
                    className={`min-h-20 overflow-hidden border-b border-r border-slate-100 p-1.5 sm:min-h-28 sm:p-2 ${
                      day ? "bg-white" : "bg-slate-50"
                    }`}
                  >
                    {day && (
                      <>
                        <span className="mb-1 block text-xs font-semibold text-slate-700 sm:text-sm">
                          {day}
                        </span>

                        {holidaysOn(day).map((holiday) => (
                          <div
                            key={holiday.id}
                            title={holiday.name}
                            className="mb-1 break-words rounded-md bg-indigo-50 px-1 py-1 text-[10px] font-medium text-indigo-700 sm:px-2 sm:text-xs"
                          >
                            {holiday.name}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-5 text-sm text-slate-500">
                {holidays.length} holiday
                {holidays.length === 1 ? "" : "s"} listed this month
              </div>

              <div className="mt-8">
                <h3 className="mb-4 text-lg font-semibold">
                  Holiday Details
                </h3>

                {holidays.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                    No holidays found for this month.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {holidays.map((holiday) => (
                      <article
                        key={holiday.id}
                        className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
                      >
                        <div>
                          <h4 className="font-semibold text-slate-800">
                            {holiday.name}
                          </h4>
                          <p className="mt-1 text-sm text-slate-500">
                            {holiday.start_date}
                            {holiday.start_date !== holiday.end_date
                              ? ` to ${holiday.end_date}`
                              : ""}
                          </p>
                        </div>

                        <span className="w-fit rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                          {holiday.holiday_type}
                        </span>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
