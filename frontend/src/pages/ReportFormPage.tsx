import { useCallback, useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { createReport, fetchMetadata, fetchReport, updateReport } from "../lib/reportApi";
import { calculateBuildingValuation } from "../lib/valuation";
import type {
  BuildingStandard,
  BuildingStandardCode,
  CollateralItem,
  Report,
  MarketComparable,
  MetadataResponse,
  ReportInputPayload,
  ValuationResult,
  InspectionChecklistItem,
  QualityCheck,
  QualitySummary,
} from "../types/report";
import { useAuthStore } from "../store/auth";
import { mergeChecklistWithTemplate } from "../utils/inspectionChecklist";
import { GeneralInfoStep } from "./report-form/GeneralInfoStep";
import { CollateralStep } from "./report-form/CollateralStep";
import { TechnicalStep } from "./report-form/TechnicalStep";
import { ComparablesStep } from "./report-form/ComparablesStep";
import { ValuationStep } from "./report-form/ValuationStep";
import { QualityCheckPanel } from "../components/QualityCheckPanel";

function applyValuationUsingMetadata(
  draft: ReportInputPayload,
  metadata: MetadataResponse,
  preferredCode?: BuildingStandardCode,
): ReportInputPayload {
  if (!metadata.buildingStandards?.length) {
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
      // Force buildingRate to be standardRate (ignoring depreciation)
      buildingRate: valuation.standardRate,
    },
  };
}

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
  occupancyStatus: undefined,
  occupancyNotes: "",
  sentuhTanahkuDistanceMeter: undefined,
  legalDocuments: [],
  inspectionChecklist: [],
};

const defaultComparable: MarketComparable = {
  source: "",
  address: "",
  distance: 0,
  landArea: 0,
  price: 0,
  weight: 0,
  category: "tanah",
  contactInfo: "",
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
    reviewerId: "",
    supervisorName: "",
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
    riskNotes: [],
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
    marketPriceLandPerM2: 0,
    safetyMarginPercent: 0,
    liquidationFactorPercent: 0,
  },
};


function calculateValuation(input: ReportInputPayload["valuationInput"]): ValuationResult {
  // Logic for Vehicle and Machine/Heavy Equipment
  if (input.assetType === "vehicle" || input.assetType === "machine") {
    const marketPrice = input.marketPrice ?? 0;
    const safetyMarginDeduction = Math.round((marketPrice * input.safetyMarginPercent) / 100);
    const valueAfterSafety = marketPrice - safetyMarginDeduction;
    const liquidationValue = Math.round((valueAfterSafety * input.liquidationFactorPercent) / 100);

    return {
      marketValue: marketPrice,
      marketValueBeforeSafety: marketPrice,
      collateralValueAfterSafety: valueAfterSafety,
      liquidationValue,
      totalSafetyDeduction: safetyMarginDeduction,
    };
  }

  // Logic for Property (Land & Building)
  const landValue = Math.round(input.landArea * input.landRate);

  // buildingRate is already forced to be standardRate (base) in applyValuationUsingMetadata
  const buildingValue = Math.round(input.buildingArea * input.buildingRate);

  const landSafetyDeduction = 0;
  const buildingSafetyDeduction = Math.round((buildingValue * input.safetyMarginPercent) / 100);
  const landValueAfterSafety = landValue - landSafetyDeduction;
  const buildingValueAfterSafety = Math.max(0, buildingValue - buildingSafetyDeduction);
  const marketValueBeforeSafety = landValue + buildingValue;
  const totalSafetyDeduction = landSafetyDeduction + buildingSafetyDeduction;
  const collateralAfterSafety = landValueAfterSafety + buildingValueAfterSafety;
  const landLiquidationValue = Math.round((landValueAfterSafety * input.liquidationFactorPercent) / 100);
  const buildingLiquidationValue = Math.round((buildingValueAfterSafety * input.liquidationFactorPercent) / 100);
  const liquidation = landLiquidationValue + buildingLiquidationValue;
  const computeAverageValue = (values: Array<number | undefined>) => {
    const filtered = values.filter(
      (value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0,
    );
    if (!filtered.length) {
      return undefined;
    }
    const sum = filtered.reduce((acc, value) => acc + value, 0);
    return Math.round(sum / filtered.length);
  };
  const landAverageValue = computeAverageValue([landValue, Math.round(input.landArea * input.landRate), input.njopLand]);
  const buildingAverageValue = computeAverageValue([
    buildingValue,
    Math.round(input.buildingArea * input.buildingRate),
    input.njopBuilding,
  ]);
  const landComponent: ValuationResult["land"] = {
    valueBeforeSafety: landValue,
    safetyDeduction: landSafetyDeduction,
    valueAfterSafety: landValueAfterSafety,
    liquidationValue: landLiquidationValue,
  };
  if (typeof landAverageValue === "number") {
    landComponent.averageValue = landAverageValue;
  }
  const buildingComponent: ValuationResult["building"] = {
    valueBeforeSafety: buildingValue,
    safetyDeduction: buildingSafetyDeduction,
    valueAfterSafety: buildingValueAfterSafety,
    liquidationValue: buildingLiquidationValue,
  };
  if (typeof buildingAverageValue === "number") {
    buildingComponent.averageValue = buildingAverageValue;
  }
  return {
    marketValue: marketValueBeforeSafety,
    marketValueBeforeSafety,
    collateralValueAfterSafety: collateralAfterSafety,
    liquidationValue: liquidation,
    totalSafetyDeduction,
    land: landComponent,
    building: buildingComponent,
  };
}

export function ReportFormPage() {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const reportId = params.id ?? null;
  const isEditing = Boolean(reportId);
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
  const [riskNotesText, setRiskNotesText] = useState("");
  const [loadingReport, setLoadingReport] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Quality Check State
  const [qualityChecks, setQualityChecks] = useState<QualityCheck[]>([]);
  const [qualitySummary, setQualitySummary] = useState<QualitySummary>({ total: 0, passed: 0, failed: 0, warnings: 0 });

  const mapReportToForm = useCallback((report: Report): ReportInputPayload => {
    return {
      title: report.title,
      assignedAppraiserId: report.assignedAppraiserId,
      generalInfo: {
        ...report.generalInfo,
      },
      collateral: report.collateral.map((item) => ({
        id: item.id,
        kind: item.kind,
        name: item.name,
        address: item.address,
        latitude: item.latitude,
        longitude: item.longitude,
        landArea: item.landArea,
        buildingArea: item.buildingArea,
        occupancyStatus: item.occupancyStatus,
        occupancyNotes: item.occupancyNotes,
        sentuhTanahkuDistanceMeter: item.sentuhTanahkuDistanceMeter,
        legalDocuments: item.legalDocuments.map((doc) => ({
          id: doc.id,
          type: doc.type,
          number: doc.number,
          issueDate: doc.issueDate,
          dueDate: doc.dueDate,
          reminderDate: doc.reminderDate,
          notes: doc.notes,
          issuer: doc.issuer,
          area: doc.area,
          verification: doc.verification,
        })),
        inspectionChecklist: item.inspectionChecklist,
      })),
      technical: {
        ...report.technical,
        utilities: {
          ...report.technical.utilities,
        },
      },
      environment: {
        ...report.environment,
        otherRisks: report.environment?.otherRisks ?? [],
        positiveFactors: report.environment?.positiveFactors ?? [],
        riskNotes: report.environment?.riskNotes ?? [],
      },
      facility: report.facility
        ? {
          ...report.facility,
        }
        : undefined,
      comparables: report.comparables.map((item) => ({
        id: item.id,
        source: item.source,
        address: item.address,
        distance: item.distance,
        landArea: item.landArea,
        buildingArea: item.buildingArea,
        price: item.price,
        pricePerSquare: item.pricePerSquare,
        notes: item.notes,
        transactionDate: item.transactionDate,
        adjustments: item.adjustments ?? [],
        weight: typeof item.weight === "number" && Number.isFinite(item.weight) ? item.weight : 0,
        adjustedPrice: item.adjustedPrice,
        adjustedPricePerSquare: item.adjustedPricePerSquare,
        finalPricePerSquare: item.finalPricePerSquare,
        contactInfo: item.contactInfo,
        category: item.category,
      })),
      valuationInput: {
        ...defaultForm.valuationInput,
        ...report.valuationInput,
        // SMART FIX: Handle inconsistent Firestore data for Land NJOP
        // Detection: if njopLand/area < 10k but njopLand >= 10k, it's already per-m2
        njopLandPerM2: report.valuationInput.njopLandPerM2 ?? (() => {
          const total = report.valuationInput.njopLand;
          const area = report.valuationInput.landArea;
          if (!total || !area || area === 0) return 0;

          const calculated = Math.round(total / area);
          // If calculated too small but total looks valid, use total as per-m2
          if (calculated < 10000 && total >= 10000) {
            return total;
          }
          return calculated;
        })(),
        // Same calculation for building
        njopBuildingPerM2: report.valuationInput.njopBuildingPerM2 ??
          (report.valuationInput.njopBuilding && report.valuationInput.buildingArea > 0
            ? Math.round(report.valuationInput.njopBuilding / report.valuationInput.buildingArea)
            : 0),
      },
      remarks: report.remarks,
    } as ReportInputPayload;
  }, []);
  const applyBuildingValuation = useCallback(
    (draft: ReportInputPayload, preferredCode?: BuildingStandardCode): ReportInputPayload => {
      if (!metadata) {
        return draft;
      }
      return applyValuationUsingMetadata(draft, metadata, preferredCode);
    },
    [metadata],
  );

  useEffect(() => {
    let isMounted = true;
    setError(null);
    fetchMetadata()
      .then((data) => {
        if (!isMounted) return;
        setMetadata(data);
        if (isEditing) {
          // Saat mode edit, data draft akan dimuat dan diaplikasikan kemudian.
        } else {
          setFormData((prev) => {
            const defaultAppraiser = data.users.appraisers[0];
            const assignedAppraiserId = prev.assignedAppraiserId || defaultAppraiser?.id || "";
            const next: ReportInputPayload = {
              ...prev,
              assignedAppraiserId,
              generalInfo: {
                ...prev.generalInfo,
                reviewerId: prev.generalInfo.reviewerId || data.users.supervisors[0]?.id,
                supervisorName:
                  prev.generalInfo.supervisorName && prev.generalInfo.supervisorName.length > 0
                    ? prev.generalInfo.supervisorName
                    : data.users.supervisors[0]?.fullName ?? "",
                appraiserName:
                  prev.generalInfo.appraiserName || defaultAppraiser?.fullName || prev.generalInfo.appraiserName,
              },
              valuationInput: {
                ...prev.valuationInput,
                safetyMarginPercent:
                  prev.valuationInput.safetyMarginPercent || data.parameters.defaultSafetyMargin,
                liquidationFactorPercent:
                  prev.valuationInput.liquidationFactorPercent || data.parameters.defaultLiquidationFactor,
              },
            };
            return applyValuationUsingMetadata(next, data);
          });
        }
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
  }, [isEditing]);
  useEffect(() => {
    if (!isEditing || !metadata || !reportId) {
      return;
    }
    let active = true;
    setLoadingReport(true);
    setError(null);
    fetchReport(reportId)
      .then((report) => {
        if (!active) return;
        const mapped = mapReportToForm(report);
        setFormData(applyBuildingValuation(mapped));
        setOtherRisksText((mapped.environment.otherRisks ?? []).join("\n"));
        setPositiveFactorsText((mapped.environment.positiveFactors ?? []).join("\n"));
        setRiskNotesText((mapped.environment.riskNotes ?? []).join("\n"));

        // Initialize quality checks from report
        if (report.qualityChecks) setQualityChecks(report.qualityChecks);
        if (report.qualitySummary) setQualitySummary(report.qualitySummary);

        setCurrentStep(0);
      })
      .catch((err) => {
        if (!active) return;
        const message = err instanceof Error ? err.message : "Gagal memuat laporan";
        setError(message);
      })
      .finally(() => {
        if (active) {
          setLoadingReport(false);
        }
      });
    return () => {
      active = false;
    };
  }, [applyBuildingValuation, isEditing, mapReportToForm, metadata, reportId]);
  useEffect(() => {
    const template = metadata?.parameters.inspectionChecklistTemplate;
    if (!template) {
      return;
    }
    setFormData((prev) => ({
      ...prev,
      collateral: prev.collateral.map((collateral) => ({
        ...collateral,
        inspectionChecklist: mergeChecklistWithTemplate(template, collateral.inspectionChecklist),
      })),
    }));
  }, [metadata?.parameters.inspectionChecklistTemplate]);

  // Sync Collateral Area to Valuation Input
  useEffect(() => {
    const totalLandArea = formData.collateral.reduce((sum, item) => sum + (item.landArea || 0), 0);
    const totalBuildingArea = formData.collateral.reduce((sum, item) => sum + (item.buildingArea || 0), 0);

    setFormData((prev) => {
      if (
        prev.valuationInput.landArea === totalLandArea &&
        prev.valuationInput.buildingArea === totalBuildingArea
      ) {
        return prev;
      }
      return {
        ...prev,
        valuationInput: {
          ...prev.valuationInput,
          landArea: totalLandArea,
          buildingArea: totalBuildingArea,
        },
      };
    });
  }, [formData.collateral]);

  // Auto-calculate Market Price Land from Comparables (weighted average for "tanah" category)
  useEffect(() => {
    const landComparables = formData.comparables.filter(
      (c) => c.category === "tanah" && c.landArea > 0 && c.price > 0 && (c.weight ?? 0) > 0
    );

    if (landComparables.length > 0) {
      let totalWeightedPrice = 0;
      let totalWeight = 0;

      for (const comp of landComparables) {
        const pricePerM2 = comp.price / comp.landArea;
        const weight = comp.weight ?? 0;
        totalWeightedPrice += pricePerM2 * weight;
        totalWeight += weight;
      }

      if (totalWeight > 0) {
        const weightedAveragePrice = Math.round(totalWeightedPrice / totalWeight);

        setFormData((prev) => {
          if (prev.valuationInput.marketPriceLandPerM2 === weightedAveragePrice) {
            return prev;
          }
          return {
            ...prev,
            valuationInput: {
              ...prev.valuationInput,
              marketPriceLandPerM2: weightedAveragePrice,
            },
          };
        });
      }
    }
  }, [formData.comparables]);

  // Auto-calculate Land Rate = Average of (Market Price per m² + NJOP per m²)
  useEffect(() => {
    const marketPrice = formData.valuationInput.marketPriceLandPerM2 ?? 0;
    const njopPrice = formData.valuationInput.njopLandPerM2 ?? 0;

    // Only calculate if at least one value is provided
    if (marketPrice > 0 || njopPrice > 0) {
      const count = (marketPrice > 0 ? 1 : 0) + (njopPrice > 0 ? 1 : 0);
      const averageRate = Math.round((marketPrice + njopPrice) / count);

      setFormData((prev) => {
        if (prev.valuationInput.landRate === averageRate) {
          return prev;
        }
        return {
          ...prev,
          valuationInput: {
            ...prev.valuationInput,
            landRate: averageRate,
          },
        };
      });
    }
  }, [formData.valuationInput.marketPriceLandPerM2, formData.valuationInput.njopLandPerM2]);

  // REMOVED: Auto-sync was causing njopLand to be recalculated, breaking user input
  // Users will manage njopLandPerM2 directly, njopLand will be calculated only when needed

  // REMOVED: Auto-sync for building - same reason as land
  // Users manage njopBuildingPerM2 directly

  const valuationPreview = useMemo(() => calculateValuation(formData.valuationInput), [formData.valuationInput]);

  const handleTitleChange = (value: string) => {
    setFormData((prev) => ({ ...prev, title: value }));
  };

  const handleAssignAppraiser = (appraiserId: string) => {
    const selected = metadata?.users.appraisers.find((user) => user.id === appraiserId);
    setFormData((prev) => ({
      ...prev,
      assignedAppraiserId: appraiserId,
      generalInfo: {
        ...prev.generalInfo,
        appraiserName: selected?.fullName ?? prev.generalInfo.appraiserName,
      },
    }));
  };

  const handleBuildingStandardChange = (code: BuildingStandardCode) => {
    setFormData((prev) => applyBuildingValuation(prev, code));
  };

  const handleRemarksChange = (value: string) => {
    setFormData((prev) => ({ ...prev, remarks: value }));
  };

  const selectedBuildingStandard: BuildingStandard | undefined = useMemo(() => {
    if (!metadata?.buildingStandards?.length) {
      return undefined;
    }
    const code = formData.valuationInput.buildingStandardCode;
    return metadata.buildingStandards.find((item) => item.code === code) ?? metadata.buildingStandards[0];
  }, [metadata, formData.valuationInput.buildingStandardCode]);

  const totalComparableWeight = useMemo(
    () =>
      formData.comparables.reduce((acc, item) => {
        const weightValue = typeof item.weight === "number" && Number.isFinite(item.weight) ? item.weight : 0;
        return acc + weightValue;
      }, 0),
    [formData.comparables],
  );

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

  const updateTechnical = <K extends keyof ReportInputPayload["technical"]>(
    key: K,
    value: ReportInputPayload["technical"][K],
  ) => {
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

  const updateEnvironment = <K extends keyof ReportInputPayload["environment"]>(
    key: K,
    value: ReportInputPayload["environment"][K],
  ) => {
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

  const updateValuationInput = (key: keyof ReportInputPayload["valuationInput"], value: any) => {
    setFormData((prev) => ({
      ...prev,
      valuationInput: {
        ...prev.valuationInput,
        [key]: value,
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

  const updateInspectionChecklist = (
    collateralIndex: number,
    itemId: string,
    updates: Partial<InspectionChecklistItem>,
  ) => {
    setFormData((prev) => {
      const template = metadata?.parameters.inspectionChecklistTemplate;
      const nextCollateral = prev.collateral.map((collateral, idx) => {
        if (idx !== collateralIndex) {
          return collateral;
        }
        const checklist = mergeChecklistWithTemplate(template, collateral.inspectionChecklist);
        const updated = checklist.map((item) => {
          if (item.id !== itemId) {
            return item;
          }
          const nextItem: InspectionChecklistItem = { ...item, ...updates };
          if (
            Object.prototype.hasOwnProperty.call(updates, "response") ||
            Object.prototype.hasOwnProperty.call(updates, "notes")
          ) {
            nextItem.updatedAt = new Date().toISOString();
          }
          if (updates.response === undefined) {
            delete nextItem.response;
          }
          return nextItem;
        });
        return { ...collateral, inspectionChecklist: updated };
      });
      return { ...prev, collateral: nextCollateral };
    });
  };

  const addCollateral = () => {
    const template = metadata?.parameters.inspectionChecklistTemplate;
    setFormData((prev) => ({
      ...prev,
      collateral: [
        ...prev.collateral,
        {
          ...defaultCollateral,
          inspectionChecklist: mergeChecklistWithTemplate(template, []),
        },
      ],
    }));
  };

  const removeCollateral = (index: number) => {
    const template = metadata?.parameters.inspectionChecklistTemplate;
    setFormData((prev) => {
      const next = [...prev.collateral];
      next.splice(index, 1);
      return {
        ...prev,
        collateral: next.length
          ? next
          : [
            {
              ...defaultCollateral,
              inspectionChecklist: mergeChecklistWithTemplate(template, []),
            },
          ],
      };
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

  const validateBeforeSubmit = () => {
    const missingWeightIndex = formData.comparables.findIndex(
      (item) => typeof item.weight !== "number" || Number.isNaN(item.weight) || item.weight <= 0,
    );
    if (missingWeightIndex !== -1) {
      setError(`Bobot pembanding #${missingWeightIndex + 1} belum diisi atau bernilai 0.`);
      return false;
    }

    const totalWeight = formData.comparables.reduce((acc, item) => acc + (item.weight ?? 0), 0);
    if (Math.abs(totalWeight - 100) > 0.5) {
      setError(`Total bobot pembanding wajib 100%. Saat ini ${totalWeight.toFixed(2)}%.`);
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccessMessage(null);
    if (!validateBeforeSubmit()) {
      return;
    }

    setSaving(true);
    try {
      const payload: ReportInputPayload = {
        ...formData,
        environment: {
          ...formData.environment,
          otherRisks: otherRisksText.split("\n").map((item) => item.trim()).filter(Boolean),
          positiveFactors: positiveFactorsText.split("\n").map((item) => item.trim()).filter(Boolean),
          riskNotes: riskNotesText.split("\n").map((item) => item.trim()).filter(Boolean),
        },
      };
      const preparedPayload = applyBuildingValuation(payload);

      if (isEditing && reportId) {
        const updatedReport = await updateReport(reportId, preparedPayload);

        // Update quality feedback immediately
        if (updatedReport.qualityChecks) setQualityChecks(updatedReport.qualityChecks);
        if (updatedReport.qualitySummary) setQualitySummary(updatedReport.qualitySummary);

        setSuccessMessage("Perubahan draft berhasil disimpan.");
        // Optional: you can timeout or keep them here
      } else {
        const report = await createReport(preparedPayload);
        setSuccessMessage("Laporan berhasil dibuat. Mengalihkan ke detail...");
        setTimeout(() => navigate(`/reports/${report.id}`), 1200);
      }
    } catch (err) {
      let message = "Gagal menyimpan laporan";
      if (isAxiosError(err) && err.response?.data?.message && typeof err.response.data.message === "string") {
        message = err.response.data.message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const renderGeneralStep = () => (
    <GeneralInfoStep
      formData={formData}
      metadata={metadata}
      toDateInputValue={toDateInputValue}
      toDateTimeInputValue={toDateTimeInputValue}
      onGeneralInfoChange={updateGeneralInfo}
      onGeneralDateTimeChange={updateGeneralDateTime}
      onAssignAppraiser={handleAssignAppraiser}
      onTitleChange={handleTitleChange}
    />
  );

  const renderCollateralStep = () => (
    <CollateralStep
      collateral={formData.collateral}
      metadata={metadata}
      onUpdateCollateral={updateCollateral}
      onRemoveCollateral={removeCollateral}
      onAddCollateral={addCollateral}
      onUpdateInspectionChecklist={updateInspectionChecklist}
    />
  );
  const renderTechnicalStep = () => (
    <TechnicalStep
      formData={formData}
      metadata={metadata}
      otherRisksText={otherRisksText}
      positiveFactorsText={positiveFactorsText}
      riskNotesText={riskNotesText}
      onChangeOtherRisks={setOtherRisksText}
      onChangePositiveFactors={setPositiveFactorsText}
      onChangeRiskNotes={setRiskNotesText}
      onUpdateTechnical={updateTechnical}
      onUpdateFacility={updateFacility}
      onUpdateEnvironment={updateEnvironment}
    />
  );

  const renderComparableStep = () => (
    <ComparablesStep
      comparables={formData.comparables}
      metadata={metadata}
      totalWeight={totalComparableWeight}
      onUpdateComparable={updateComparable}
      onRemoveComparable={removeComparable}
      onAddComparable={addComparable}
    />
  );

  const renderValuationStep = () => (
    <ValuationStep
      formData={formData}
      metadata={metadata}
      valuationPreview={valuationPreview}
      selectedBuildingStandard={selectedBuildingStandard}
      onBuildingStandardChange={handleBuildingStandardChange}
      onUpdateValuationInput={updateValuationInput}
      onRemarksChange={handleRemarksChange}
      formatCurrencyValue={formatCurrencyValue}
      formatPercentValue={formatPercentValue}
    />
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

  const isInitialLoading = !metadata || (isEditing && loadingReport);
  const pageTitle = isEditing ? "Edit Draft Laporan" : "Formulir Laporan Penilaian Baru";
  const pageSubtitle = isEditing
    ? "Perbarui data draft sebelum diajukan untuk review."
    : "Isi data penilaian agunan mengikuti langkah berikut.";
  const submitButtonLabel = isEditing
    ? saving
      ? "Menyimpan..."
      : "Simpan Perubahan"
    : saving
      ? "Menyimpan..."
      : "Simpan Laporan";

  if (isInitialLoading) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className={`text-sm ${error ? "text-rose-600" : "text-slate-500"}`}>
          {error ?? "Memuat data laporan..."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-800">{pageTitle}</h2>
        <p className="text-sm text-slate-500">{pageSubtitle}</p>
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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <div className="mb-6 flex justify-between">
            <button
              type="button"
              onClick={goPrev}
              disabled={currentStep === 0}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              Kembali
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {submitButtonLabel}
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={currentStep === steps.length - 1}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                Lanjut
              </button>
            </div>
          </div>

          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-xl font-bold text-slate-900">{steps[currentStep].title}</h2>
            <p className="mb-6 text-sm text-slate-500">{steps[currentStep].description}</p>
            {renderStepContent()}
          </div>
        </div>

        <div className="space-y-6 lg:col-span-1">
          {/* Steps Navigation Sidebar */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-4 font-semibold text-slate-900">Navigasi</h3>
            <div className="space-y-1">
              {steps.map((step, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${currentStep === index
                    ? "bg-primary/10 text-primary"
                    : "text-slate-600 hover:bg-slate-50"
                    }`}
                >
                  <span>{step.title}</span>
                  {currentStep === index && <div className="h-2 w-2 rounded-full bg-primary" />}
                </button>
              ))}
            </div>
          </div>

          {/* Quality Check Panel */}
          {isEditing && (
            <QualityCheckPanel
              checks={qualityChecks}
              summary={qualitySummary}
              className="sticky top-24"
            />
          )}
        </div>
      </div>
    </div>
  );
}
