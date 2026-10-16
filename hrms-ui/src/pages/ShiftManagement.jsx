import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Clock, Plus, RefreshCw, Users } from "lucide-react";

const API_URL =
  import.meta.env.VITE_DJANGO_API_URL || "http://127.0.0.1:8000/api";

const emptyShift = {
  name: "",
  shift_type: "GENERAL",
  start_time: "09:00",
  end_time: "18:00",
  break_minutes: 60,
  grace_minutes: 10,
  description: "",
};

const emptyAssignment = {
  employee: "",
  shift: "",
  start_date: new Date().toISOString().slice(0, 10),
  end_date: "",
  notes: "",
};

export default function ShiftManagement() {
  const [shifts, setShifts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [shiftForm, setShiftForm] = useState(emptyShift);
  const [assignmentForm, setAssignmentForm] = useState(emptyAssignment);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = localStorage.getItem("hrms_access_token");
  const headers = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  const request = useCallback(
    (url, config = {}) =>
      axios({
        url: `${API_URL}${url}`,
        ...config,
        headers: { ...headers, ...(config.headers || {}) },
      }),
    [token]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [shiftResponse, assignmentResponse, employeeResponse] =
        await Promise.all([
          request("/shifts/"),
          request("/shift-assignments/"),
          request("/employees/"),
        ]);

      const shiftData = shiftResponse.data;
      const assignmentData = assignmentResponse.data;
      const employeeData = employeeResponse.data;

      setShifts(
        (Array.isArray(shiftData)
          ? shiftData
          : shiftData.results || []
        ).filter((shift) => shift.is_active)
      );

      setAssignments(
        Array.isArray(assignmentData)
          ? assignmentData
          : assignmentData.results || []
      );

      setEmployees(
        Array.isArray(employeeData)
          ? employeeData
          : employeeData.results || []
      );
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Could not load data. Check your API URLs, authentication, and permissions."
      );
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const submitShift = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await request("/shifts/", {
        method: "POST",
        data: {
          ...shiftForm,
          break_minutes: Number(shiftForm.break_minutes),
          grace_minutes: Number(shiftForm.grace_minutes),
        },
      });

      setShiftForm(emptyShift);
      setShowShiftForm(false);
      setSuccess("Shift created successfully.");
      await loadData();
    } catch (err) {
      setError(JSON.stringify(err.response?.data || "Could not create shift."));
    } finally {
      setSaving(false);
    }
  };

  const submitAssignment = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await request("/shift-assignments/", {
        method: "POST",
        data: {
          ...assignmentForm,
          employee: Number(assignmentForm.employee),
          shift: Number(assignmentForm.shift),
          end_date: assignmentForm.end_date || null,
        },
      });

      setAssignmentForm(emptyAssignment);
      setShowAssignmentForm(false);
      setSuccess("Shift assigned successfully.");
      await loadData();
    } catch (err) {
      setError(
        JSON.stringify(err.response?.data || "Could not assign shift.")
      );
    } finally {
      setSaving(false);
    }
  };

  const deactivateShift = async (shift) => {
    if (!window.confirm(`Deactivate "${shift.name}"?`)) return;

    setError("");
    setSuccess("");

    try {
      await request(`/shifts/${shift.id}/`, { method: "DELETE" });
      setSuccess("Shift deactivated.");
      await loadData();
    } catch (err) {
      setError(JSON.stringify(err.response?.data || "Could not deactivate shift."));
    }
  };

  const endAssignment = async (assignment) => {
    if (!window.confirm("End this employee's shift assignment?")) return;

    setError("");
    setSuccess("");

    try {
      await request(`/shift-assignments/${assignment.id}/`, {
        method: "DELETE",
      });
      setSuccess("Assignment ended.");
      await loadData();
    } catch (err) {
      setError(
        JSON.stringify(err.response?.data || "Could not end assignment.")
      );
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

  const employeeName = (employee) =>
    employee.full_name ||
    employee.name ||
    employee.user?.username ||
    employee.employee_code ||
    `Employee #${employee.id}`;

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">HRMS / Scheduling</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Shift Management
            </h1>
            <p className="mt-2 text-slate-500">
              Create work shifts and assign schedules to employees.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2.5 font-medium hover:bg-slate-100"
            >
              <RefreshCw size={17} /> Refresh
            </button>
            <button
              onClick={() => setShowShiftForm(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700"
            >
              <Plus size={17} /> Create Shift
            </button>
            <button
              onClick={() => setShowAssignmentForm(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 font-medium text-white hover:bg-slate-800"
            >
              <Users size={17} /> Assign Shift
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Active shifts</p>
            <p className="mt-2 text-3xl font-bold">{shifts.length}</p>
          </div>
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Employees</p>
            <p className="mt-2 text-3xl font-bold">{employees.length}</p>
          </div>
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Recorded assignments</p>
            <p className="mt-2 text-3xl font-bold">{assignments.length}</p>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="border-b p-5">
            <h2 className="text-lg font-semibold">Available Shifts</h2>
          </div>

          {loading ? (
            <p className="p-6 text-slate-500">Loading shifts...</p>
          ) : shifts.length === 0 ? (
            <p className="p-6 text-slate-500">No active shifts found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="p-4">Shift</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Start</th>
                    <th className="p-4">End</th>
                    <th className="p-4">Grace (min)</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {shifts.map((shift) => (
                    <tr key={shift.id}>
                      <td className="p-4 font-medium">{shift.name}</td>
                      <td className="p-4">{shift.shift_type}</td>
                      <td className="p-4">{shift.start_time || "Flexible"}</td>
                      <td className="p-4">{shift.end_time || "Flexible"}</td>
                      <td className="p-4">{shift.grace_minutes}</td>
                      <td className="p-4">
                        <button
                          onClick={() => deactivateShift(shift)}
                          className="font-medium text-red-600 hover:underline"
                        >
                          Deactivate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b p-5">
            <Clock size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold">Shift Assignments</h2>
          </div>

          {loading ? (
            <p className="p-6 text-slate-500">Loading assignments...</p>
          ) : assignments.length === 0 ? (
            <p className="p-6 text-slate-500">No assignments found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="p-4">Employee</th>
                    <th className="p-4">Shift</th>
                    <th className="p-4">Start date</th>
                    <th className="p-4">End date</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {assignments.map((assignment) => (
                    <tr key={assignment.id}>
                      <td className="p-4">
                        {assignment.employee_code ||
                          employeeName(
                            employees.find(
                              (e) => e.id === assignment.employee
                            ) || {}
                          )}
                      </td>
                      <td className="p-4">
                        {assignment.shift_name || assignment.shift}
                      </td>
                      <td className="p-4">{assignment.start_date}</td>
                      <td className="p-4">{assignment.end_date || "Ongoing"}</td>
                      <td className="p-4">
                        {!assignment.end_date && (
                          <button
                            onClick={() => endAssignment(assignment)}
                            className="font-medium text-red-600 hover:underline"
                          >
                            End assignment
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {showShiftForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={submitShift}
            className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-xl font-bold">Create Shift</h2>

            <label className="block text-sm font-medium">
              Shift name
              <input
                className={inputClass}
                value={shiftForm.name}
                onChange={(e) =>
                  setShiftForm({ ...shiftForm, name: e.target.value })
                }
                required
                placeholder="e.g. General Shift"
              />
            </label>

            <label className="block text-sm font-medium">
              Shift type
              <select
                className={inputClass}
                value={shiftForm.shift_type}
                onChange={(e) =>
                  setShiftForm({ ...shiftForm, shift_type: e.target.value })
                }
              >
                {["GENERAL", "MORNING", "NIGHT", "FLEXIBLE", "REMOTE"].map(
                  (type) => (
                    <option key={type} value={type}>{type}</option>
                  )
                )}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-medium">
                Start time
                <input
                  type="time"
                  className={inputClass}
                  value={shiftForm.start_time}
                  onChange={(e) =>
                    setShiftForm({ ...shiftForm, start_time: e.target.value })
                  }
                />
              </label>
              <label className="text-sm font-medium">
                End time
                <input
                  type="time"
                  className={inputClass}
                  value={shiftForm.end_time}
                  onChange={(e) =>
                    setShiftForm({ ...shiftForm, end_time: e.target.value })
                  }
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-medium">
                Break (minutes)
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={shiftForm.break_minutes}
                  onChange={(e) =>
                    setShiftForm({ ...shiftForm, break_minutes: e.target.value })
                  }
                />
              </label>
              <label className="text-sm font-medium">
                Late grace (minutes)
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={shiftForm.grace_minutes}
                  onChange={(e) =>
                    setShiftForm({ ...shiftForm, grace_minutes: e.target.value })
                  }
                />
              </label>
            </div>

            <label className="block text-sm font-medium">
              Description
              <textarea
                className={inputClass}
                rows={2}
                value={shiftForm.description}
                onChange={(e) =>
                  setShiftForm({ ...shiftForm, description: e.target.value })
                }
              />
            </label>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowShiftForm(false)}
                className="w-full rounded-lg border px-4 py-3"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving..." : "Create Shift"}
              </button>
            </div>
          </form>
        </div>
      )}

      {showAssignmentForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={submitAssignment}
            className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-xl font-bold">Assign Shift</h2>

            <label className="block text-sm font-medium">
              Employee
              <select
                className={inputClass}
                value={assignmentForm.employee}
                onChange={(e) =>
                  setAssignmentForm({
                    ...assignmentForm,
                    employee: e.target.value,
                  })
                }
                required
              >
                <option value="">Select employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employeeName(employee)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium">
              Shift
              <select
                className={inputClass}
                value={assignmentForm.shift}
                onChange={(e) =>
                  setAssignmentForm({
                    ...assignmentForm,
                    shift: e.target.value,
                  })
                }
                required
              >
                <option value="">Select shift</option>
                {shifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.name} ({shift.shift_type})
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium">
              Start date
              <input
                type="date"
                className={inputClass}
                value={assignmentForm.start_date}
                onChange={(e) =>
                  setAssignmentForm({
                    ...assignmentForm,
                    start_date: e.target.value,
                  })
                }
                required
              />
            </label>

            <label className="block text-sm font-medium">
              End date (optional)
              <input
                type="date"
                className={inputClass}
                value={assignmentForm.end_date}
                onChange={(e) =>
                  setAssignmentForm({
                    ...assignmentForm,
                    end_date: e.target.value,
                  })
                }
              />
            </label>

            <label className="block text-sm font-medium">
              Notes
              <textarea
                className={inputClass}
                rows={2}
                value={assignmentForm.notes}
                onChange={(e) =>
                  setAssignmentForm({
                    ...assignmentForm,
                    notes: e.target.value,
                  })
                }
              />
            </label>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowAssignmentForm(false)}
                className="w-full rounded-lg border px-4 py-3"
              >
                Cancel
              </button>
              <button
                disabled={saving || employees.length === 0 || shifts.length === 0}
                className="w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving..." : "Assign Shift"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}