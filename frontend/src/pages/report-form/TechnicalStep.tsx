import type { MetadataResponse, ReportInputPayload } from "../../types/report";
import {
  FACILITY_FIELD_OPTIONS,
  TECHNICAL_FIELD_OPTIONS,
  UTILITY_FIELD_OPTIONS,
} from "./constants";
import { analyzeImage } from "../../lib/reportApi";


interface TechnicalStepProps {
  formData: ReportInputPayload;
  metadata: MetadataResponse | null;
  otherRisksText: string;
  positiveFactorsText: string;
  riskNotesText: string;
  onChangeOtherRisks: (value: string) => void;
  onChangePositiveFactors: (value: string) => void;
  onChangeRiskNotes: (value: string) => void;
  onUpdateTechnical: <K extends keyof ReportInputPayload["technical"]>(key: K, value: ReportInputPayload["technical"][K]) => void;
  onUpdateFacility: (key: keyof NonNullable<ReportInputPayload["facility"]>, value: string | number | undefined) => void;
  onUpdateEnvironment: <K extends keyof ReportInputPayload["environment"]>(
    key: K,
    value: ReportInputPayload["environment"][K],
  ) => void;
}

export function TechnicalStep({
  formData,
  metadata,
  otherRisksText,
  positiveFactorsText,
  riskNotesText,
  onChangeOtherRisks,
  onChangePositiveFactors,
  onChangeRiskNotes,
  onUpdateTechnical,
  onUpdateFacility,
  onUpdateEnvironment,
}: TechnicalStepProps) {
  const environmentCheckboxes: Array<[keyof ReportInputPayload["environment"], string]> = [
    ["hasImb", "IMB tersedia"],
    ["hasPbb", "PBB tahun terakhir"],
    ["hasAccessRoad", "Terdapat akses jalan masuk"],
    ["hasDisputeNotice", "Terdapat rambu / info sengketa"],
    ["floodProne", "Wilayah rawan banjir"],
    ["onWaqfLand", "Objek di atas tanah wakaf / sosial"],
    ["sutet", "Berada di bawah SUTET"],
    ["nearCemetery", "Berdekatan (<100 m) dari TPU"],
    ["nearWasteFacility", "Berdekatan (<100 m) dari TPA"],
    ["onGreenBelt", "Berada di jalur hijau"],
    ["carAccessible", "Jalan masuk bisa dilalui mobil"],
    ["nearIndustrial", "Dekat kawasan industri"],
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700">Spesifikasi Teknis</h3>

          {/* AI Visual Inspector */}
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                try {
                  // Reset input
                  e.target.value = "";

                  // Call AI API
                  const result = await analyzeImage(file);

                  // Update form fields
                  if (result.buildingStructure) onUpdateTechnical("buildingStructure", result.buildingStructure);
                  if (result.wallMaterial) onUpdateTechnical("wallMaterial", result.wallMaterial);
                  if (result.floorMaterial) onUpdateTechnical("floorMaterial", result.floorMaterial);
                  if (result.roofMaterial) onUpdateTechnical("roofMaterial", result.roofMaterial);
                  if (result.conditionNotes) onUpdateTechnical("conditionNotes", result.conditionNotes);

                  alert("Analisis visual selesai! Data teknis telah diperbarui.");
                } catch (error) {
                  console.error("CV Failed:", error);
                  alert("Gagal menganalisis gambar.");
                }
              }}
            />
            <button className="flex items-center gap-2 bg-indigo-600 text-white text-xs px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors pointer-events-none">
              <span>📷</span>
              <span>Analisis Foto Bangunan</span>
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {(
            [
              ["landShape", "Bentuk Tanah"],
              ["landTopography", "Topografi"],
              ["buildingStructure", "Struktur Bangunan"],
              ["wallMaterial", "Material Dinding"],
              ["floorMaterial", "Material Lantai"],
              ["roofMaterial", "Material Atap"],
              ["landUse", "Peruntukan"],
            ] as Array<[keyof ReportInputPayload["technical"], string]>
          ).map(([key, label]) => {
            const fallbackOptions =
              TECHNICAL_FIELD_OPTIONS[key as keyof typeof TECHNICAL_FIELD_OPTIONS] ?? [];
            const options =
              key === "landUse" && metadata?.lookups.landUseOptions?.length
                ? metadata.lookups.landUseOptions
                : fallbackOptions;
            return (
              <div key={key}>
                <label className="text-sm font-medium text-slate-600">{label}</label>
                <select
                  value={(formData.technical[key] as string) ?? ""}
                  onChange={(event) => onUpdateTechnical(key, event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">{`Pilih ${label}`}</option>
                  {options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
          <div>
            <label className="text-sm font-medium text-slate-600">Tahun Bangun</label>
            <input
              type="number"
              value={formData.technical.yearBuilt ?? ""}
              onChange={(event) => onUpdateTechnical("yearBuilt", Number(event.target.value) || undefined)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-600">Catatan Kondisi</label>
            <textarea
              value={formData.technical.conditionNotes ?? ""}
              onChange={(event) => onUpdateTechnical("conditionNotes", event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              rows={3}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-700">Fasilitas & Utilitas</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-600">Kelas Jalan</label>
            <select
              value={formData.facility?.roadClass ?? ""}
              onChange={(event) => onUpdateFacility("roadClass", event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Pilih Kelas Jalan</option>
              {FACILITY_FIELD_OPTIONS.roadClass.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600">Material Jalan</label>
            <select
              value={formData.facility?.roadMaterial ?? ""}
              onChange={(event) => onUpdateFacility("roadMaterial", event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Pilih Material Jalan</option>
              {FACILITY_FIELD_OPTIONS.roadMaterial.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600">Lebar Jalan (m)</label>
            <input
              type="number"
              value={formData.facility?.roadWidth ?? ""}
              onChange={(event) => onUpdateFacility("roadWidth", event.target.value ? Number(event.target.value) : undefined)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600">Transportasi</label>
            <select
              value={formData.facility?.transportAccess ?? ""}
              onChange={(event) => onUpdateFacility("transportAccess", event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Pilih Akses Transportasi</option>
              {FACILITY_FIELD_OPTIONS.transportAccess.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600">Utilitas Listrik</label>
            <select
              value={formData.technical.utilities.electricity}
              onChange={(event) => onUpdateTechnical("utilities", { ...formData.technical.utilities, electricity: event.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Pilih Kapasitas</option>
              {UTILITY_FIELD_OPTIONS.electricity.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600">Sumber Air</label>
            <select
              value={formData.technical.utilities.water}
              onChange={(event) => onUpdateTechnical("utilities", { ...formData.technical.utilities, water: event.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Pilih Sumber Air</option>
              {UTILITY_FIELD_OPTIONS.water.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600">Akses Jalan</label>
            <select
              value={formData.technical.utilities.roadAccess}
              onChange={(event) => onUpdateTechnical("utilities", { ...formData.technical.utilities, roadAccess: event.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Pilih Akses Jalan</option>
              {UTILITY_FIELD_OPTIONS.roadAccess.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600">Utilitas Lain</label>
            <select
              value={formData.technical.utilities.other ?? ""}
              onChange={(event) => onUpdateTechnical("utilities", { ...formData.technical.utilities, other: event.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Pilih</option>
              {UTILITY_FIELD_OPTIONS.other.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-700">Checklist Lingkungan</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {environmentCheckboxes.map(([key, label]) => (
            <label key={String(key)} className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={Boolean(formData.environment[key])}
                onChange={(event) => onUpdateEnvironment(key, event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              {label}
            </label>
          ))}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {(["boundaryNorth", "boundarySouth", "boundaryWest", "boundaryEast"] as const).map((key) => (
            <div key={key}>
              <label className="text-sm font-medium text-slate-600">Batas {key.replace("boundary", "")}</label>
              <input
                value={formData.environment[key] ?? ""}
                onChange={(event) => onUpdateEnvironment(key, event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-600">Catatan Risiko Lainnya</label>
            <textarea
              value={otherRisksText}
              onChange={(event) => onChangeOtherRisks(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              rows={3}
              placeholder="Pisahkan setiap risiko pada baris baru"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600">Faktor Positif Lingkungan</label>
            <textarea
              value={positiveFactorsText}
              onChange={(event) => onChangePositiveFactors(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              rows={3}
              placeholder="Pisahkan setiap faktor pada baris baru"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-600">Catatan Mitigasi Risiko</label>
            <textarea
              value={riskNotesText}
              onChange={(event) => onChangeRiskNotes(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              rows={3}
              placeholder="Uraikan langkah mitigasi untuk risiko yang ditandai"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
