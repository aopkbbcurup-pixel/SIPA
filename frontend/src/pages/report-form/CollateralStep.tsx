import {
  buildGoogleMapsLink,
} from "../../lib/maps";
import { LocationPicker } from "../../components/LocationPicker";
import type {
  CollateralItem,
  InspectionChecklistItem,
  InspectionChecklistResponse,
  MetadataResponse,
} from "../../types/report";
import { extractDocument } from "../../lib/reportApi";



interface CollateralStepProps {
  collateral: CollateralItem[];
  metadata: MetadataResponse | null;
  onUpdateCollateral: (index: number, updates: Partial<CollateralItem>) => void;
  onRemoveCollateral: (index: number) => void;
  onAddCollateral: () => void;
  onUpdateInspectionChecklist: (
    collateralIndex: number,
    itemId: string,
    updates: Partial<InspectionChecklistItem>,
  ) => void;
}

export function CollateralStep({
  collateral,
  metadata,
  onUpdateCollateral,
  onRemoveCollateral,
  onAddCollateral,
  onUpdateInspectionChecklist,
}: CollateralStepProps) {
  const occupancyOptions = metadata?.lookups.occupancyStatuses ?? [];

  return (
    <div className="space-y-6">
      {collateral.map((asset, index) => {
        const hasCoordinates =
          typeof asset.latitude === "number" &&
          !Number.isNaN(asset.latitude) &&
          typeof asset.longitude === "number" &&
          !Number.isNaN(asset.longitude);
        const mapsLink = hasCoordinates
          ? buildGoogleMapsLink(asset.latitude as number, asset.longitude as number)
          : null;

        return (
          <div key={asset.id ?? index} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Agunan #{index + 1}</h3>
              {collateral.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoveCollateral(index)}
                  className="text-xs font-medium text-rose-600 hover:text-rose-700"
                >
                  Hapus
                </button>
              )}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-600">Nama Aset</label>
                <input
                  value={asset.name}
                  onChange={(event) => onUpdateCollateral(index, { name: event.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Jenis Agunan</label>
                <select
                  value={asset.kind}
                  onChange={(event) => onUpdateCollateral(index, { kind: event.target.value as CollateralItem["kind"] })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="residential">Rumah Tinggal</option>
                  <option value="commercial">Komersial</option>
                  <option value="land">Tanah</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-600">Alamat</label>
                <textarea
                  value={asset.address}
                  onChange={(event) => onUpdateCollateral(index, { address: event.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-600">Lokasi Agunan</label>
                <div className="mt-2 mb-4">
                  <LocationPicker
                    latitude={asset.latitude}
                    longitude={asset.longitude}
                    onLocationChange={(lat, lng) =>
                      onUpdateCollateral(index, { latitude: lat, longitude: lng })
                    }
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Latitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={asset.latitude ?? ""}
                      onChange={(event) =>
                        onUpdateCollateral(index, {
                          latitude: event.target.value ? parseFloat(event.target.value) : undefined,
                        })
                      }
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Longitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={asset.longitude ?? ""}
                      onChange={(event) =>
                        onUpdateCollateral(index, {
                          longitude: event.target.value ? parseFloat(event.target.value) : undefined,
                        })
                      }
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                {hasCoordinates && mapsLink && (
                  <div className="mt-2">
                    <a
                      href={mapsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs font-medium text-primary hover:underline"
                    >
                      Buka di Google Maps
                    </a>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">Luas Tanah (m²)</label>
                <input
                  type="number"
                  value={asset.landArea}
                  onChange={(event) => onUpdateCollateral(index, { landArea: Number(event.target.value) })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Luas Bangunan (m²)</label>
                <input
                  type="number"
                  value={asset.buildingArea ?? ""}
                  onChange={(event) =>
                    onUpdateCollateral(index, {
                      buildingArea: event.target.value ? Number(event.target.value) : undefined,
                    })
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Status Hunian</label>
                <select
                  value={asset.occupancyStatus ?? ""}
                  onChange={(event) =>
                    onUpdateCollateral(index, {
                      occupancyStatus: event.target.value ? (event.target.value as CollateralItem["occupancyStatus"]) : undefined,
                    })
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Pilih status</option>
                  {occupancyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Catatan Hunian</label>
                <input
                  value={asset.occupancyNotes ?? ""}
                  onChange={(event) => onUpdateCollateral(index, { occupancyNotes: event.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            {asset.inspectionChecklist?.length ? (
              <div className="md:col-span-2">
                <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-slate-700">Checklist Inspeksi Lapangan</h4>
                    <span className="text-xs text-slate-500">Tandai hasil observasi saat kunjungan.</span>
                  </div>
                  <div className="space-y-3">
                    {asset.inspectionChecklist.map((item) => {
                      const yesActive = item.response === "yes";
                      const noActive = item.response === "no";
                      const naActive = item.response === "na";
                      const toggleResponse = (option: InspectionChecklistResponse) => {
                        const nextResponse = item.response === option ? undefined : option;
                        onUpdateInspectionChecklist(index, item.id, { response: nextResponse });
                      };
                      return (
                        <div key={item.id} className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-slate-700">{item.label}</p>
                              {item.category ? (
                                <p className="text-[11px] uppercase text-slate-400">{item.category}</p>
                              ) : null}
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => toggleResponse("yes")}
                                className={`rounded border px-3 py-1 text-xs font-semibold transition ${yesActive
                                  ? "border-emerald-500 bg-emerald-100 text-emerald-700"
                                  : "border-emerald-200 text-emerald-600 hover:border-emerald-400"
                                  }`}
                              >
                                Ya
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleResponse("no")}
                                className={`rounded border px-3 py-1 text-xs font-semibold transition ${noActive
                                  ? "border-rose-500 bg-rose-100 text-rose-700"
                                  : "border-rose-200 text-rose-600 hover:border-rose-400"
                                  }`}
                              >
                                Tidak
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleResponse("na")}
                                className={`rounded border px-3 py-1 text-xs font-semibold transition ${naActive
                                  ? "border-slate-500 bg-slate-100 text-slate-700"
                                  : "border-slate-200 text-slate-600 hover:border-slate-400"
                                  }`}
                              >
                                N/A
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] uppercase text-slate-400">Catatan</label>
                            <textarea
                              value={item.notes ?? ""}
                              onChange={(event) =>
                                onUpdateInspectionChecklist(index, item.id, { notes: event.target.value })
                              }
                              className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs"
                              rows={2}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="md:col-span-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-700">Dokumen Legalitas</h4>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateCollateral(index, {
                      legalDocuments: [
                        ...(asset.legalDocuments || []),
                        {
                          type: "SHM",
                          number: "",
                          issueDate: new Date().toISOString().slice(0, 10),
                        },
                      ],
                    })
                  }
                  className="text-xs font-medium text-primary hover:text-primary-dark"
                >
                  + Tambah Dokumen
                </button>
              </div>
              {asset.legalDocuments?.length ? (
                <div className="mt-3 space-y-4">
                  {asset.legalDocuments.map((doc, docIndex) => (
                    <div key={doc.id ?? docIndex} className="rounded-md border border-slate-200 bg-white p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700">{doc.type}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...(asset.legalDocuments || [])];
                            next.splice(docIndex, 1);
                            onUpdateCollateral(index, { legalDocuments: next });
                          }}
                          className="text-xs font-medium text-rose-600 hover:text-rose-700"
                        >
                          Hapus
                        </button>
                      </div>

                      {/* OCR Feature */}
                      <div className="mt-2 mb-3 bg-indigo-50 p-2 rounded-md border border-indigo-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">📄</span>
                          <div>
                            <p className="text-xs font-semibold text-indigo-800">Isi Otomatis dengan AI</p>
                            <p className="text-[10px] text-indigo-600">Upload foto/scan dokumen untuk ekstraksi data.</p>
                          </div>
                        </div>
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;

                              try {
                                // Show loading state (optional: add local state for loading)
                                e.target.value = ""; // Reset input
                                const result = await extractDocument(file);

                                // Update form with extracted data
                                const next = [...(asset.legalDocuments || [])];
                                next[docIndex] = {
                                  ...next[docIndex],
                                  type: result.type || next[docIndex].type,
                                  number: result.number || next[docIndex].number,
                                  issueDate: result.issueDate || next[docIndex].issueDate,
                                  holderName: result.holderName || next[docIndex].holderName, // Assuming holderName field exists or will be added
                                  area: result.area || next[docIndex].area,
                                };
                                onUpdateCollateral(index, { legalDocuments: next });
                                alert("Data berhasil diekstrak!");
                              } catch (error) {
                                console.error("OCR Failed:", error);
                                alert("Gagal mengekstrak dokumen.");
                              }
                            }}
                          />
                          <button className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded hover:bg-indigo-700 transition-colors pointer-events-none">
                            Upload & Scan
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="text-xs font-medium text-slate-500">Jenis Dokumen</label>
                          <select
                            value={doc.type}
                            onChange={(event) => {
                              const next = [...(asset.legalDocuments || [])];
                              next[docIndex] = { ...next[docIndex], type: event.target.value as CollateralItem["legalDocuments"][number]["type"] };
                              onUpdateCollateral(index, { legalDocuments: next });
                            }}
                            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                          >
                            {["SHM", "HGB", "AJB", "IMB", "Other"].map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-500">Nomor</label>
                          <input
                            value={doc.number}
                            onChange={(event) => {
                              const next = [...(asset.legalDocuments || [])];
                              next[docIndex] = { ...next[docIndex], number: event.target.value };
                              onUpdateCollateral(index, { legalDocuments: next });
                            }}
                            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-500">Tanggal Terbit</label>
                          <input
                            type="date"
                            value={doc.issueDate}
                            onChange={(event) => {
                              const next = [...(asset.legalDocuments || [])];
                              next[docIndex] = { ...next[docIndex], issueDate: event.target.value };
                              onUpdateCollateral(index, { legalDocuments: next });
                            }}
                            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-500">Tanggal Berakhir</label>
                          <input
                            type="date"
                            value={doc.dueDate ?? ""}
                            onChange={(event) => {
                              const next = [...(asset.legalDocuments || [])];
                              next[docIndex] = { ...next[docIndex], dueDate: event.target.value || undefined };
                              onUpdateCollateral(index, { legalDocuments: next });
                            }}
                            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                          />
                        </div>
                      </div>
                      <div className="mt-2 grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="text-xs font-medium text-slate-500">Pemegang Hak</label>
                          <input
                            value={doc.holderName ?? ""}
                            onChange={(event) => {
                              const next = [...(asset.legalDocuments || [])];
                              next[docIndex] = { ...next[docIndex], holderName: event.target.value };
                              onUpdateCollateral(index, { legalDocuments: next });
                            }}
                            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                            placeholder="Nama yang tercantum di sertifikat"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-500">Penerbit</label>
                          <input
                            value={doc.issuer ?? ""}
                            onChange={(event) => {
                              const next = [...(asset.legalDocuments || [])];
                              next[docIndex] = { ...next[docIndex], issuer: event.target.value };
                              onUpdateCollateral(index, { legalDocuments: next });
                            }}
                            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-500">Luas (m²)</label>
                          <input
                            type="number"
                            value={doc.area ?? ""}
                            onChange={(event) => {
                              const next = [...(asset.legalDocuments || [])];
                              next[docIndex] = {
                                ...next[docIndex],
                                area: event.target.value ? Number(event.target.value) : undefined,
                              };
                              onUpdateCollateral(index, { legalDocuments: next });
                            }}
                            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-500">Tanggal Pengingat</label>
                          <input
                            type="date"
                            value={doc.reminderDate ?? ""}
                            onChange={(event) => {
                              const next = [...(asset.legalDocuments || [])];
                              next[docIndex] = { ...next[docIndex], reminderDate: event.target.value || undefined };
                              onUpdateCollateral(index, { legalDocuments: next });
                            }}
                            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                          />
                        </div>
                      </div>
                      <div className="mt-2">
                        <label className="text-xs font-medium text-slate-500">Catatan</label>
                        <textarea
                          value={doc.notes ?? ""}
                          onChange={(event) => {
                            const next = [...(asset.legalDocuments || [])];
                            next[docIndex] = { ...next[docIndex], notes: event.target.value };
                            onUpdateCollateral(index, { legalDocuments: next });
                          }}
                          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">Belum ada dokumen legalitas ditambahkan.</p>
              )}
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={onAddCollateral}
        className="rounded-md border border-dashed border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10"
      >
        + Tambah Agunan
      </button>
    </div>
  );
}
