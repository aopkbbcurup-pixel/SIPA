import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import type { User, UserRole } from "../types/report";
import { createUser, deleteUser, fetchUsers, updateUser } from "../lib/userApi";
import type { UpdateUserPayload } from "../lib/userApi";

const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: "appraiser", label: "Penilai" },
  { value: "supervisor", label: "Supervisor" },
  { value: "admin", label: "Administrator" },
];

interface EditableForm {
  username: string;
  fullName: string;
  unit: string;
  role: UserRole;
  password: string;
}

const defaultCreateForm: EditableForm = {
  username: "",
  fullName: "",
  unit: "",
  role: "appraiser",
  password: "",
};

export function UsersPage() {
  const authUser = useAuthStore((state) => state.user);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<EditableForm>(defaultCreateForm);
  const [createBusy, setCreateBusy] = useState(false);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<EditableForm>({ ...defaultCreateForm });
  const [editBusy, setEditBusy] = useState(false);

  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => a.username.localeCompare(b.username));
  }, [users]);

  useEffect(() => {
    if (authUser?.role === "admin") {
      void loadUsers();
    } else {
      setLoading(false);
    }
  }, [authUser]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchUsers();
      setUsers(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal memuat daftar user.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const resetMessages = () => {
    setError(null);
    setMessage(null);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetMessages();

    if (!createForm.username.trim() || !createForm.fullName.trim() || !createForm.password) {
      setError("Username, nama lengkap, dan password wajib diisi.");
      return;
    }

    try {
      setCreateBusy(true);
      const payload = {
        username: createForm.username.trim(),
        fullName: createForm.fullName.trim(),
        unit: createForm.unit.trim() || undefined,
        role: createForm.role,
        password: createForm.password,
      };
      const newUser = await createUser(payload);
      setUsers((prev) => [...prev, newUser]);
      setCreateForm({ ...defaultCreateForm, role: createForm.role });
      setMessage("User baru berhasil ditambahkan.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menambahkan user.";
      setError(message);
    } finally {
      setCreateBusy(false);
    }
  };

  const startEditUser = (user: User) => {
    setEditingUser(user);
    setEditForm({
      username: user.username,
      fullName: user.fullName,
      unit: user.unit ?? "",
      role: user.role,
      password: "",
    });
    resetMessages();
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingUser) return;
    resetMessages();

    const payload: UpdateUserPayload = {};
    if (editForm.username.trim() !== editingUser.username) {
      payload.username = editForm.username.trim();
    }
    if (editForm.fullName.trim() !== editingUser.fullName) {
      payload.fullName = editForm.fullName.trim();
    }
    if ((editForm.unit ?? "").trim() !== (editingUser.unit ?? "")) {
      const trimmedUnit = editForm.unit.trim();
      payload.unit = trimmedUnit ? trimmedUnit : null;
    }
    if (editForm.role !== editingUser.role) {
      payload.role = editForm.role;
    }
    if (editForm.password) {
      payload.password = editForm.password;
    }

    if (Object.keys(payload).length === 0) {
      setMessage("Tidak ada perubahan yang disimpan.");
      setEditingUser(null);
      return;
    }

    try {
      setEditBusy(true);
      const updated = await updateUser(editingUser.id, payload);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditingUser(null);
      setMessage("Perubahan user berhasil disimpan.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal memperbarui user.";
      setError(message);
    } finally {
      setEditBusy(false);
    }
  };

  const handleDelete = async (user: User) => {
    resetMessages();
    if (user.id === authUser?.id) {
      setError("Anda tidak dapat menghapus akun yang sedang digunakan.");
      return;
    }
    const confirmed = window.confirm(`Hapus user ${user.username}?`);
    if (!confirmed) return;

    try {
      setDeleteBusyId(user.id);
      await deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setMessage("User berhasil dihapus.");
      if (editingUser?.id === user.id) {
        setEditingUser(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menghapus user.";
      setError(message);
    } finally {
      setDeleteBusyId(null);
    }
  };

  if (authUser?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">Manajemen Pengguna</h2>
        <p className="mt-1 text-sm text-slate-500">
          Kelola akun pengguna sistem. Hanya administrator yang memiliki akses ke halaman ini.
        </p>

        {(error || message) && (
          <div
            className={`mt-4 rounded-md px-4 py-3 text-sm ${error ? "border border-rose-200 bg-rose-50 text-rose-700" : "border border-emerald-200 bg-emerald-50 text-emerald-700"}`}
          >
            {error || message}
          </div>
        )}

        <div className="mt-6 grid gap-6 md:grid-cols-[2fr,3fr]">
          <form onSubmit={handleCreate} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-700">Tambah User Baru</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <label className="block font-medium text-slate-600">Username</label>
                <input
                  value={createForm.username}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, username: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600">Nama Lengkap</label>
                <input
                  value={createForm.fullName}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, fullName: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600">Unit / Cabang</label>
                <input
                  value={createForm.unit}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, unit: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  placeholder="Opsional"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600">Peran</label>
                <select
                  value={createForm.role}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, role: event.target.value as UserRole }))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-600">Password</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  required
                />
                <p className="mt-1 text-xs text-slate-400">Minimal 6 karakter.</p>
              </div>
            </div>
            <button
              type="submit"
              disabled={createBusy}
              className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createBusy ? "Menyimpan..." : "Simpan User"}
            </button>
          </form>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Daftar User ({users.length})</h3>
              <button
                type="button"
                onClick={() => void loadUsers()}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Muat Ulang
              </button>
            </div>
            {loading ? (
              <p className="mt-4 text-sm text-slate-500">Memuat data pengguna...</p>
            ) : sortedUsers.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Belum ada user terdaftar.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full table-fixed divide-y divide-slate-200 text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2 font-semibold">Nama</th>
                      <th className="px-3 py-2 font-semibold">Username</th>
                      <th className="px-3 py-2 font-semibold">Peran</th>
                      <th className="px-3 py-2 font-semibold">Unit</th>
                      <th className="px-3 py-2 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {sortedUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-700">{user.fullName}</td>
                        <td className="px-3 py-2 text-slate-600">{user.username}</td>
                        <td className="px-3 py-2 text-slate-600 capitalize">{user.role}</td>
                        <td className="px-3 py-2 text-slate-600">{user.unit || "-"}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => startEditUser(user)}
                              className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                            >
                              Ubah
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(user)}
                              disabled={deleteBusyId === user.id}
                              className="rounded-md border border-rose-200 px-3 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deleteBusyId === user.id ? "Menghapus..." : "Hapus"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {editingUser && (
        <form onSubmit={handleUpdate} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Ubah Data User</h3>
              <p className="text-sm text-slate-500">Perbarui informasi akun {editingUser.fullName}.</p>
            </div>
            <button
              type="button"
              onClick={() => setEditingUser(null)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Batal
            </button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-600">Username</label>
              <input
                value={editForm.username}
                onChange={(event) => setEditForm((prev) => ({ ...prev, username: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Nama Lengkap</label>
              <input
                value={editForm.fullName}
                onChange={(event) => setEditForm((prev) => ({ ...prev, fullName: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Unit / Cabang</label>
              <input
                value={editForm.unit}
                onChange={(event) => setEditForm((prev) => ({ ...prev, unit: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Opsional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600">Peran</label>
              <select
                value={editForm.role}
                onChange={(event) => setEditForm((prev) => ({ ...prev, role: event.target.value as UserRole }))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-600">Password Baru</label>
              <input
                type="password"
                value={editForm.password}
                onChange={(event) => setEditForm((prev) => ({ ...prev, password: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Biarkan kosong jika tidak diubah"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingUser(null)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Batalkan
            </button>
            <button
              type="submit"
              disabled={editBusy}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {editBusy ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
