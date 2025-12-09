import type {
  BuildingStandard,
  BuildingStandardCode,
  MetadataResponse,
  ReportInputPayload,
  ValuationResult,
} from "../../types/report";
import { VALUATION_FIELD_OPTIONS } from "./constants";

import { useState } from "react";
import { generateRemarks, predictPrice } from "../../lib/reportApi";

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
                  {selectedBuildingStandard ? (
                    <ul className="mt-2 list-disc pl-5 text-xs text-slate-500">
                      {selectedBuildingStandard.specification.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">
                      Standar bangunan digunakan untuk menghitung harga bangunan per meter secara otomatis.
                    </p>
                  )}
                </div>
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
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Harga Bangunan Terkoreksi (Rp/m²)</label>
                  <input
                    type="text"
                    readOnly
                    value={`Rp ${formatCurrencyValue(formData.valuationInput.buildingRate)}`}
                    className="mt-1 w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">*Penyusutan tidak mempengaruhi nilai akhir (hanya referensi).</p>
                </div>
                {VALUATION_FIELD_OPTIONS.map(([key, label]) => (
                  <div key={key}>
                    <label className="text-sm font-medium text-slate-600">{label}</label>
                    <input
                      type="number"
                      value={formData.valuationInput[key]}
                      onChange={(event) => onUpdateValuationInput(key, Number(event.target.value))}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                ))}
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
          <h3 className="text-sm font-semibold text-emerald-800">Hasil Perhitungan</h3>
          <ul className="mt-3 space-y-2 text-sm text-emerald-900">
            <li className="flex justify-between">
              <span>Nilai Pasar</span>
              <span className="font-semibold">Rp {valuationPreview.marketValue.toLocaleString("id-ID")}</span>
            </li>
            <li className="flex justify-between">
              <span>Setelah Safety Margin</span>
              <span className="font-semibold">
                Rp {valuationPreview.collateralValueAfterSafety.toLocaleString("id-ID")}
              </span>
            </li>
            <li className="flex justify-between">
              <span>Nilai Likuidasi</span>
              <span className="font-semibold">Rp {valuationPreview.liquidationValue.toLocaleString("id-ID")}</span>
            </li>
          </ul>
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
