
import { useCallback, useEffect, useState } from "react";
import axios from "axios";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

const EMPTY_FORM = {
  employee_code: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  department: "",
  designation: "",
  date_of_joining: "",
  base_salary: "0.00",
  status: "ACTIVE",
};

function getAuthHeaders() {
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("access");

  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
}

function getErrorMessage(err) {
  const data = err.response?.data;

  if (!data) {
    return "Unable to connect to the server. Check that Django is running and the API URL is correct.";
  }

  if (typeof data === "string") {
    return data;
  }

  if (data.detail) {
    return data.detail;
  }

  return Object.entries(data)
    .map(([key, value]) => {
      const message = Array.isArray(value)
        ? value.join(", ")
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);

      return `${key}: ${message}`;
    })
    .join(" | ") || "Unable to complete the request.";
}

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get(
        `${API_URL}/api/employees/`,
        {
          headers: getAuthHeaders(),
          params: search.trim()
            ? { search: search.trim() }
            : {},
        }
      );

      const data = response.data;

      setEmployees(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
            ? data.results
            : []
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  function startAdd() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function startEdit(employee) {
    setEditingId(employee.id);

    setForm({
      employee_code: employee.employee_code || "",
      first_name: employee.first_name || "",
      last_name: employee.last_name || "",
      email: employee.email || "",
      phone: employee.phone || "",
      department: employee.department || "",
      designation: employee.designation || "",
      date_of_joining: employee.date_of_joining || "",
      base_salary: String(employee.base_salary ?? "0.00"),
      status: employee.status || "ACTIVE",
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        ...form,
        employee_code: form.employee_code.trim().toUpperCase(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        department: form.department.trim(),
        designation: form.designation.trim(),
        base_salary: form.base_salary || "0.00",
      };

      const url = editingId
        ? `${API_URL}/api/employees/${editingId}/`
        : `${API_URL}/api/employees/`;

      if (editingId) {
        await axios.patch(url, payload, {
          headers: getAuthHeaders(),
        });
      } else {
        await axios.post(url, payload, {
          headers: getAuthHeaders(),
        });
      }

      setSuccess(
        editingId
          ? "Employee updated successfully."
          : "Employee added successfully."
      );

      setShowForm(false);
      setEditingId(null);
      setForm({ ...EMPTY_FORM });

      await loadEmployees();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function deactivateEmployee(employee) {
    if (employee.status === "INACTIVE") {
      setError("This employee is already inactive.");
      return;
    }

    const confirmed = window.confirm(
      `Deactivate ${employee.first_name} ${employee.last_name}?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setDeactivatingId(employee.id);

    try {
      await axios.patch(
        `${API_URL}/api/employees/${employee.id}/deactivate/`,
        {},
        { headers: getAuthHeaders() }
      );

      setSuccess("Employee deactivated successfully.");
      await loadEmployees();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeactivatingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Employee Management
            </h1>
            <p className="mt-1 text-slate-500">
              Add, search, edit, and maintain employee records.
            </p>
          </div>

          <button
            type="button"
            onClick={startAdd}
            className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            + Add Employee
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-green-700"
          >
            {success}
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="mb-5 text-xl font-semibold text-slate-900">
              {editingId ? "Edit Employee" : "Add New Employee"}
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["employee_code", "Employee ID", "text"],
                ["first_name", "First Name", "text"],
                ["last_name", "Last Name", "text"],
                ["email", "Email", "email"],
                ["phone", "Phone", "tel"],
                ["department", "Department", "text"],
                ["designation", "Designation", "text"],
                ["date_of_joining", "Date of Joining", "date"],
                ["base_salary", "Base Salary", "number"],
              ].map(([name, label, type]) => (
                <label
                  key={name}
                  className="text-sm font-medium text-slate-700"
                >
                  {label}
                  <input
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                    name={name}
                    type={type}
                    value={form[name]}
                    onChange={handleChange}
                    required={!["last_name", "phone"].includes(name)}
                    min={name === "base_salary" ? "0" : undefined}
                    step={name === "base_salary" ? "0.01" : undefined}
                    disabled={
                      saving ||
                      (Boolean(editingId) && name === "employee_code")
                    }
                  />
                </label>
              ))}

              <label className="text-sm font-medium text-slate-700">
                Employment Status
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  disabled={saving}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="ON_LEAVE">On Leave</option>
                </select>
              </label>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Employee"
                    : "Save Employee"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setForm({ ...EMPTY_FORM });
                  setError("");
                }}
                disabled={saving}
                className="rounded-lg border border-slate-300 px-5 py-2.5 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <label className="block max-w-md text-sm font-medium text-slate-700">
              Search employees
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, ID, email, or department"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>

          {loading ? (
            <p className="p-6 text-slate-500">
              Loading employees...
            </p>
          ) : employees.length === 0 ? (
            <p className="p-6 text-slate-500">
              No employees found. Use Add Employee to create the first record.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    {[
                      "Employee ID",
                      "Name",
                      "Email",
                      "Department",
                      "Designation",
                      "Status",
                      "Actions",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="whitespace-nowrap px-4 py-3"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {employees.map((employee) => (
                    <tr
                      key={employee.id}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                        {employee.employee_code}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        {employee.first_name} {employee.last_name}
                      </td>

                      <td className="px-4 py-3">
                        {employee.email}
                      </td>

                      <td className="px-4 py-3">
                        {employee.department}
                      </td>

                      <td className="px-4 py-3">
                        {employee.designation}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            employee.status === "ACTIVE"
                              ? "bg-green-100 text-green-700"
                              : employee.status === "ON_LEAVE"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {employee.status === "ON_LEAVE"
                            ? "On Leave"
                            : employee.status === "ACTIVE"
                              ? "Active"
                              : "Inactive"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        <button
                          type="button"
                          onClick={() => startEdit(employee)}
                          className="mr-3 font-medium text-blue-600 hover:underline"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => deactivateEmployee(employee)}
                          disabled={
                            employee.status === "INACTIVE" ||
                            deactivatingId === employee.id
                          }
                          className="font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {deactivatingId === employee.id
                            ? "Deactivating..."
                            : "Deactivate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
