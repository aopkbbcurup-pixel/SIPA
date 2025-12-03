import type { MarketComparable, MetadataResponse } from "../../types/report";

interface ComparablesStepProps {
  comparables: MarketComparable[];
  metadata: MetadataResponse | null;
  totalWeight: number;
  onUpdateComparable: (index: number, updates: Partial<MarketComparable>) => void;
  onRemoveComparable: (index: number) => void;
  onAddComparable: () => void;
}

export function ComparablesStep({
  comparables,
  metadata,
  totalWeight,
  onUpdateComparable,
  onRemoveComparable,
  onAddComparable,
}: ComparablesStepProps) {
  const comparableCategoryOptions = metadata?.lookups.comparableCategories ?? [];

  return (
    <div className="space-y-6">
      {comparables.map((comp, index) => (
        <div key={comp.id ?? index} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Pembanding #{index + 1}</h3>
            {comparables.length > 1 && (
              <button
                type="button"
                onClick={() => onRemoveComparable(index)}
                className="text-xs font-medium text-rose-600 hover:text-rose-700"
              >
                Hapus
              </button>
            )}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-600">Sumber Data</label>
              <input
                value={comp.source}
                onChange={(event) => onUpdateComparable(index, { source: event.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Kategori</label>
              <select
                value={comp.category ?? ""}
                onChange={(event) =>
                  onUpdateComparable(index, {
                    category: event.target.value ? (event.target.value as MarketComparable["category"]) : undefined,
                  })
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Pilih Kategori</option>
                {comparableCategoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-600">Alamat / Lokasi</label>
              <textarea
                value={comp.address}
                onChange={(event) => onUpdateComparable(index, { address: event.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Jarak ke Objek (m)</label>
              <input
                type="number"
                value={comp.distance}
                onChange={(event) => onUpdateComparable(index, { distance: Number(event.target.value) })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Luas Tanah (m²)</label>
              <input
                type="number"
                value={comp.landArea}
                onChange={(event) => onUpdateComparable(index, { landArea: Number(event.target.value) })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Luas Bangunan (m²)</label>
              <input
                type="number"
                value={comp.buildingArea ?? ""}
                onChange={(event) =>
                  onUpdateComparable(index, {
                    buildingArea: event.target.value ? Number(event.target.value) : undefined,
                  })
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Harga Transaksi (Rp)</label>
              <input
                type="number"
                value={comp.price}
                onChange={(event) => onUpdateComparable(index, { price: Number(event.target.value) })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Harga per m² (Rp)</label>
              <input
                type="number"
                value={comp.pricePerSquare ?? ""}
                onChange={(event) =>
                  onUpdateComparable(index, {
                    pricePerSquare: event.target.value ? Number(event.target.value) : undefined,
                  })
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Harga Terkoreksi (Rp)</label>
              <input
                type="number"
                value={comp.adjustedPrice ?? ""}
                onChange={(event) =>
                  onUpdateComparable(index, {
                    adjustedPrice: event.target.value ? Number(event.target.value) : undefined,
                  })
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Harga per m² Terkoreksi (Rp)</label>
              <input
                type="number"
                value={comp.adjustedPricePerSquare ?? ""}
                onChange={(event) =>
                  onUpdateComparable(index, {
                    adjustedPricePerSquare: event.target.value ? Number(event.target.value) : undefined,
                  })
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Harga Akhir per m² (Rp)</label>
              <input
                type="number"
                value={comp.finalPricePerSquare ?? ""}
                onChange={(event) =>
                  onUpdateComparable(index, {
                    finalPricePerSquare: event.target.value ? Number(event.target.value) : undefined,
                  })
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Bobot (%)</label>
              <input
                type="number"
                value={comp.weight ?? ""}
                onChange={(event) =>
                  onUpdateComparable(index, {
                    weight: event.target.value ? Number(event.target.value) : undefined,
                  })
                }
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Tanggal Transaksi</label>
              <input
                type="date"
                value={comp.transactionDate ?? ""}
                onChange={(event) => onUpdateComparable(index, { transactionDate: event.target.value || undefined })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Kontak Narasumber</label>
              <input
                value={comp.contactInfo ?? ""}
                onChange={(event) => onUpdateComparable(index, { contactInfo: event.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-600">Catatan Tambahan</label>
              <textarea
                value={comp.notes ?? ""}
                onChange={(event) => onUpdateComparable(index, { notes: event.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                rows={3}
              />
            </div>
          </div>
        </div>
      ))}

      <div
        className={[
          "rounded-md border px-3 py-2 text-sm",
          Math.abs(totalWeight - 100) <= 0.5
            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
            : "border-amber-300 bg-amber-50 text-amber-700",
        ].join(" ")}
      >
        Total bobot pembanding: {totalWeight.toFixed(2)}%
      </div>

      <button
        type="button"
        onClick={onAddComparable}
        className="rounded-md border border-dashed border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10"
      >
        + Tambah Pembanding
      </button>
    </div>
  );
}
