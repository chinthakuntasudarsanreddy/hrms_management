
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Banknote,
  Download,
  FileText,
  LoaderCircle,
  RefreshCw,
  Wallet,
  AlertCircle,
} from "lucide-react";
import { fastApi } from "../services/api";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatMonth(value) {
  if (!value) return "—";

  const date = new Date(`${value}-01T00:00:00`);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      });
}

export default function EmployeePayroll() {
  const navigate = useNavigate();

  const [payroll, setPayroll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [error, setError] = useState("");

  let user = {};

  try {
    user = JSON.parse(localStorage.getItem("hrms_user") || "{}");
  } catch {
    user = {};
  }

  const employeeId =
    user.employee_id ?? user.employee?.id ?? null;

  const loadPayroll = useCallback(async () => {
    if (!employeeId) {
      setError(
        "Employee ID is missing. Please link your login account to an employee profile."
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fastApi.get(
        `/payroll/employee/${employeeId}`
      );

      const data = response.data;

      setPayroll(
        Array.isArray(data)
          ? data
          : data?.payrolls || data?.records || data?.items || []
      );
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load payroll records. Please check that the FastAPI server is running."
      );
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadPayroll();
  }, [loadPayroll]);

  async function downloadSalarySlip(payrollId) {
    try {
      setDownloadingId(payrollId);
      setError("");

      const response = await fastApi.get(
        `/salary-slips/${payrollId}/pdf`,
        { responseType: "blob" }
      );

      const blobUrl = window.URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" })
      );

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `salary-slip-${payrollId}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Could not download the salary slip. Please try again."
      );
    } finally {
      setDownloadingId(null);
    }
  }

  const totalNetPay = payroll.reduce(
    (total, item) =>
      total + Number(item.net_salary ?? item.net_pay ?? item.net_amount ?? 0),
    0
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-600 p-2.5 text-white">
              <Wallet size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold">My Payroll</h1>
              <p className="text-sm text-slate-500">
                Salary history and payslips
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/employee-dashboard")}
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-100"
          >
            <ArrowLeft size={16} />
            Dashboard
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Payroll Records
              </p>
              <FileText className="text-indigo-600" size={22} />
            </div>
            <p className="mt-3 text-3xl font-bold">{payroll.length}</p>
            <p className="mt-1 text-sm text-slate-500">
              Available salary records
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Total Net Salary
              </p>
              <Banknote className="text-emerald-600" size={22} />
            </div>
            <p className="mt-3 text-3xl font-bold">
              {formatCurrency(totalNetPay)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Across loaded payroll records
            </p>
          </div>
        </section>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
            <div>
              <h2 className="font-bold">Salary History</h2>
              <p className="mt-1 text-sm text-slate-500">
                View your processed salary and download PDF payslips.
              </p>
            </div>

            <button
              onClick={loadPayroll}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-slate-500">
              <LoaderCircle className="animate-spin" size={20} />
              Loading payroll...
            </div>
          ) : payroll.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="mx-auto text-slate-300" size={40} />
              <h3 className="mt-4 font-semibold">
                No payroll records found
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Your salary records will appear here after payroll is processed.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Payroll ID</th>
                    <th className="px-5 py-4">Salary Month</th>
                    <th className="px-5 py-4">Base Salary</th>
                    <th className="px-5 py-4">Allowances</th>
                    <th className="px-5 py-4">Deductions</th>
                    <th className="px-5 py-4">Net Salary</th>
                    <th className="px-5 py-4">Payslip</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {payroll.map((item) => {
                    const id = item.id ?? item.payroll_id;
                    const month =
                      item.pay_month ?? item.salary_month ?? item.month;

                    return (
                      <tr key={id} className="hover:bg-slate-50">
                        <td className="px-5 py-4 font-semibold">#{id}</td>
                        <td className="px-5 py-4">
                          {formatMonth(month)}
                        </td>
                        <td className="px-5 py-4">
                          {formatCurrency(
                            item.base_salary ?? item.basic_salary
                          )}
                        </td>
                        <td className="px-5 py-4 text-emerald-700">
                          {formatCurrency(item.allowances)}
                        </td>
                        <td className="px-5 py-4 text-red-600">
                          {formatCurrency(item.deductions)}
                        </td>
                        <td className="px-5 py-4 font-bold">
                          {formatCurrency(
                            item.net_salary ?? item.net_pay ?? item.net_amount
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => downloadSalarySlip(id)}
                            disabled={!id || downloadingId === id}
                            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {downloadingId === id ? (
                              <LoaderCircle
                                className="animate-spin"
                                size={16}
                              />
                            ) : (
                              <Download size={16} />
                            )}
                            PDF
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
