
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Users,
  Eye,
  EyeOff,
  LockKeyhole,
  UserRound,
  AlertCircle,
  LoaderCircle,
  ArrowRight,
  BriefcaseBusiness,
} from "lucide-react";
import { djangoApi, setAccessToken } from "../services/api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await djangoApi.post("/auth/login/", {
        username: username.trim(),
        password,
      });

      const data = response.data;
      const token = data.access || data.access_token;

      if (!token) {
        throw new Error(
          "Login succeeded, but the API did not return an access token."
        );
      }

      let user = data.user || data;
      let role = String(user.role || data.role || "").toUpperCase();

      localStorage.setItem("hrms_access_token", token);

      if (data.refresh) {
        localStorage.setItem("hrms_refresh_token", data.refresh);
      } else {
        localStorage.removeItem("hrms_refresh_token");
      }

      setAccessToken(token);

      // If the login response does not contain the role,
      // try retrieving the current user's profile.
      if (!role) {
        try {
          const profileResponse = await djangoApi.get("/auth/me/");
          user = { ...user, ...profileResponse.data };
          role = String(user.role || "").toUpperCase();
        } catch {
          // Keep the login response if the profile request fails.
        }
      }

      localStorage.setItem("hrms_user", JSON.stringify(user));

      if (role === "ADMIN" || role === "HR") {
        navigate("/admin-dashboard", { replace: true });
      } else if (role === "EMPLOYEE") {
        navigate("/employee-dashboard", { replace: true });
      } else {
        setError(
          "Login succeeded, but your account role was not recognized. Please contact your HR administrator."
        );
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      const nonFieldErrors = err.response?.data?.non_field_errors;
      const usernameErrors = err.response?.data?.username;
      const passwordErrors = err.response?.data?.password;

      const apiMessage = [
        detail,
        ...(Array.isArray(nonFieldErrors) ? nonFieldErrors : []),
        ...(Array.isArray(usernameErrors) ? usernameErrors : []),
        ...(Array.isArray(passwordErrors) ? passwordErrors : []),
      ]
        .filter((item) => typeof item === "string")
        .join(" ");

      setError(
        apiMessage ||
          err.message ||
          "Login failed. Check your credentials and Django API connection."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 sm:px-6">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08),transparent_65%)]" />
      </div>

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl lg:grid-cols-2">
        {/* Left panel */}
        <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-950 p-10 text-white lg:flex xl:p-12">
          <div className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-12 top-36 h-48 w-48 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-violet-400/10 blur-2xl" />

          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                <BriefcaseBusiness size={25} />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-wide">HRMS</h2>
                <p className="text-xs text-indigo-200">
                  Workforce Management
                </p>
              </div>
            </div>

            <div className="mt-20">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-indigo-200">
                One platform. One team.
              </p>
              <h1 className="mt-5 text-4xl font-bold leading-tight xl:text-5xl">
                Manage your people,
                <span className="mt-2 block text-indigo-200">
                  simplify your work.
                </span>
              </h1>
              <p className="mt-6 max-w-sm text-base leading-7 text-slate-300">
                Access attendance, leave management, payroll, and employee
                information in one secure workspace.
              </p>
            </div>
          </div>

          <div className="relative mt-12 space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="rounded-lg bg-emerald-400/15 p-2 text-emerald-300">
                <ShieldCheck size={21} />
              </div>
              <div>
                <p className="text-sm font-semibold">Secure access</p>
                <p className="mt-1 text-xs text-slate-300">
                  Role-based access for your organization
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="rounded-lg bg-indigo-400/15 p-2 text-indigo-200">
                <Users size={21} />
              </div>
              <div>
                <p className="text-sm font-semibold">Connected workforce</p>
                <p className="mt-1 text-xs text-slate-300">
                  Keep employee operations organized
                </p>
              </div>
            </div>

            <p className="pt-4 text-xs text-slate-400">
              Human Resource Management System
            </p>
          </div>
        </section>

        {/* Login form */}
        <section className="flex items-center justify-center bg-white px-6 py-10 sm:px-10 lg:px-9 xl:px-14">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
                <BriefcaseBusiness size={25} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">HRMS</h2>
                <p className="text-xs text-slate-500">
                  Workforce Management
                </p>
              </div>
            </div>

            <div className="mb-8">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <LockKeyhole size={27} />
              </div>

              <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
                Welcome to HRMS
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Welcome back
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Sign in with your account to access your workspace.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="username"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Username or email
                </label>

                <div className="relative">
                  <UserRound
                    size={19}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Enter your username or email"
                    required
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Password
                  </label>
                </div>

                <div className="relative">
                  <LockKeyhole
                    size={19}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                  <AlertCircle className="mt-0.5 shrink-0" size={19} />
                  <p>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <LoaderCircle size={19} className="animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in to your account
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-7 flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <ShieldCheck
                size={19}
                className="mt-0.5 shrink-0 text-emerald-600"
              />
              <p className="text-xs leading-5 text-slate-500">
                Secure access for administrators, HR teams, and employees.
                Contact your HR administrator if you need account assistance.
              </p>
            </div>

            <p className="mt-8 text-center text-xs text-slate-400">
              HRMS Portal · Employee and Workforce Management
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
