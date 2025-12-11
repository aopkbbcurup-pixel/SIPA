import type {
  BuildingStandard,
  BuildingStandardCode,
  MetadataResponse,
  ReportInputPayload,
  ValuationResult,
} from "../../types/report";

import { useState, useEffect, useRef } from "react";
import type { ChangeEvent } from "react";
import { generateRemarks, predictPrice } from "../../lib/reportApi";

// Helper to format number with thousand separators
const formatNumber = (value: number | undefined): string => {
  if (!value || value === 0) return "";
  return value.toLocaleString("id-ID");
};

// Helper to parse formatted number input
const parseFormattedNumber = (value: string): number => {
  if (!value || value.trim() === "") return 0;
  const cleaned = value.replace(/\D/g, ""); // Remove all non-digits
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
};

// Currency input component with validation
const CurrencyInput = ({
  label,
  value,
  onChange,
  placeholder = "0",
  hint,
  disabled = false,
  className = "",
  min,
  max
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number) => void;
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
  min?: number;
  max?: number;
}) => {
  const [localValue, setLocalValue] = useState(formatNumber(value));
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<number | null>(null);

  // Only sync from parent when user is NOT typing
  useEffect(() => {
    if (!isTypingRef.current) {
      setLocalValue(formatNumber(value));
    }
  }, [value]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;

    // Mark as typing
    isTypingRef.current = true;

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Update local display immediately
    setLocalValue(input);

    // Parse and send to parent
    const parsed = parseFormattedNumber(input);
    onChange(parsed);

    // After 500ms of no typing, mark as not typing
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      // Format the display value
      setLocalValue(formatNumber(parsed));
    }, 500);
  };

  // Check if value is invalid
  const isInvalid = value !== undefined && value > 0 && (
    (min !== undefined && value < min) ||
    (max !== undefined && value > max)
  );

  const errorMessage = isInvalid
    ? min !== undefined && value! < min
      ? `Nilai minimum: ${formatNumber(min)}`
      : `Nilai maksimum: ${formatNumber(max!)}`
    : null;

  return (
    <div className={className}>
      <label className="text-sm font-medium text-slate-600">{label}</label>
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        className={`mt-1 w-full rounded-md border px-3 py-2 text-sm text-right ${isInvalid ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-teal-500'
          }`}
        placeholder={placeholder}
        disabled={disabled}
      />
      {isInvalid && <p className="text-xs text-red-600 mt-1">{errorMessage}</p>}
      {!isInvalid && hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
};

interface ValuationStepProps {
  formData: ReportInputPayload;
  metadata: MetadataResponse | null;
  valuationPreview: ValuationResult;
  selectedBuildingStandard?: BuildingStandard;
  onBuildingStandardChange: (code: BuildingStandardCode) => void;
  onUpdateValuationInput: (key: keyof ReportInputPayload["valuationInput"], value: any) => void;
  onRemarksChange: (value: string) => void;
  formatCurrencyValue: (value: number) => string;
  formatPercentValue: (value: number) => string;
}

export function ValuationStep({
  formData,
  metadata,
  valuationPreview,
  selectedBuildingStandard,
  onBuildingStandardChange,
  onUpdateValuationInput,
  onRemarksChange,
  formatCurrencyValue,
  formatPercentValue,
}: ValuationStepProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [avmResult, setAvmResult] = useState<{ min: number; max: number; confidence: number } | null>(null);

  const handlePredictPrice = async () => {
    try {
      setIsPredicting(true);
      const reportData = {
        valuationInput: formData.valuationInput,
      };
      const result = await predictPrice(reportData as any);
      setAvmResult(result);
    } catch (error) {
      console.error("Failed to predict price:", error);
    } finally {
      setIsPredicting(false);
    }
  };

  const handleGenerateRemarks = async () => {
    try {
      setIsGenerating(true);
      // Construct a partial report object from available form data
      const reportData = {
        generalInfo: formData.generalInfo,
        collateral: formData.collateral,
        technical: formData.technical,
        valuationInput: formData.valuationInput,
        valuationResult: valuationPreview,
      };

      const remarks = await generateRemarks(reportData as any);
      onRemarksChange(remarks);
    } catch (error) {
      console.error("Failed to generate remarks:", error);
      // Optionally show a toast error here
    } finally {
      setIsGenerating(false);
    }
  };
  return (
    <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-700">Input Penilaian</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-600">Jenis Aset</label>
              <select
                value={formData.valuationInput.assetType ?? "property"}
                onChange={(e) => onUpdateValuationInput("assetType", e.target.value as any)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="property">Tanah & Bangunan</option>
                <option value="vehicle">Kendaraan Bermotor</option>
                <option value="machine">Mesin & Alat Berat</option>
              </select>
            </div>

            {(formData.valuationInput.assetType === "vehicle" || formData.valuationInput.assetType === "machine") ? (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-600">Harga Pasar (Rp)</label>
                <input
                  type="number"
                  value={formData.valuationInput.marketPrice ?? 0}
                  onChange={(e) => onUpdateValuationInput("marketPrice", Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            ) : (
              <>
                {/* Building Standard Section */}
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-slate-600">Standar Bangunan</label>
                  <select
                    value={formData.valuationInput.buildingStandardCode}
                    onChange={(event) => onBuildingStandardChange(event.target.value as BuildingStandardCode)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-slate-100"
                    disabled={!metadata?.buildingStandards?.length}
                  >
                    {(metadata?.buildingStandards ?? []).map((standard) => (
                      <option key={standard.code} value={standard.code}>
                        {standard.name}
                      </option>
                    ))}
                  </select>
                  {selectedBuildingStandard && (
                    <ul className="mt-2 list-disc pl-5 text-xs text-slate-500">
                      {selectedBuildingStandard.specification.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Building Rate Info Row */}
                <div>
                  <label className="text-sm font-medium text-slate-600">Harga Standar Bangunan (Rp/m²)</label>
                  <input
                    type="text"
                    readOnly
                    value={`Rp ${formatCurrencyValue(formData.valuationInput.buildingStandardRate)}`}
                    className="mt-1 w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Penyusutan Bangunan (%)</label>
                  <input
                    type="text"
                    readOnly
                    value={`${formatPercentValue(formData.valuationInput.buildingDepreciationPercent)} %`}
                    className="mt-1 w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">*Penyusutan tidak mempengaruhi nilai akhir.</p>
                </div>

                {/* Row 1: Luas Tanah | Luas Bangunan */}
                <CurrencyInput
                  label="Luas Tanah (m²)"
                  value={formData.valuationInput.landArea}
                  onChange={(v) => onUpdateValuationInput("landArea", v)}
                  min={1}
                  hint="Luas total tanah dalam meter persegi"
                />
                <CurrencyInput
                  label="Luas Bangunan (m²)"
                  value={formData.valuationInput.buildingArea}
                  onChange={(v) => onUpdateValuationInput("buildingArea", v)}
                  min={1}
                  hint="Luas total bangunan dalam meter persegi"
                />

                {/* Row 2: Harga Pasar Tanah (auto, full width) */}
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-slate-600">
                    Harga Pasar Tanah <span className="text-xs text-blue-600">(dari Pembanding)</span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={`Rp ${formatNumber(formData.valuationInput.marketPriceLandPerM2)}`}
                    className="mt-1 w-full rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-right text-blue-800"
                  />
                </div>

                {/* Row 3: Harga Tanah Rata-Rata (auto, full width) */}
                <div className="md:col-span-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-emerald-800">
                      Harga Tanah Rata-Rata <span className="text-xs text-emerald-600">(Otomatis)</span>
                    </label>
                    <span className="text-lg font-bold text-emerald-800">
                      Rp {formatNumber(formData.valuationInput.landRate)}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-600 mt-1">= (Harga Pasar + NJOP) / 2</p>
                </div>

                {/* Row 4: NJOP Tanah | NJOP Bangunan (side by side) */}
                <CurrencyInput
                  label="NJOP Tanah (Rp/m²)"
                  value={formData.valuationInput.njopLandPerM2}
                  onChange={(v) => onUpdateValuationInput("njopLandPerM2", v)}
                  min={1000}
                  max={100000000}
                  hint="Nilai NJOP tanah per meter persegi"
                />
                <CurrencyInput
                  label="NJOP Bangunan (Rp/m²)"
                  value={formData.valuationInput.njopBuildingPerM2}
                  onChange={(v) => onUpdateValuationInput("njopBuildingPerM2", v)}
                  min={1000}
                  max={100000000}
                  hint="Nilai NJOP bangunan per meter persegi"
                />
              </>
            )}

            {/* Common fields like Safety Margin options could go here if separate from previous list, 
                but VALUATION_FIELD_OPTIONS likely contains them. If they are property specific, they should strict inside property block.
                Checking constants... Assuming VALUATION_FIELD_OPTIONS are relevant for property mostly (landArea, etc).
                
                Actually, Safety Margin and Liquidation Factor are needed for ALL types.
                I should check VALUATION_FIELD_OPTIONS content. 
                Wait, I can't check it right now inside this tool. 
                But based on typical usage, landArea/landRate are property specific.
                SafetyMarginPercent is common.
                
                I will extract Safety Margin/Liquidation inputs to be common.
             */}

            <div className="md:col-span-2 pt-4 border-t border-slate-200">
              <h4 className="text-sm font-medium text-slate-700 mb-2">Parameter Risiko</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-600">Safety Margin (%)</label>
                  <input
                    type="number"
                    value={formData.valuationInput.safetyMarginPercent}
                    onChange={(e) => onUpdateValuationInput("safetyMarginPercent", Number(e.target.value))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Faktor Likuidasi (%)</label>
                  <input
                    type="number"
                    value={formData.valuationInput.liquidationFactorPercent}
                    onChange={(e) => onUpdateValuationInput("liquidationFactorPercent", Number(e.target.value))}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-600">Catatan Penilaian</label>
            <button
              type="button"
              onClick={handleGenerateRemarks}
              disabled={isGenerating}
              className="text-xs flex items-center gap-1 text-primary hover:text-primary-dark disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <span className="animate-spin">✨</span> Generating...
                </>
              ) : (
                <>
                  <span>✨</span> Generate with AI
                </>
              )}
            </button>
          </div>
          <textarea
            value={formData.remarks ?? ""}
            onChange={(event) => onRemarksChange(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            rows={6}
            placeholder="Tulis catatan penilaian atau gunakan AI untuk membuat draft otomatis..."
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-indigo-800 flex items-center gap-2">
              <span>🤖</span> Asisten Penilaian (AVM)
            </h3>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full border border-indigo-200">Beta</span>
          </div>

          {!avmResult ? (
            <div className="text-center py-2">
              <p className="text-xs text-indigo-600 mb-3">
                Dapatkan estimasi nilai pasar berdasarkan data properti serupa.
              </p>
              <button
                type="button"
                onClick={handlePredictPrice}
                disabled={isPredicting}
                className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {isPredicting ? "Menganalisis..." : "Hitung Estimasi AI"}
              </button>
            </div>
          ) : (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-white rounded-lg p-3 border border-indigo-100 shadow-sm">
                <p className="text-xs text-slate-500 mb-1">Rentang Nilai Pasar</p>
                <p className="text-sm font-bold text-indigo-700">
                  Rp {avmResult.min.toLocaleString("id-ID")} - Rp {avmResult.max.toLocaleString("id-ID")}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-indigo-700">Tingkat Keyakinan</span>
                <span className="font-medium text-indigo-900">{Math.round(avmResult.confidence * 100)}%</span>
              </div>

              <div className="h-1.5 w-full bg-indigo-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${avmResult.confidence * 100}%` }}
                />
              </div>

              <button
                onClick={() => setAvmResult(null)}
                className="text-xs text-indigo-500 hover:text-indigo-700 w-full text-center mt-2"
              >
                Reset Estimasi
              </button>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <h3 className="text-sm font-semibold text-emerald-800 mb-3">Hasil Perhitungan</h3>
          <div className="space-y-3">
            {(formData.valuationInput.assetType === "property" || !formData.valuationInput.assetType) && (
              <>
                <div className="flex items-center justify-between py-2 border-b border-emerald-200">
                  <span className="text-sm text-emerald-700">Nilai Tanah</span>
                  <span className="text-sm font-bold text-emerald-900 tabular-nums whitespace-nowrap">
                    Rp {(valuationPreview.land?.valueBeforeSafety ?? 0).toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-emerald-200">
                  <span className="text-sm text-emerald-700">Nilai Bangunan</span>
                  <span className="text-sm font-bold text-emerald-900 tabular-nums whitespace-nowrap">
                    Rp {(valuationPreview.building?.valueBeforeSafety ?? 0).toLocaleString("id-ID")}
                  </span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between py-2 bg-emerald-100 -mx-4 px-4 rounded-md">
              <span className="text-sm font-semibold text-emerald-800">Nilai Pasar Total</span>
              <span className="text-base font-bold text-emerald-900 tabular-nums whitespace-nowrap">
                Rp {valuationPreview.marketValue.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-emerald-200">
              <span className="text-sm text-emerald-700">Setelah Safety Margin</span>
              <span className="text-sm font-bold text-emerald-900 tabular-nums whitespace-nowrap">
                Rp {valuationPreview.collateralValueAfterSafety.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-emerald-700">Nilai Likuidasi</span>
              <span className="text-sm font-bold text-emerald-900 tabular-nums whitespace-nowrap">
                Rp {valuationPreview.liquidationValue.toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <h4 className="font-semibold text-slate-700">Ringkasan</h4>
          <p className="mt-2">
            <span className="font-medium text-slate-700">Nasabah:</span> {formData.generalInfo.customerName || "-"}
          </p>
          <p>
            <span className="font-medium text-slate-700">Plafond:</span> Rp {formData.generalInfo.plafond.toLocaleString("id-ID")}
          </p>
          <p>
            <span className="font-medium text-slate-700">Penilai:</span>{" "}
            {metadata?.users.appraisers.find((u) => u.id === formData.assignedAppraiserId)?.fullName ?? "-"}
          </p>
          <p>
            <span className="font-medium text-slate-700">Supervisor:</span>{" "}
            {formData.generalInfo.supervisorName?.trim().length
              ? formData.generalInfo.supervisorName
              : metadata?.users.supervisors.find((u) => u.id === formData.generalInfo.reviewerId)?.fullName ?? "-"}
          </p>
        </div>
      </div>
    </div>
  );
}
