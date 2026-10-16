import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Banknote,
  Calculator,
  Download,
  FileText,
  LoaderCircle,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { fastApi } from "../services/api";

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const initialForm = () => ({
  employee_id: "",
  pay_month: currentMonth(),
  hra: "0",
  other_allowances: "0",
  bonus: "0",
  overtime_rate_per_hour: "0",
  other_deductions: "0",
  loss_of_pay_days: "0",
  working_days: "26",
});

function currency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function monthLabel(value) {
  if (!value) return "—";
  const date = new Date(`${value}-01T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      });
}

function errorMessage(error) {
  const detail = error.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (detail) return JSON.stringify(detail);
  if (error.response?.status === 401) {
    return "Your session has expired. Please log in again.";
  }
  if (error.response?.status === 403) {
    return "Only Admin or HR can manage payroll.";
  }
  return "Request failed. Check that FastAPI is running on port 8001.";
}

export default function AdminPayroll() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setError("");
    setMessage("");
  }

  async function loadHistory(event) {
    if (event) event.preventDefault();

    const id = Number(form.employee_id);
    if (!Number.isInteger(id) || id < 1) {
      setError("Enter a valid employee ID.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    setResult(null);

    try {
      const response = await fastApi.get(`/payroll/employee/${id}`);
      setRecords(Array.isArray(response.data) ? response.data : []);
      setMessage(`Loaded payroll history for employee ${id}.`);
    } catch (err) {
      setRecords([]);
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function processPayroll(event) {
    event.preventDefault();

    const employeeId = Number(form.employee_id);
    if (!Number.isInteger(employeeId) || employeeId < 1) {
      setError("Enter a valid employee ID.");
      return;
    }

    const numericFields = [
      ["hra", "HRA"],
      ["other_allowances", "Other allowances"],
      ["bonus", "Bonus"],
      ["overtime_rate_per_hour", "Overtime rate"],
      ["other_deductions", "Other deductions"],
      ["loss_of_pay_days", "Loss-of-pay days"],
      ["working_days", "Working days"],
    ];

    for (const [key, label] of numericFields) {
      const value = Number(form[key]);
      if (!Number.isFinite(value) || value < 0) {
        setError(`${label} must be zero or a positive number.`);
        return;
      }
    }

    if (!Number.isInteger(Number(form.loss_of_pay_days))) {
      setError("Loss-of-pay days must be a whole number.");
      return;
    }

    if (
      !Number.isInteger(Number(form.working_days)) ||
      Number(form.working_days) < 1 ||
      Number(form.working_days) > 31
    ) {
      setError("Working days must be a whole number between 1 and 31.");
      return;
    }

    if (!form.pay_month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(form.pay_month)) {
      setError("Choose a valid salary month.");
      return;
    }

    setProcessing(true);
    setError("");
    setMessage("");
    setResult(null);

    try {
      const params = {
        pay_month: form.pay_month,
        hra: Number(form.hra),
        other_allowances: Number(form.other_allowances),
        bonus: Number(form.bonus),
        overtime_rate_per_hour: Number(form.overtime_rate_per_hour),
        other_deductions: Number(form.other_deductions),
        loss_of_pay_days: Number(form.loss_of_pay_days),
        working_days: Number(form.working_days),
      };

      const response = await fastApi.post(
        `/payroll/process/${employeeId}`,
        null,
        { params }
      );

      setResult(response.data);
      setMessage("Payroll processed successfully.");
      const history = await fastApi.get(`/payroll/employee/${employeeId}`);
      setRecords(Array.isArray(history.data) ? history.data : []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setProcessing(false);
    }
  }

  async function downloadPayslip(payrollId) {
    setDownloadingId(payrollId);
    setError("");

    try {
      const response = await fastApi.get(
        `/salary-slips/${payrollId}/pdf`,
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" })
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `salary-slip-${payrollId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDownloadingId(null);
    }
  }

  const salary = result?.salary;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-600 p-3 text-white">
              <Wallet size={23} />
            </div>
            <div>
              <h1 className="text-xl font-bold">Advanced Payroll</h1>
              <p className="text-sm text-slate-500">
                Process salaries and review payroll history
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/admin-dashboard")}
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-100"
          >
            <ArrowLeft size={16} />
            Dashboard
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {message}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <div className="mb-6 flex items-center gap-3">
            <Calculator className="text-indigo-600" size={24} />
            <div>
              <h2 className="text-lg font-bold">Process Monthly Salary</h2>
              <p className="text-sm text-slate-500">
                Enter an employee ID and the salary components for the month.
              </p>
            </div>
          </div>

          <form onSubmit={processPayroll} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Employee ID">
                <input
                  type="number"
                  name="employee_id"
                  min="1"
                  required
                  value={form.employee_id}
                  onChange={updateField}
                  placeholder="Example: 1"
                  className="input-field"
                />
              </Field>

              <Field label="Salary month">
                <input
                  type="month"
                  name="pay_month"
                  required
                  value={form.pay_month}
                  onChange={updateField}
                  className="input-field"
                />
              </Field>

              <Field label="Working days">
                <input
                  type="number"
                  name="working_days"
                  min="1"
                  max="31"
                  step="1"
                  required
                  value={form.working_days}
                  onChange={updateField}
                  className="input-field"
                />
              </Field>

              <Field label="HRA (₹)">
                <input
                  type="number"
                  name="hra"
                  min="0"
                  step="0.01"
                  value={form.hra}
                  onChange={updateField}
                  className="input-field"
                />
              </Field>

              <Field label="Other allowances (₹)">
                <input
                  type="number"
                  name="other_allowances"
                  min="0"
                  step="0.01"
                  value={form.other_allowances}
                  onChange={updateField}
                  className="input-field"
                />
              </Field>

              <Field label="Bonus (₹)">
                <input
                  type="number"
                  name="bonus"
                  min="0"
                  step="0.01"
                  value={form.bonus}
                  onChange={updateField}
                  className="input-field"
                />
              </Field>

              <Field label="Overtime rate per hour (₹)">
                <input
                  type="number"
                  name="overtime_rate_per_hour"
                  min="0"
                  step="0.01"
                  value={form.overtime_rate_per_hour}
                  onChange={updateField}
                  className="input-field"
                />
              </Field>

              <Field label="Other deductions (₹)">
                <input
                  type="number"
                  name="other_deductions"
                  min="0"
                  step="0.01"
                  value={form.other_deductions}
                  onChange={updateField}
                  className="input-field"
                />
              </Field>

              <Field label="Loss-of-pay days">
                <input
                  type="number"
                  name="loss_of_pay_days"
                  min="0"
                  step="1"
                  value={form.loss_of_pay_days}
                  onChange={updateField}
                  className="input-field"
                />
              </Field>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={processing}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {processing ? (
                  <LoaderCircle className="animate-spin" size={18} />
                ) : (
                  <Banknote size={18} />
                )}
                {processing ? "Processing..." : "Process Payroll"}
              </button>

              <button
                type="button"
                onClick={loadHistory}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-5 py-3 font-semibold hover:bg-slate-50 disabled:opacity-60"
              >
                {loading ? (
                  <LoaderCircle className="animate-spin" size={18} />
                ) : (
                  <RefreshCw size={18} />
                )}
                Load Employee History
              </button>
            </div>
          </form>
        </section>

        {salary && (
          <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm md:p-7">
            <h2 className="mb-4 text-lg font-bold">Processed Salary Summary</h2>
            <p className="mb-4 text-sm text-slate-500">
              Employee {result.employee_id} · {monthLabel(result.pay_month)} · Payroll #{result.payroll_id}
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Summary label="Basic salary" value={salary.basic_salary} />
              <Summary label="HRA" value={salary.hra} />
              <Summary label="Other allowances" value={salary.other_allowances} />
              <Summary label="Bonus" value={salary.bonus} />
              <Summary label="Overtime pay" value={salary.overtime_pay} />
              <Summary label="Gross salary" value={salary.gross_salary} />
              <Summary label="Loss of pay" value={salary.loss_of_pay} />
              <Summary label="Other deductions" value={salary.other_deductions} />
              <Summary label="Total deductions" value={salary.total_deductions} />
            </div>

            <div className="mt-5 rounded-xl bg-emerald-50 p-5">
              <p className="text-sm font-medium text-emerald-800">Net salary payable</p>
              <p className="mt-1 text-3xl font-bold text-emerald-900">
                {currency(salary.net_salary)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => downloadPayslip(result.payroll_id)}
              disabled={downloadingId === result.payroll_id}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {downloadingId === result.payroll_id ? (
                <LoaderCircle className="animate-spin" size={18} />
              ) : (
                <Download size={18} />
              )}
              Download Payslip PDF
            </button>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-200 p-5">
            <FileText className="text-indigo-600" size={23} />
            <div>
              <h2 className="font-bold">Employee Payroll History</h2>
              <p className="text-sm text-slate-500">
                Load an employee's records using their employee ID.
              </p>
            </div>
          </div>

          {records.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No payroll records loaded. Enter an employee ID and select Load Employee History.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Payroll ID</th>
                    <th className="px-5 py-4">Month</th>
                    <th className="px-5 py-4">Basic</th>
                    <th className="px-5 py-4">Gross</th>
                    <th className="px-5 py-4">Deductions</th>
                    <th className="px-5 py-4">Net salary</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Payslip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-semibold">#{record.id}</td>
                      <td className="px-5 py-4">{monthLabel(record.pay_month)}</td>
                      <td className="px-5 py-4">{currency(record.basic_salary)}</td>
                      <td className="px-5 py-4">{currency(record.gross_salary)}</td>
                      <td className="px-5 py-4 text-red-600">{currency(record.deductions)}</td>
                      <td className="px-5 py-4 font-bold">{currency(record.net_salary)}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                          {record.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => downloadPayslip(record.id)}
                          disabled={downloadingId === record.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 font-semibold hover:bg-slate-100 disabled:opacity-50"
                        >
                          {downloadingId === record.id ? (
                            <LoaderCircle className="animate-spin" size={15} />
                          ) : (
                            <Download size={15} />
                          )}
                          PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      {children}
      <style>{`
        .input-field {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 0.5rem;
          padding: 0.7rem 0.75rem;
          outline: none;
          background: white;
        }
        .input-field:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 2px #e0e7ff;
        }
      `}</style>
    </label>
  );
}

function Summary({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold">{currency(value)}</p>
    </div>
  );
}
