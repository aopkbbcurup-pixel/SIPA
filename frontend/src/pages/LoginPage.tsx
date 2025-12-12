import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { ShieldCheck, User, Lock, ArrowRight } from "lucide-react";

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-900">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-900 opacity-80"></div>
      <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-emerald-600/20 blur-3xl"></div>
      <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl"></div>

      {/* Abstract Pattern Overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="overflow-hidden rounded-2xl bg-white/10 p-8 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white">SIPA</h2>
            <p className="mt-2 text-sm text-slate-300">
              Sistem Informasi Penilaian Agunan
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">Nama Pengguna</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="block w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:text-sm transition-all"
                  placeholder="Masukkan username"
                  autoComplete="username"
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400">Kata Sandi</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  className="block w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:text-sm transition-all"
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {(error || localError) && (
              <div className="rounded-lg bg-rose-500/10 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-500/20">
                {localError ?? error ?? "Terjadi kesalahan"}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="group flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-400 hover:to-emerald-500 hover:shadow-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Memproses..." : "Masuk ke Aplikasi"}
              {!isLoading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
            </button>
          </form>

          <div className="mt-8 border-t border-white/10 pt-6">
            <p className="text-center text-xs text-slate-400 mb-3">Akun Demo Tersedia:</p>
            <div className="flex flex-wrap justify-center gap-2">
              <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300 ring-1 ring-white/10">
                appraiser
              </span>
              <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300 ring-1 ring-white/10">
                supervisor
              </span>
              <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300 ring-1 ring-white/10">
                admin
              </span>
            </div>
            <p className="mt-2 text-center text-[10px] text-slate-500">Password: password123</p>
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-slate-400">
          © 2025. <span className="font-semibold text-slate-300">Izhan Project</span> | Bank Bengkulu
        </p>
      </div>
    </div>
  );
}
