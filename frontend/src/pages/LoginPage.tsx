import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, login, isLoading, error } = useAuthStore();
  const [username, setUsername] = useState("appraiser");
  const [password, setPassword] = useState("password123");
  const [localError, setLocalError] = useState<string | undefined>();

  const from = (location.state as { from?: Location })?.from?.pathname ?? "/";

  if (token) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLocalError(undefined);
    try {
      await login({ username, password });
      navigate(from, { replace: true });
    } catch {
      setLocalError("Login gagal, periksa kredensial Anda.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-md rounded-xl bg-white/95 p-8 shadow-xl ring-1 ring-slate-900/10 backdrop-blur">
        <div className="mb-6 text-center">
          <img
            src="/bank-bengkulu-logo.jpg"
            alt="Logo Bank Bengkulu"
            className="mx-auto mb-4 h-16 w-auto"
            loading="lazy"
          />
          <h2 className="text-2xl font-semibold text-slate-800">Masuk ke SIPA</h2>
          <p className="mt-1 text-sm text-slate-500">
            Gunakan akun penilai, supervisor, atau administrator untuk melanjutkan.
          </p>
        </div>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-600">Nama Pengguna</label>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="appraiser"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Kata Sandi</label>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="password123"
              autoComplete="current-password"
              required
            />
          </div>
          {(error || localError) && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {localError ?? error ?? "Terjadi kesalahan"}
            </p>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Memproses..." : "Masuk"}
          </button>
        </form>
        <div className="mt-6 rounded-md bg-slate-50 px-4 py-3 text-xs text-slate-500">
          <p className="font-semibold text-slate-600">Akun contoh:</p>
          <ul className="mt-2 space-y-1">
            <li>Penilai: <code className="rounded bg-slate-200 px-1">appraiser / password123</code></li>
            <li>Supervisor: <code className="rounded bg-slate-200 px-1">supervisor / password123</code></li>
            <li>Administrator: <code className="rounded bg-slate-200 px-1">admin / password123</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
