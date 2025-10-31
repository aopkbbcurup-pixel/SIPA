import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createReport, fetchMetadata } from "../lib/reportApi";
import { calculateBuildingValuation } from "../lib/valuation";
import type {
  BuildingStandard,
  BuildingStandardCode,
  CollateralItem,
  MarketComparable,
  MetadataResponse,
  ReportInputPayload,
  ValuationResult,
} from "../types/report";
import { useAuthStore } from "../store/auth";

const steps = [
  { title: "Informasi Umum", description: "Data permohonan kredit" },
  { title: "Objek Agunan", description: "Detail aset agunan" },
  { title: "Teknis & Lingkungan", description: "Kondisi fisik dan lingkungan" },
  { title: "Data Pembanding", description: "Referensi pasar" },
  { title: "Penilaian & Review", description: "Perhitungan nilai agunan" },
];

const defaultCollateral: CollateralItem = {
  name: "",
  kind: "residential",
  address: "",
  landArea: 0,
  buildingArea: 0,
  legalDocuments: [],
};

const defaultComparable: MarketComparable = {
  source: "",
  address: "",
  distance: 0,
  landArea: 0,
  price: 0,
};

const defaultForm: ReportInputPayload = {
  title: "",
  assignedAppraiserId: "",
  generalInfo: {
    customerName: "",
    customerAddress: "",
    plafond: 0,
    creditPurpose: "",
    unit: "",
    reportType: "Penilaian Agunan",
    reportDate: new Date().toISOString().slice(0, 10),
    requestDate: new Date().toISOString().slice(0, 10),
    otsSchedule: new Date().toISOString().slice(0, 10),
    requestLetterNumber: "",
    requestLetterDate: new Date().toISOString().slice(0, 10),
    requestReceivedAt: new Date().toISOString(),
    requestCompletedAt: new Date().toISOString(),
    appraisalDate: new Date().toISOString().slice(0, 10),
    valuationPurpose: "Penjaminan Utang",
    valuationType: "Baru",
    valuationApproach: "Pendekatan Pasar",
    appraiserName: "",
    fieldContactName: "",
    fieldContactRelation: "",
    fieldContactPhone: "",
  },
  collateral: [defaultCollateral],
  technical: {
    landShape: "",
    landTopography: "",
    buildingStructure: "",
    wallMaterial: "",
    floorMaterial: "",
    roofMaterial: "",
    yearBuilt: undefined,
    conditionNotes: "",
    utilities: {
      electricity: "",
      water: "",
      roadAccess: "",
      other: "",
    },
  },
  environment: {
    hasImb: false,
    hasPbb: false,
    hasAccessRoad: true,
    hasDisputeNotice: false,
    floodProne: false,
    sutet: false,
    nearCemetery: false,
    nearIndustrial: false,
    nearWasteFacility: false,
    onWaqfLand: false,
    onGreenBelt: false,
    carAccessible: true,
    boundaryNorth: "",
    boundarySouth: "",
    boundaryWest: "",
    boundaryEast: "",
    otherRisks: [],
    positiveFactors: [],
  },
  facility: {
    roadClass: "",
    roadMaterial: "",
    facilityCompleteness: "",
    roadWidth: undefined,
    transportAccess: "",
    electricityCapacity: "",
    waterSource: "",
    floorPosition: "",
  },
  comparables: [defaultComparable],
  valuationInput: {
    landArea: 0,
    buildingArea: 0,
    landRate: 0,
    buildingStandardCode: "house_one_story_type_a",
    buildingStandardRate: 0,
    buildingDepreciationPercent: 0,
    buildingRate: 0,
    njopLand: 0,
    njopBuilding: 0,
    safetyMarginPercent: 20,
    liquidationFactorPercent: 60,
  },
};

const TECHNICAL_FIELD_OPTIONS: Record<
  "landShape" | "landTopography" | "buildingStructure" | "wallMaterial" | "floorMaterial" | "roofMaterial",
  string[]
> = {
  landShape: ["Persegi", "Persegi Panjang", "Trapesium", "Segitiga", "Tidak Beraturan"],
  landTopography: ["Datar", "Miring Ringan", "Miring Curam", "Bergelombang", "Berkontur"],
  buildingStructure: ["Beton Bertulang", "Baja", "Kayu", "Campuran", "Prefab"],
  wallMaterial: ["Bata Merah", "Batako", "Beton", "Kayu", "GRC", "Kaca"],
  floorMaterial: ["Keramik", "Granit", "Marmer", "Teraso", "Semen Plester", "Vinyl"],
  roofMaterial: ["Genteng Keramik", "Genteng Beton", "Genteng Metal", "Seng", "Asbes", "Dak Beton"],
};

const FACILITY_FIELD_OPTIONS: Record<
  "roadClass" | "roadMaterial" | "facilityCompleteness" | "transportAccess" | "electricityCapacity" | "waterSource" | "floorPosition",
  string[]
> = {
  roadClass: ["Lingkungan", "Lokal", "Kolektor", "Arteri"],
  roadMaterial: ["Aspal", "Beton", "Paving", "Kerikil", "Tanah"],
  facilityCompleteness: ["Lengkap", "Cukup", "Minimal"],
  transportAccess: ["Transportasi Umum", "Angkot", "Bus Besar", "Kereta/Commuter", "Transportasi Online", "Tidak Ada"],
  electricityCapacity: ["450 VA", "900 VA", "1300 VA", "2200 VA", "3500 VA", "4400 VA", "5500 VA", "> 5500 VA"],
  waterSource: ["PDAM", "Sumur Bor", "Sumur Dangkal", "Mata Air", "Air Isi Ulang", "Tandon Bersama"],
  floorPosition: ["Basement", "Lantai Dasar", "Lantai Menengah", "Lantai Atas", "Atap/Teras"],
};

const UTILITY_FIELD_OPTIONS: Record<"electricity" | "water" | "roadAccess" | "other", string[]> = {
  electricity: FACILITY_FIELD_OPTIONS.electricityCapacity,
  water: FACILITY_FIELD_OPTIONS.waterSource,
  roadAccess: ["Aspal", "Beton", "Paving", "Kerikil", "Tanah", "Gang Beton"],
  other: ["Telepon Rumah", "Internet Fiber", "Internet Wireless", "Drainase Tertutup", "Drainase Terbuka", "Lampu Jalan", "Pemadam Kebakaran", "Tidak Ada"],
};

const VALUATION_FIELD_OPTIONS: Array<[keyof ReportInputPayload["valuationInput"], string]> = [
  ["landArea", "Luas Tanah (m2)"],
  ["buildingArea", "Luas Bangunan (m2)"],
  ["landRate", "Harga Tanah (Rp/m2)"],
  ["njopLand", "Nilai NJOP Tanah (Rp)"],
  ["njopBuilding", "Nilai NJOP Bangunan (Rp)"],
  ["safetyMarginPercent", "Safety Margin (%)"],
  ["liquidationFactorPercent", "Faktor Likuidasi (%)"],
];

function calculateValuation(input: ReportInputPayload["valuationInput"]): ValuationResult {
  const landValue = input.landArea * input.landRate;
  const buildingValue = input.buildingArea * input.buildingRate;
  const marketValue = landValue + buildingValue;
  const safetyDeduction = (marketValue * input.safetyMarginPercent) / 100;
  const collateralAfterSafety = marketValue - safetyDeduction;
  const liquidation = (collateralAfterSafety * input.liquidationFactorPercent) / 100;
  return {
    marketValue: Math.round(marketValue),
    marketValueBeforeSafety: Math.round(marketValue),
    collateralValueAfterSafety: Math.round(collateralAfterSafety),
    liquidationValue: Math.round(liquidation),
  };
}

export function ReportFormPage() {
  const navigate = useNavigate();
  const authUser = useAuthStore((state) => state.user);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<ReportInputPayload>({
    ...defaultForm,
    generalInfo: {
      ...defaultForm.generalInfo,
      unit: authUser?.unit ?? "",
      appraiserName: authUser?.fullName ?? defaultForm.generalInfo.appraiserName,
    },
  });
  const [metadata, setMetadata] = useState<MetadataResponse | null>(null);
  const [otherRisksText, setOtherRisksText] = useState("");
  const [positiveFactorsText, setPositiveFactorsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchMetadata()
      .then((data) => {
        if (!isMounted) return;
        setMetadata(data);
        setFormData((prev) => {
          const defaultAppraiser = data.users.appraisers[0];
          const assignedAppraiserId = prev.assignedAppraiserId || defaultAppraiser?.id || "";
          const next: ReportInputPayload = {
            ...prev,
            assignedAppraiserId,
            generalInfo: {
              ...prev.generalInfo,
              reviewerId: prev.generalInfo.reviewerId || data.users.supervisors[0]?.id,
              appraiserName:
                prev.generalInfo.appraiserName || defaultAppraiser?.fullName || prev.generalInfo.appraiserName,
            },
          };
          return applyBuildingValuation(next);
        });
      })
      .catch((err) => {
        if (isMounted) {
          const message = err instanceof Error ? err.message : "Gagal memuat metadata";
          setError(message);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const valuationPreview = useMemo(() => calculateValuation(formData.valuationInput), [formData.valuationInput]);

  const applyBuildingValuation = (
    draft: ReportInputPayload,
    preferredCode?: BuildingStandardCode,
  ): ReportInputPayload => {
    if (!metadata?.buildingStandards?.length) {
      if (preferredCode) {
        return {
          ...draft,
          valuationInput: {
            ...draft.valuationInput,
            buildingStandardCode: preferredCode,
          },
        };
      }
      return draft;
    }

    const standards = metadata.buildingStandards;
    const depreciationRules = metadata.parameters.buildingDepreciationRules ?? [];
    const targetCode = preferredCode ?? draft.valuationInput.buildingStandardCode ?? standards[0].code;
    const selectedStandard = standards.find((item) => item.code === targetCode) ?? standards[0];
    const valuation = calculateBuildingValuation({
      standard: selectedStandard,
      yearBuilt: draft.technical.yearBuilt,
      appraisalDate: draft.generalInfo.appraisalDate,
      depreciationRules,
    });

    return {
      ...draft,
      valuationInput: {
        ...draft.valuationInput,
        buildingStandardCode: selectedStandard.code,
        buildingStandardRate: valuation.standardRate,
        buildingDepreciationPercent: valuation.depreciationPercent,
        buildingRate: valuation.adjustedRate,
      },
    };
  };

const selectedBuildingStandard: BuildingStandard | undefined = useMemo(() => {
  if (!metadata?.buildingStandards?.length) {
    return undefined;
  }
  const code = formData.valuationInput.buildingStandardCode;
  return metadata.buildingStandards.find((item) => item.code === code) ?? metadata.buildingStandards[0];
}, [metadata, formData.valuationInput.buildingStandardCode]);

  const formatCurrencyValue = (value: number) =>
    Number.isFinite(value) && value !== 0 ? value.toLocaleString("id-ID") : "0";
  const formatPercentValue = (value: number) => (Number.isFinite(value) ? value.toLocaleString("id-ID") : "0");

  const updateGeneralInfo = (key: keyof ReportInputPayload["generalInfo"], value: string | number) => {
    setFormData((prev) => {
      const next: ReportInputPayload = {
        ...prev,
        generalInfo: {
          ...prev.generalInfo,
          [key]: value,
        },
      };
      if (key === "appraisalDate") {
        return applyBuildingValuation(next);
      }
      return next;
    });
  };

  const toDateInputValue = (value?: string) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toISOString().slice(0, 10);
  };

  const toDateTimeInputValue = (value?: string) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    const offsetMillis = parsed.getTime() - parsed.getTimezoneOffset() * 60000;
    return new Date(offsetMillis).toISOString().slice(0, 16);
  };

  const updateGeneralDateTime = (key: keyof ReportInputPayload["generalInfo"], value: string) => {
    updateGeneralInfo(key, value ? new Date(value).toISOString() : "");
  };

const updateTechnical = (key: keyof ReportInputPayload["technical"], value: any) => {
  setFormData((prev) => {
    const next: ReportInputPayload = {
      ...prev,
      technical: {
        ...prev.technical,
        [key]: value,
      },
    };
    if (key === "yearBuilt") {
      return applyBuildingValuation(next);
    }
    return next;
  });
};

  const updateUtility = (key: keyof ReportInputPayload["technical"]["utilities"], value: string) => {
    setFormData((prev) => ({
      ...prev,
      technical: {
        ...prev.technical,
        utilities: {
          ...prev.technical.utilities,
          [key]: value,
        },
      },
    }));
  };

  const updateEnvironment = (key: keyof ReportInputPayload["environment"], value: any) => {
    setFormData((prev) => ({
      ...prev,
      environment: {
        ...prev.environment,
        [key]: value,
      },
    }));
  };

  const updateFacility = (key: keyof NonNullable<ReportInputPayload["facility"]>, value: string | number | undefined) => {
    setFormData((prev) => ({
      ...prev,
      facility: {
        ...(prev.facility ?? {}),
        [key]: value,
      },
    }));
  };

  const updateValuationInput = (key: keyof ReportInputPayload["valuationInput"], value: number) => {
    setFormData((prev) => ({
      ...prev,
      valuationInput: {
        ...prev.valuationInput,
        [key]: Number.isNaN(value) ? 0 : value,
      },
    }));
  };

  const updateCollateral = (index: number, value: Partial<CollateralItem>) => {
    setFormData((prev) => {
      const next = [...prev.collateral];
      next[index] = { ...next[index], ...value };
      return { ...prev, collateral: next };
    });
  };

  const addCollateral = () => {
    setFormData((prev) => ({ ...prev, collateral: [...prev.collateral, { ...defaultCollateral }] }));
  };

  const removeCollateral = (index: number) => {
    setFormData((prev) => {
      const next = [...prev.collateral];
      next.splice(index, 1);
      return { ...prev, collateral: next.length ? next : [{ ...defaultCollateral }] };
    });
  };

  const updateComparable = (index: number, value: Partial<MarketComparable>) => {
    setFormData((prev) => {
      const next = [...prev.comparables];
      next[index] = { ...next[index], ...value };
      return { ...prev, comparables: next };
    });
  };

  const addComparable = () => {
    setFormData((prev) => ({ ...prev, comparables: [...prev.comparables, { ...defaultComparable }] }));
  };

  const removeComparable = (index: number) => {
    setFormData((prev) => {
      const next = [...prev.comparables];
      next.splice(index, 1);
      return { ...prev, comparables: next.length ? next : [{ ...defaultComparable }] };
    });
  };

  const goNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep((prev) => prev + 1);
  };

  const goPrev = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: ReportInputPayload = {
        ...formData,
        environment: {
          ...formData.environment,
          otherRisks: otherRisksText.split("\n").map((item) => item.trim()).filter(Boolean),
          positiveFactors: positiveFactorsText.split("\n").map((item) => item.trim()).filter(Boolean),
        },
      };
      const preparedPayload = applyBuildingValuation(payload);
      const report = await createReport(preparedPayload);
      setSuccessMessage("Laporan berhasil dibuat. Mengalihkan ke detail...");
      setTimeout(() => navigate(`/reports/${report.id}`), 1200);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menyimpan laporan";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const renderGeneralStep = () => (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-600">Judul Laporan</label>
          <input
            value={formData.title}
            onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Penilaian Agunan Rumah Tinggal"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Jenis Laporan</label>
          <input
            value={formData.generalInfo.reportType ?? ""}
            onChange={(event) => updateGeneralInfo("reportType", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Penilaian Agunan"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Tanggal Laporan</label>
          <input
            type="date"
            value={toDateInputValue(formData.generalInfo.reportDate)}
            onChange={(event) => updateGeneralInfo("reportDate", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Penilai Penanggung Jawab</label>
          <select
            value={formData.assignedAppraiserId}
            onChange={(event) => {
              const value = event.target.value;
              const selected = metadata?.users.appraisers.find((user) => user.id === value);
              setFormData((prev) => ({
                ...prev,
                assignedAppraiserId: value,
                generalInfo: {
                  ...prev.generalInfo,
                  appraiserName: selected?.fullName ?? prev.generalInfo.appraiserName,
                },
              }));
            }}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Pilih Penilai</option>
            {metadata?.users.appraisers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.fullName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Nama Penilai</label>
          <input
            value={formData.generalInfo.appraiserName ?? ""}
            onChange={(event) => updateGeneralInfo("appraiserName", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-600">Nama Nasabah</label>
          <input
            value={formData.generalInfo.customerName}
            onChange={(event) => updateGeneralInfo("customerName", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Plafond Permohonan (Rp)</label>
          <input
            type="number"
            value={formData.generalInfo.plafond}
            onChange={(event) => updateGeneralInfo("plafond", Number(event.target.value))}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-600">Alamat Nasabah</label>
          <textarea
            value={formData.generalInfo.customerAddress ?? ""}
            onChange={(event) => updateGeneralInfo("customerAddress", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            rows={3}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Tujuan Kredit</label>
          <input
            value={formData.generalInfo.creditPurpose}
            onChange={(event) => updateGeneralInfo("creditPurpose", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Modal kerja, investasi, konsumtif"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Unit Kerja Pemohon</label>
          <input
            value={formData.generalInfo.unit}
            onChange={(event) => updateGeneralInfo("unit", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Tujuan Penilaian</label>
          <input
            value={formData.generalInfo.valuationPurpose ?? ""}
            onChange={(event) => updateGeneralInfo("valuationPurpose", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Jenis Penilaian</label>
          <select
            value={formData.generalInfo.valuationType ?? ""}
            onChange={(event) => updateGeneralInfo("valuationType", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Pilih</option>
            <option value="Baru">Baru</option>
            <option value="Ulang">Ulang</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-slate-600">Pendekatan Penilaian</label>
          <input
            value={formData.generalInfo.valuationApproach ?? ""}
            onChange={(event) => updateGeneralInfo("valuationApproach", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Pendekatan Pasar"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-600">No. Memo / Surat Permohonan</label>
          <input
            value={formData.generalInfo.requestLetterNumber ?? ""}
            onChange={(event) => updateGeneralInfo("requestLetterNumber", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Tanggal Surat Permohonan</label>
          <input
            type="date"
            value={toDateInputValue(formData.generalInfo.requestLetterDate)}
            onChange={(event) => updateGeneralInfo("requestLetterDate", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Tanggal Surat Diterima</label>
          <input
            type="datetime-local"
            value={toDateTimeInputValue(formData.generalInfo.requestReceivedAt)}
            onChange={(event) => updateGeneralDateTime("requestReceivedAt", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Tanggal Data Lengkap</label>
          <input
            type="datetime-local"
            value={toDateTimeInputValue(formData.generalInfo.requestCompletedAt)}
            onChange={(event) => updateGeneralDateTime("requestCompletedAt", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Tanggal Permohonan</label>
          <input
            type="date"
            value={toDateInputValue(formData.generalInfo.requestDate)}
            onChange={(event) => updateGeneralInfo("requestDate", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Tanggal OTS / Kunjungan</label>
          <input
            type="date"
            value={toDateInputValue(formData.generalInfo.otsSchedule)}
            onChange={(event) => updateGeneralInfo("otsSchedule", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Tanggal Penilaian</label>
          <input
            type="date"
            value={toDateInputValue(formData.generalInfo.appraisalDate)}
            onChange={(event) => updateGeneralInfo("appraisalDate", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-600">Contact Person Lapangan</label>
          <input
            value={formData.generalInfo.fieldContactName ?? ""}
            onChange={(event) => updateGeneralInfo("fieldContactName", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Nama pendamping OTS"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Relasi Contact Person</label>
          <input
            value={formData.generalInfo.fieldContactRelation ?? ""}
            onChange={(event) => updateGeneralInfo("fieldContactRelation", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Pemilik / Penghuni / dsb"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">No. Kontak Lapangan</label>
          <input
            value={formData.generalInfo.fieldContactPhone ?? ""}
            onChange={(event) => updateGeneralInfo("fieldContactPhone", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="0812xxxxxxx"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Supervisor Reviewer</label>
          <select
            value={formData.generalInfo.reviewerId || ""}
            onChange={(event) => updateGeneralInfo("reviewerId", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Pilih Supervisor</option>
            {metadata?.users.supervisors.map((user) => (
              <option key={user.id} value={user.id}>
                {user.fullName}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  const renderCollateralStep = () => (
    <div className="space-y-6">
      {formData.collateral.map((asset, index) => (
        <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Agunan #{index + 1}</h3>
            {formData.collateral.length > 1 && (
              <button
                type="button"
                onClick={() => removeCollateral(index)}
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
                onChange={(event) => updateCollateral(index, { name: event.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Jenis Agunan</label>
              <select
                value={asset.kind}
                onChange={(event) => updateCollateral(index, { kind: event.target.value as CollateralItem["kind"] })}
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
                onChange={(event) => updateCollateral(index, { address: event.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Luas Tanah (m2)</label>
              <input
                type="number"
                value={asset.landArea}
                onChange={(event) => updateCollateral(index, { landArea: Number(event.target.value) })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Luas Bangunan (m2)</label>
              <input
                type="number"
                value={asset.buildingArea ?? 0}
                onChange={(event) => updateCollateral(index, { buildingArea: Number(event.target.value) })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mt-4 rounded-md border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-700">Dokumen Legalitas</h4>
              <button
                type="button"
                onClick={() =>
                  updateCollateral(index, {
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
              <div className="mt-3 space-y-3">
                {asset.legalDocuments.map((doc, docIndex) => (
                  <div key={docIndex} className="rounded-md border border-slate-200 p-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Dokumen #{docIndex + 1}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = [...(asset.legalDocuments || [])];
                          next.splice(docIndex, 1);
                          updateCollateral(index, { legalDocuments: next });
                        }}
                        className="font-medium text-rose-500 hover:text-rose-600"
                      >
                        Hapus
                      </button>
                    </div>
                    <div className="mt-2 grid gap-3 md:grid-cols-3">
                      <div>
                        <label className="text-xs font-medium text-slate-500">Jenis</label>
                        <select
                          value={doc.type}
                          onChange={(event) => {
                            const next = [...(asset.legalDocuments || [])];
                            next[docIndex] = { ...next[docIndex], type: event.target.value as typeof doc.type };
                            updateCollateral(index, { legalDocuments: next });
                          }}
                          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                        >
                          <option value="SHM">SHM</option>
                          <option value="HGB">HGB</option>
                          <option value="AJB">AJB</option>
                          <option value="IMB">IMB</option>
                          <option value="Other">Lainnya</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500">Nomor</label>
                        <input
                          value={doc.number}
                          onChange={(event) => {
                            const next = [...(asset.legalDocuments || [])];
                            next[docIndex] = { ...next[docIndex], number: event.target.value };
                            updateCollateral(index, { legalDocuments: next });
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
                            updateCollateral(index, { legalDocuments: next });
                          }}
                          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">Belum ada dokumen legalitas ditambahkan.</p>
            )}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addCollateral}
        className="rounded-md border border-dashed border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10"
      >
        + Tambah Agunan
      </button>
    </div>
  );

  const renderTechnicalStep = () => {
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
          <h3 className="text-sm font-semibold text-slate-700">Spesifikasi Teknis</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {(
              [
                ["landShape", "Bentuk Tanah"],
                ["landTopography", "Topografi"],
                ["buildingStructure", "Struktur Bangunan"],
                ["wallMaterial", "Material Dinding"],
                ["floorMaterial", "Material Lantai"],
                ["roofMaterial", "Material Atap"],
              ] as Array<[keyof ReportInputPayload["technical"], string]>
            ).map(([key, label]) => (
              <div key={key}>
                <label className="text-sm font-medium text-slate-600">{label}</label>
                <select
                  value={(formData.technical[key] as string) ?? ""}
                  onChange={(event) => updateTechnical(key, event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">{`Pilih ${label}`}</option>
                  {TECHNICAL_FIELD_OPTIONS[key as keyof typeof TECHNICAL_FIELD_OPTIONS]?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <div>
              <label className="text-sm font-medium text-slate-600">Tahun Bangun</label>
              <input
                type="number"
                value={formData.technical.yearBuilt ?? ""}
                onChange={(event) => updateTechnical("yearBuilt", Number(event.target.value) || undefined)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-600">Catatan Kondisi</label>
              <textarea
                value={formData.technical.conditionNotes ?? ""}
                onChange={(event) => updateTechnical("conditionNotes", event.target.value)}
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
                onChange={(event) => updateFacility("roadClass", event.target.value)}
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
                onChange={(event) => updateFacility("roadMaterial", event.target.value)}
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
                onChange={(event) => updateFacility("roadWidth", event.target.value ? Number(event.target.value) : undefined)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Angkutan / Akses Transportasi</label>
              <select
                value={formData.facility?.transportAccess ?? ""}
                onChange={(event) => updateFacility("transportAccess", event.target.value)}
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
              <label className="text-sm font-medium text-slate-600">Kelengkapan Fasilitas</label>
              <select
                value={formData.facility?.facilityCompleteness ?? ""}
                onChange={(event) => updateFacility("facilityCompleteness", event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Pilih Kelengkapan Fasilitas</option>
                {FACILITY_FIELD_OPTIONS.facilityCompleteness.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Listrik (kWh)</label>
              <select
                value={formData.facility?.electricityCapacity ?? formData.technical.utilities.electricity ?? ""}
                onChange={(event) => {
                  updateFacility("electricityCapacity", event.target.value);
                  updateUtility("electricity", event.target.value);
                }}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Pilih Kapasitas Listrik</option>
                {FACILITY_FIELD_OPTIONS.electricityCapacity.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Sumber Air</label>
              <select
                value={formData.facility?.waterSource ?? formData.technical.utilities.water ?? ""}
                onChange={(event) => {
                  updateFacility("waterSource", event.target.value);
                  updateUtility("water", event.target.value);
                }}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Pilih Sumber Air</option>
                {FACILITY_FIELD_OPTIONS.waterSource.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Posisi Lantai</label>
              <select
                value={formData.facility?.floorPosition ?? ""}
                onChange={(event) => updateFacility("floorPosition", event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Pilih Posisi Lantai</option>
                {FACILITY_FIELD_OPTIONS.floorPosition.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-600">Akses Jalan</label>
              <select
                value={formData.technical.utilities.roadAccess ?? ""}
                onChange={(event) => updateUtility("roadAccess", event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Pilih Jenis Akses Jalan</option>
                {UTILITY_FIELD_OPTIONS.roadAccess.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Utilitas Lainnya</label>
              <select
                value={formData.technical.utilities.other ?? ""}
                onChange={(event) => updateUtility("other", event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Pilih Utilitas Lainnya</option>
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
                  onChange={(event) => updateEnvironment(key, event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                {label}
              </label>
            ))}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-600">Batas Utara</label>
              <input
                value={formData.environment.boundaryNorth ?? ""}
                onChange={(event) => updateEnvironment("boundaryNorth", event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Batas Selatan</label>
              <input
                value={formData.environment.boundarySouth ?? ""}
                onChange={(event) => updateEnvironment("boundarySouth", event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Batas Barat</label>
              <input
                value={formData.environment.boundaryWest ?? ""}
                onChange={(event) => updateEnvironment("boundaryWest", event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Batas Timur</label>
              <input
                value={formData.environment.boundaryEast ?? ""}
                onChange={(event) => updateEnvironment("boundaryEast", event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-600">Catatan Risiko Lainnya</label>
              <textarea
                value={otherRisksText}
                onChange={(event) => setOtherRisksText(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                rows={3}
                placeholder="Pisahkan setiap risiko pada baris baru"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Faktor Positif Lingkungan</label>
              <textarea
                value={positiveFactorsText}
                onChange={(event) => setPositiveFactorsText(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                rows={3}
                placeholder="Pisahkan setiap faktor pada baris baru"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderComparableStep = () => (
    <div className="space-y-6">
      {formData.comparables.map((comp, index) => (
        <div key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Pembanding #{index + 1}</h3>
            {formData.comparables.length > 1 && (
              <button
                type="button"
                onClick={() => removeComparable(index)}
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
                onChange={(event) => updateComparable(index, { source: event.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Alamat</label>
              <input
                value={comp.address}
                onChange={(event) => updateComparable(index, { address: event.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Jarak (km)</label>
              <input
                type="number"
                value={comp.distance}
                onChange={(event) => updateComparable(index, { distance: Number(event.target.value) })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Luas Tanah (m2)</label>
              <input
                type="number"
                value={comp.landArea}
                onChange={(event) => updateComparable(index, { landArea: Number(event.target.value) })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Luas Bangunan (m2)</label>
              <input
                type="number"
                value={comp.buildingArea ?? 0}
                onChange={(event) => updateComparable(index, { buildingArea: Number(event.target.value) })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Harga Transaksi (Rp)</label>
              <input
                type="number"
                value={comp.price}
                onChange={(event) => updateComparable(index, { price: Number(event.target.value) })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Harga per mÂ²</label>
              <input
                type="number"
                value={comp.pricePerSquare ?? 0}
                onChange={(event) => updateComparable(index, { pricePerSquare: Number(event.target.value) })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-600">Catatan</label>
              <textarea
                value={comp.notes ?? ""}
                onChange={(event) => updateComparable(index, { notes: event.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                rows={2}
              />
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={addComparable}
        className="rounded-md border border-dashed border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10"
      >
        + Tambah Pembanding
      </button>
    </div>
  );

  const renderValuationStep = () => (
    <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-700">Input Penilaian</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-600">Standar Bangunan</label>
              <select
                value={formData.valuationInput.buildingStandardCode}
                onChange={(event) =>
                  setFormData((prev) => applyBuildingValuation(prev, event.target.value as BuildingStandardCode))
                }
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
              <label className="text-sm font-medium text-slate-600">Harga Standar Bangunan (Rp/m2)</label>
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
              <label className="text-sm font-medium text-slate-600">Harga Bangunan Terkoreksi (Rp/m2)</label>
              <input
                type="text"
                readOnly
                value={`Rp ${formatCurrencyValue(formData.valuationInput.buildingRate)}`}
                className="mt-1 w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700"
              />
            </div>
            {VALUATION_FIELD_OPTIONS.map(([key, label]) => (
              <div key={key}>
                <label className="text-sm font-medium text-slate-600">{label}</label>
                <input
                  type="number"
                  value={formData.valuationInput[key]}
                  onChange={(event) => updateValuationInput(key, Number(event.target.value))}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-600">Catatan Penilaian</label>
          <textarea
            value={formData.remarks ?? ""}
            onChange={(event) => setFormData((prev) => ({ ...prev, remarks: event.target.value }))}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            rows={4}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <h3 className="text-sm font-semibold text-emerald-800">Hasil Perhitungan</h3>
          <ul className="mt-3 space-y-2 text-sm text-emerald-900">
            <li className="flex justify-between">
              <span>Nilai Pasar</span>
              <span className="font-semibold">
                Rp {valuationPreview.marketValue.toLocaleString("id-ID")}
              </span>
            </li>
            <li className="flex justify-between">
              <span>Setelah Safety Margin</span>
              <span className="font-semibold">
                Rp {valuationPreview.collateralValueAfterSafety.toLocaleString("id-ID")}
              </span>
            </li>
            <li className="flex justify-between">
              <span>Nilai Likuidasi</span>
              <span className="font-semibold">
                Rp {valuationPreview.liquidationValue.toLocaleString("id-ID")}
              </span>
            </li>
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <h4 className="font-semibold text-slate-700">Ringkasan</h4>
          <p className="mt-2">
            <span className="font-medium text-slate-700">Nasabah:</span>{" "}
            {formData.generalInfo.customerName || "-"}
          </p>
          <p>
            <span className="font-medium text-slate-700">Plafond:</span> Rp{" "}
            {formData.generalInfo.plafond.toLocaleString("id-ID")}
          </p>
          <p>
            <span className="font-medium text-slate-700">Penilai:</span>{" "}
            {metadata?.users.appraisers.find((u) => u.id === formData.assignedAppraiserId)?.fullName ?? "-"}
          </p>
          <p>
            <span className="font-medium text-slate-700">Supervisor:</span>{" "}
            {metadata?.users.supervisors.find((u) => u.id === formData.generalInfo.reviewerId)?.fullName ?? "-"}
          </p>
        </div>
      </div>
    </div>
  );
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderGeneralStep();
      case 1:
        return renderCollateralStep();
      case 2:
        return renderTechnicalStep();
      case 3:
        return renderComparableStep();
      case 4:
        return renderValuationStep();
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-800">Formulir Laporan Penilaian Baru</h2>
        <p className="text-sm text-slate-500">Isi data penilaian agunan mengikuti langkah berikut.</p>
        {error && <p className="mt-3 rounded-md bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}
        {successMessage && (
          <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-600">{successMessage}</p>
        )}
        <ol className="mt-6 grid gap-3 md:grid-cols-5">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className={[
                "rounded-lg border px-3 py-3 text-xs",
                index === currentStep
                  ? "border-primary bg-primary/10 text-primary-dark"
                  : index < currentStep
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-50 text-slate-500",
              ].join(" ")}
            >
              <p className="font-semibold uppercase tracking-wide">{step.title}</p>
              <p className="mt-1 text-[11px] text-slate-500">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">{renderStepContent()}</div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          disabled={currentStep === 0 || saving}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sebelumnya
        </button>
        {currentStep < steps.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
          >
            Berikutnya
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : "Simpan Laporan"}
          </button>
        )}
      </div>
    </div>
  );
}
