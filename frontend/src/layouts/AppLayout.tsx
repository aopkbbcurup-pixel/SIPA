import { useMemo } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";

const navigation = [
  { to: "/reports", label: "Daftar Laporan" },
  { to: "/reports/new", label: "Buat Laporan" },
];

export function AppLayout() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const navItems = useMemo(() => {
    const base = [...navigation];
    if (user?.role === "admin") {
      base.push({ to: "/users", label: "Manajemen User" });
    }
    return base;
  }, [user?.role]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <img
              src="/bank-bengkulu-logo.jpg"
              alt="Logo Bank Bengkulu"
              className="h-12 w-auto"
              loading="lazy"
            />
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Sistem Penilaian Agunan (SIPA)</h1>
              <p className="text-sm text-slate-500">Digitalisasi proses penilaian agunan properti</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <div className="text-right">
                <p className="text-sm font-medium text-slate-700">{user.fullName}</p>
                <p className="text-xs uppercase tracking-wide text-slate-400">{user.role}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Keluar
            </button>
          </div>
        </div>
        <nav className="bg-slate-50">
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-6">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                [
                  "border-b-2 px-1.5 py-3 text-sm font-medium transition",
                  isActive
                    ? "border-primary text-primary-dark"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700",
                ].join(" ")
              }
            >
              Ringkasan
            </NavLink>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "border-b-2 px-1.5 py-3 text-sm font-medium transition",
                    isActive
                      ? "border-primary text-primary-dark"
                      : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
