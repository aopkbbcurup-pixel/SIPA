import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import type { SipaRendererConfig } from "../lib/api";
import { getApiBaseUrl } from "../lib/api";

type ModeOption = "standalone" | "server" | "client";

interface FormState {
  mode: ModeOption;
  host: string;
  port: number;
  serveFrontend: boolean;
  apiBaseUrl: string;
  publicApiBaseUrl: string;
  mapsApiKey: string;
}

const defaultState: FormState = {
  mode: "server",
  host: "0.0.0.0",
  port: 4000,
  serveFrontend: true,
  apiBaseUrl: "",
  publicApiBaseUrl: "",
  mapsApiKey: "",
};

interface StatusMessage {
  type: "success" | "error";
  text: string;
}

function buildLocalApiUrl(host: string, port: number): string {
  const cleanedHost = host && host !== "0.0.0.0" ? host : "localhost";
  return `http://${cleanedHost}:${port}/api`;
}

function mapConfigToForm(config: SipaRendererConfig | null | undefined): FormState {
  if (!config) {
    return { ...defaultState };
  }

  const mode: ModeOption =
    config.mode === "server" || config.mode === "client" ? config.mode : "standalone";
  const backendHost =
    config.backend?.host ??
    (mode === "server" ? "0.0.0.0" : mode === "client" ? "" : defaultState.host);
  const backendPort = config.backend?.port ?? defaultState.port;
  const serveFrontend =
    mode === "server" ? Boolean(config.backend?.serveFrontend ?? true) : false;
  const apiBaseUrl = config.apiBaseUrl ?? buildLocalApiUrl(backendHost, backendPort);
  const publicApiBaseUrl =
    config.publicApiBaseUrl && config.publicApiBaseUrl.length > 0
      ? config.publicApiBaseUrl
      : apiBaseUrl;

  return {
    mode,
    host: backendHost,
    port: backendPort,
    serveFrontend,
    apiBaseUrl,
    publicApiBaseUrl,
    mapsApiKey: config.mapsApiKey ?? "",
  };
}

export function SettingsPage() {
  const electronAvailable =
    typeof window !== "undefined" && Boolean(window.electronAPI?.getConfig);

  const [loading, setLoading] = useState(electronAvailable);
  const [saving, setSaving] = useState(false);
  const [formState, setFormState] = useState<FormState>({ ...defaultState });
  const [status, setStatus] = useState<StatusMessage | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!electronAvailable) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const config = await window.electronAPI!.getConfig();
        if (!cancelled) {
          setFormState(mapConfigToForm(config));
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Gagal memuat konfigurasi:", error);
          setStatus({
            type: "error",
            text: "Gagal memuat pengaturan aplikasi.",
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [electronAvailable]);

  const isClientMode = formState.mode === "client";
  const isServerMode = formState.mode === "server";
  const currentApiBase = getApiBaseUrl();
  const currentPublicApiBase =
    formState.publicApiBaseUrl && formState.publicApiBaseUrl.trim().length > 0
      ? formState.publicApiBaseUrl
      : currentApiBase;

  const handleModeChange = (mode: ModeOption) => {
    setFormState((current) => {
      if (mode === current.mode) {
        return current;
      }
      const nextHost =
        mode === "server"
          ? current.host || "0.0.0.0"
          : mode === "client"
          ? current.host || ""
          : "127.0.0.1";
      const nextPort = current.port || defaultState.port;
      const nextServeFrontend = mode === "server";
      const localApiBase = buildLocalApiUrl(nextHost, nextPort);

      const nextApiBase =
        mode === "client"
          ? current.apiBaseUrl || ""
          : localApiBase;

      const nextPublicBase =
        mode === "client"
          ? current.publicApiBaseUrl || current.apiBaseUrl || ""
          : current.publicApiBaseUrl && current.publicApiBaseUrl.length > 0
          ? current.publicApiBaseUrl
          : localApiBase;

      return {
        ...current,
        mode,
        host: nextHost,
        serveFrontend: nextServeFrontend,
        apiBaseUrl: nextApiBase,
        publicApiBaseUrl: nextPublicBase,
      };
    });
  };

  const handleInputChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFormState((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!electronAvailable || saving) {
      return;
    }

    if (isClientMode && !formState.apiBaseUrl.trim()) {
      setStatus({
        type: "error",
        text: "Mohon isi alamat API server ketika menggunakan mode klien.",
      });
      return;
    }

    setSaving(true);
    setStatus(null);

    try {
      const host =
        isServerMode && formState.host.trim().length > 0
          ? formState.host.trim()
          : formState.mode === "client"
          ? formState.host.trim()
          : "127.0.0.1";

      const payload: Partial<SipaRendererConfig> & {
        backend: SipaRendererConfig["backend"];
      } = {
        mode: formState.mode,
        backend: {
          host,
          port: Number.isFinite(formState.port) ? formState.port : defaultState.port,
          serveFrontend: isServerMode ? formState.serveFrontend : false,
        },
      };

      if (isClientMode) {
        payload.apiBaseUrl = formState.apiBaseUrl.trim();
      }
      const trimmedPublic = formState.publicApiBaseUrl.trim();
      payload.publicApiBaseUrl = trimmedPublic;
      const trimmedMapsKey = formState.mapsApiKey.trim();
      payload.mapsApiKey = trimmedMapsKey;

      const updated = await window.electronAPI!.saveConfig(payload);
      setFormState(mapConfigToForm(updated));
      setStatus({
        type: "success",
        text: "Pengaturan tersimpan. Mulai ulang aplikasi untuk menerapkan perubahan backend.",
      });
    } catch (error) {
      console.error("Gagal menyimpan konfigurasi:", error);
      setStatus({
        type: "error",
        text: "Gagal menyimpan pengaturan. Periksa log aplikasi.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!electronAvailable) {
    return (
      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-xl font-semibold text-slate-800">Pengaturan Aplikasi</h1>
        <p className="mt-3 text-sm text-slate-600">
          Pengaturan server hanya dapat dilakukan melalui aplikasi desktop yang bertindak sebagai
          host data. Gunakan komputer server untuk mengubah mode operasi atau konfigurasi jaringan.
        </p>
        <p className="mt-4 text-sm text-slate-500">
          Saat ini aplikasi menggunakan endpoint API:{" "}
          <span className="font-mono text-slate-700">{currentApiBase}</span>
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-xl font-semibold text-slate-800">Pengaturan Aplikasi</h1>
        <p className="mt-2 text-sm text-slate-600">
          Tentukan bagaimana aplikasi ini beroperasi. Gunakan mode <strong>Server</strong> untuk
          membuka akses jaringan bagi komputer lain, atau mode <strong>Klien</strong> untuk terhubung
          ke server SIPA yang sudah berjalan di jaringan.
        </p>

        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-slate-700">Mode Operasi</legend>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="mode"
                  value="standalone"
                  checked={formState.mode === "standalone"}
                  onChange={() => handleModeChange("standalone")}
                  disabled={loading || saving}
                />
                Standalone (default, backend lokal)
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="mode"
                  value="server"
                  checked={formState.mode === "server"}
                  onChange={() => handleModeChange("server")}
                  disabled={loading || saving}
                />
                Server (dapat diakses komputer lain)
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="mode"
                  value="client"
                  checked={formState.mode === "client"}
                  onChange={() => handleModeChange("client")}
                  disabled={loading || saving}
                />
                Klien (terhubung ke server jaringan)
              </label>
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span>Alamat Host Backend</span>
              <input
                type="text"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={formState.host}
                onChange={(event) => handleInputChange("host", event.target.value)}
                disabled={loading || saving || (!isServerMode && formState.mode !== "client")}
                placeholder={isServerMode ? "0.0.0.0" : "127.0.0.1"}
              />
              <span className="text-xs text-slate-500">
                {isServerMode
                  ? "Gunakan 0.0.0.0 agar dapat diakses dari jaringan lokal."
                  : formState.mode === "client"
                  ? "Isi dengan alamat IP atau domain server SIPA."
                  : "Backend lokal hanya dapat diakses dari komputer ini."}
              </span>
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span>Port Backend</span>
              <input
                type="number"
                min={1}
                max={65535}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={formState.port}
                onChange={(event) => handleInputChange("port", Number(event.target.value))}
                disabled={loading || saving || isClientMode}
              />
              <span className="text-xs text-slate-500">
                Portal default 4000. Pastikan port belum digunakan layanan lain.
              </span>
            </label>
          </div>

          {isServerMode && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={formState.serveFrontend}
                onChange={(event) => handleInputChange("serveFrontend", event.target.checked)}
                disabled={loading || saving}
              />
              Sajikan antarmuka SIPA melalui HTTP (http://alamat-server:port)
            </label>
          )}

          {!isClientMode && (
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span>URL API Publik (Opsional)</span>
              <input
                type="text"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={formState.publicApiBaseUrl}
                onChange={(event) => handleInputChange("publicApiBaseUrl", event.target.value)}
                disabled={loading || saving}
                placeholder={buildLocalApiUrl(formState.host || "localhost", formState.port || defaultState.port)}
              />
              <span className="text-xs text-slate-500">
                Kosongkan untuk menggunakan alamat lokal ({buildLocalApiUrl(formState.host || "localhost", formState.port || defaultState.port)}).
                Ubah jika aplikasi ini dibuka dari perangkat lain.
              </span>
            </label>
          )}

          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span>Google Maps API Key</span>
            <input
              type="text"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={formState.mapsApiKey}
              onChange={(event) => handleInputChange("mapsApiKey", event.target.value)}
              disabled={loading || saving}
              placeholder="Masukkan API key Google Maps (opsional)"
            />
            <span className="text-xs text-slate-500">
              Dibutuhkan untuk mengunduh snapshot peta otomatis. Biarkan kosong bila hanya perlu membuka Google Maps di tab baru.
            </span>
          </label>

          {isClientMode && (
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span>Alamat API Server</span>
              <input
                type="text"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={formState.apiBaseUrl}
                onChange={(event) => handleInputChange("apiBaseUrl", event.target.value)}
                disabled={loading || saving}
                placeholder="http://ip-server:4000/api"
                required
              />
              <span className="text-xs text-slate-500">
                Gunakan alamat lengkap endpoint API server, contoh: http://192.168.1.10:4000/api
              </span>
            </label>
          )}

          {status && (
            <div
              className={`rounded-md px-3 py-2 text-sm ${
                status.type === "success"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              {status.text}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading || saving}
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {saving ? "Menyimpan..." : "Simpan Pengaturan"}
            </button>
            <div className="text-xs text-slate-500">
              Perubahan pada mode atau port backend memerlukan restart aplikasi.
            </div>
          </div>
        </form>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-800">Status Koneksi</h2>
        <dl className="mt-3 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
          <div className="flex flex-col">
            <dt className="text-xs uppercase tracking-wide text-slate-400">Mode Aktif</dt>
            <dd className="font-medium capitalize">{formState.mode}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-xs uppercase tracking-wide text-slate-400">Endpoint API Saat Ini</dt>
            <dd className="font-mono text-xs text-slate-800">{currentApiBase}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-xs uppercase tracking-wide text-slate-400">Endpoint Publik</dt>
            <dd className="font-mono text-xs text-slate-800">
              {currentPublicApiBase || "(otomatis mengikuti API lokal)"}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-slate-500">
          Klien lain bisa mengakses antarmuka web (jika diaktifkan) pada{" "}
          <span className="font-mono">
            http://&lt;alamat-server&gt;:{formState.port}/
          </span>{" "}
          dan API pada{" "}
          <span className="font-mono">
            http://&lt;alamat-server&gt;:{formState.port}/api
          </span>
          .
        </p>
      </section>
    </div>
  );
}
