import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { PawPrint } from "lucide-react";
import { useAuth } from "../context/AuthProvider.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? "/pets";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F4F7] flex items-center justify-center px-4 py-8 relative overflow-hidden">

      {/* ── Decorative paw watermarks ─────────────────────────────────────── */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none select-none" aria-hidden="true">
        <g fill="#3D3170" opacity="0.045">
          {/* Top-right large */}
          <ellipse cx="88%" cy="12%" rx="52" ry="42" />
          <ellipse cx="74%" cy="4%"  rx="20" ry="16" />
          <ellipse cx="94%" cy="4%"  rx="20" ry="16" />
          <ellipse cx="78%" cy="-2%" rx="18" ry="14" />
          <ellipse cx="90%" cy="-2%" rx="18" ry="14" />
          {/* Bottom-left medium */}
          <ellipse cx="12%" cy="88%" rx="36" ry="30" />
          <ellipse cx="3%"  cy="78%" rx="14" ry="11" />
          <ellipse cx="22%" cy="78%" rx="14" ry="11" />
          <ellipse cx="7%"  cy="73%" rx="13" ry="10" />
          <ellipse cx="19%" cy="73%" rx="13" ry="10" />
        </g>
      </svg>

      <div className="w-full max-w-sm relative z-10">

        {/* ── Brand moment ──────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-[#3D3170] flex items-center justify-center shadow-[0_4px_20px_rgba(61,49,112,0.30)] mb-4">
            <PawPrint size={36} strokeWidth={1.75} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-[#3D3170]">Paw</span>
            <span className="text-stone-900">Track</span>
          </h1>
          <p className="mt-1.5 text-sm text-stone-500">Sign in to continue</p>
        </div>

        {/* ── Card ──────────────────────────────────────────────────────────── */}
        <div className="bg-[#FFFFFF] rounded-2xl border border-stone-200/60 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Username
              </label>
              <input
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                className="w-full rounded-xl border border-stone-200 bg-[#F5F4F7] px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#3D3170]/30 focus:border-[#3D3170] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-stone-200 bg-[#F5F4F7] px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#3D3170]/30 focus:border-[#3D3170] transition-colors"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full bg-[#3D3170] hover:bg-[#2E2454] text-white rounded-xl px-4 py-3 text-sm font-semibold transition-colors active:scale-[0.98] duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>

          </form>
        </div>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <p className="mt-5 text-center text-sm text-stone-500">
          Don&apos;t have an account?{" "}
          <Link
            to="/register"
            className="text-[#3D3170] font-semibold hover:text-[#2E2454] transition-colors"
          >
            Sign up
          </Link>
        </p>

      </div>
    </div>
  );
}

