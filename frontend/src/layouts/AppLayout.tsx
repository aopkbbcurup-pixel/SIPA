import { useMemo } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";

const navigation = [
  { to: "/reports", label: "Daftar Laporan" },
  { to: "/reports/new", label: "Buat Laporan" },
];

import { NotificationProvider, useNotification } from "../context/NotificationContext";
import { Chatbox } from "../components/Chatbox";

function Notifications() {
  const { notifications } = useNotification();
  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {notifications.map((notif, index) => (
        <div key={index} className="rounded-md bg-white p-4 shadow-lg ring-1 ring-black/5 animate-in slide-in-from-right">
          <p className="font-medium text-slate-900">Notifikasi Baru</p>
          <p className="text-sm text-slate-500">
            {notif.status
              ? `Status laporan berubah menjadi ${notif.status}`
              : "Ada pembaruan pada laporan."}
          </p>
        </div>
      ))}
    </div>
  );
}

export function AppLayout() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const navItems = useMemo(() => {
    const base = [...navigation];
    if (user?.role === "admin") {
      base.push({ to: "/users", label: "Manajemen User" });
    }
    base.push({ to: "/settings", label: "Pengaturan" });
    return base;
  }, [user?.role]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md transition-all duration-200">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <img
                src="/bank-bengkulu-logo.jpg"
                alt="Logo Bank Bengkulu"
                className="h-10 w-auto transition-transform hover:scale-105"
                loading="lazy"
              />
              <div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">Sistem Penilaian Agunan</h1>
                <p className="text-xs font-medium text-slate-500">Digitalisasi Penilaian Properti</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <nav className="hidden md:flex items-center gap-1">
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) =>
                    [
                      "rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
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
                        "rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                      ].join(" ")
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
              <div className="flex items-center gap-4">
                {user && (
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-slate-800">{user.fullName}</p>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{user.role}</p>
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600 hover:border-red-100 active:scale-95"
                >
                  Keluar
                </button>
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8 animate-in fade-in duration-500">
          <Outlet />
        </main>
        <Notifications />
        <Chatbox />
      </div>
    </NotificationProvider>
  );
}
