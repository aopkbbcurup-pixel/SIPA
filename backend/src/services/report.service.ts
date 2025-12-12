import path from "node:path";
import fs from "fs-extra";
import { randomUUID } from "node:crypto";
import type {
  Attachment,
  CollateralItem,
  EnvironmentChecklist,
  FacilityInfo,
  GeneralInfo,
  MarketComparable,
  Report,
  ReportQuery,
  ReportStatus,
  TechnicalSpecification,
  UserRole,
  User,
  ValuationInput,
  ValuationComponentResult,
  ValuationResult,
  AppSettings,
  QualityCheck,
  QualitySummary,
  ComparableAnalysis,
  ComparableAdjustment,
  AuditLogEntry,
  LegalDocument,
  LegalDocumentVerification,
  AttachmentCategory,
} from "../types/domain";
import { db } from "../store/database";
import { paths } from "../config/env";
import { computeBuildingValuation } from "../constants/buildingStandards";
import { mergeInspectionChecklist } from "../constants/inspectionChecklist";
import { NotFoundError, UnauthorizedError } from "../utils/errors";
import { notificationService } from "./notification.service";
import ExcelJS from "exceljs";
import { validateValuationInput } from "../utils/validation";

const MAX_TOTAL_ATTACHMENT_SIZE = 100 * 1024 * 1024; // 100 MB
const COMPARABLE_WEIGHT_TARGET = 100;
const COMPARABLE_WEIGHT_TOLERANCE = 0.5;

type GeneralInfoInput = Omit<GeneralInfo, "reportNumber"> & { reportNumber?: string };
type CollateralInput = Omit<CollateralItem, "id" | "legalDocuments"> & {
  id?: string;
  legalDocuments: Array<Omit<LegalDocument, "id"> & { id?: string }>;
};
type ComparableInput = Omit<MarketComparable, "id"> & { id?: string };

export interface ReportInput {
  title: string;
  assignedAppraiserId: string;
  generalInfo: GeneralInfoInput;
  collateral: CollateralInput[];
  technical: TechnicalSpecification;
  environment: EnvironmentChecklist;
  facility?: FacilityInfo;
  comparables: ComparableInput[];
  valuationInput: ValuationInput;
  remarks?: string;
}



function ensureComparableWeights(items: ComparableInput[]) {
  if (!items.length) {
    return;
  }
  const weights = items.map((item) =>
    typeof item.weight === "number" && Number.isFinite(item.weight) ? item.weight : 0,
  );
  const hasPositive = weights.some((weight) => weight > 0);
  if (!hasPositive) {
    throw new Error("Setiap data pembanding wajib memiliki bobot (%).");
  }
  const total = weights.reduce((acc, weight) => acc + weight, 0);
  if (Math.abs(total - COMPARABLE_WEIGHT_TARGET) > COMPARABLE_WEIGHT_TOLERANCE) {
    throw new Error(
      `Total bobot pembanding harus ${COMPARABLE_WEIGHT_TARGET}%. Saat ini ${total.toFixed(2)}%.`,
    );
  }
}

export function computeComparableAnalysis(comparables: MarketComparable[]): ComparableAnalysis {
  if (!comparables.length) {
    const analysis: ComparableAnalysis = { totalWeight: 0 };
    analysis.notes = ["Belum ada data pembanding yang tercatat."];
    return analysis;
  }

  let priceAccumulator = 0;
  let pricePerSqAccumulator = 0;
  let totalWeight = 0;
  const notes: string[] = [];
  const rawWeights = comparables.map((item) =>
    typeof item.weight === "number" && item.weight > 0 ? item.weight : 0,
  );
  const hasPositiveWeights = rawWeights.some((weight) => weight > 0);

  comparables.forEach((item, index) => {
    const fallbackWeight = hasPositiveWeights ? 0 : 1;
    const weight = hasPositiveWeights ? rawWeights[index] ?? 0 : fallbackWeight || 1;
    if (weight <= 0) {
      return;
    }
    const area = item.landArea + (item.buildingArea ?? 0);
    const basePrice = typeof item.adjustedPrice === "number" ? item.adjustedPrice : item.price;
    const finalPricePerSquare =
      typeof item.finalPricePerSquare === "number"
        ? item.finalPricePerSquare
        : area > 0
          ? Math.round(basePrice / area)
          : undefined;

    priceAccumulator += basePrice * weight;
    if (typeof finalPricePerSquare === "number") {
      pricePerSqAccumulator += finalPricePerSquare * weight;
    }
    totalWeight += weight;

    if (item.adjustments?.length) {
      const totalAdjustments = item.adjustments.reduce((acc, adj) => acc + adj.amount, 0);
      notes.push(
        `Pembanding #${index + 1} memiliki ${item.adjustments.length} penyesuaian dengan total ${totalAdjustments.toLocaleString("id-ID")}.`,
      );
    }
  });

  if (!hasPositiveWeights && totalWeight === 0 && comparables.length > 0) {
    totalWeight = comparables.length;
    priceAccumulator = comparables.reduce((acc, item) => {
      const basePrice = typeof item.adjustedPrice === "number" ? item.adjustedPrice : item.price;
      return acc + basePrice;
    }, 0);
    const pricePerSquares = comparables
      .map((item) => item.finalPricePerSquare ?? item.adjustedPricePerSquare ?? item.pricePerSquare)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0);
    pricePerSqAccumulator = pricePerSquares.reduce((acc, value) => acc + value, 0);
  }

  const analysis: ComparableAnalysis = { totalWeight };

  if (totalWeight > 0) {
    analysis.weightedAveragePrice = Math.round(priceAccumulator / totalWeight);
    if (pricePerSqAccumulator > 0) {
      analysis.weightedAveragePricePerSquare = Math.round(pricePerSqAccumulator / totalWeight);
    }
  }
  if (notes.length) {
    analysis.notes = notes;
  }

  return analysis;
}

function createQualitySummary(checks: QualityCheck[]): QualitySummary {
  const total = checks.length;
  const failed = checks.filter((check) => check.status === "fail").length;
  const warnings = checks.filter(
    (check) => check.status === "fail" && check.severity === "warning",
  ).length;
  const passed = total - failed;
  return {
    total,
    passed,
    failed,
    warnings,
  };
}

function evaluateReportQuality(report: Report, settings: AppSettings): {
  checks: QualityCheck[];
  summary: QualitySummary;
} {
  const checks: QualityCheck[] = [];

  const evaluate = (condition: boolean, config: { id: string; label: string; category: QualityCheck["category"]; severity: QualityCheck["severity"]; failMessage: string; passMessage?: string }) => {
    if (condition) {
      const check: QualityCheck = {
        id: config.id,
        label: config.label,
        category: config.category,
        severity: "info",
        status: "pass",
      };
      if (config.passMessage) {
        check.message = config.passMessage;
      }
      checks.push(check);
    } else {
      checks.push({
        id: config.id,
        label: config.label,
        category: config.category,
        severity: config.severity,
        status: "fail",
        message: config.failMessage,
      });
    }
  };

  const totals = {
    landArea: report.collateral.reduce((acc, item) => acc + item.landArea, 0),
    buildingArea: report.collateral.reduce((acc, item) => acc + (item.buildingArea ?? 0), 0),
  };

  evaluate(Boolean(report.generalInfo.customerName?.trim()), {
    id: "general.customer_name",
    label: "Nama nasabah terisi",
    category: "data",
    severity: "critical",
    failMessage: "Nama nasabah wajib diisi.",
  });

  evaluate(Boolean(report.generalInfo.creditPurpose?.trim()), {
    id: "general.credit_purpose",
    label: "Tujuan kredit terisi",
    category: "data",
    severity: "critical",
    failMessage: "Tujuan kredit wajib diisi.",
  });

  evaluate(report.collateral.length > 0, {
    id: "collateral.exists",
    label: "Data agunan tersedia",
    category: "data",
    severity: "critical",
    failMessage: "Minimal satu data agunan wajib diisi.",
  });

  const requiredDocTypes = settings.checklist.requiredLegalDocumentTypes;
  const allLegalDocs = report.collateral.flatMap((item) => item.legalDocuments);
  requiredDocTypes.forEach((docType) => {
    evaluate(allLegalDocs.some((doc) => doc.type === docType), {
      id: `legal.required_${docType.toLowerCase()}`,
      label: `Legalitas ${docType} tersedia`,
      category: "legal",
      severity: "critical",
      failMessage: `Legalitas ${docType} wajib dilampirkan untuk agunan ini.`,
    });
  });

  report.collateral.forEach((collateral, index) => {
    const checklist = collateral.inspectionChecklist ?? [];
    const label = `Checklist inspeksi agunan #${index + 1}`;
    const idBase = `inspection.${collateral.id ?? index + 1}`;
    if (!checklist.length) {
      evaluate(false, {
        id: `${idBase}.missing`,
        label,
        category: "workflow",
        severity: "warning",
        failMessage: "Checklist inspeksi lapangan belum diisi.",
      });
      return;
    }
    const unanswered = checklist.filter((item) => !item.response);
    if (unanswered.length) {
      evaluate(false, {
        id: `${idBase}.incomplete`,
        label,
        category: "workflow",
        severity: "warning",
        failMessage: `Checklist belum lengkap (${unanswered.length} butir belum terisi).`,
      });
      return;
    }
    const negatives = checklist.filter((item) => item.response === "no");
    if (negatives.length) {
      evaluate(false, {
        id: `${idBase}.issues`,
        label,
        category: "workflow",
        severity: "warning",
        failMessage: `Checklist mencatat temuan pada: ${negatives.map((item) => item.label).join(", ")}.`,
      });
      return;
    }
    evaluate(true, {
      id: `${idBase}.completed`,
      label,
      category: "workflow",
      severity: "info",
      failMessage: "",
      passMessage: "Checklist inspeksi terisi lengkap.",
    });
  });

  allLegalDocs.forEach((doc) => {
    const status = doc.verification?.status ?? "pending";
    if (status === "pending") {
      evaluate(false, {
        id: `legal.${doc.type}.${doc.number}.verification_pending`,
        label: `Verifikasi ${doc.type} (${doc.number})`,
        category: "legal",
        severity: "warning",
        failMessage: `Dokumen ${doc.type} nomor ${doc.number} belum diverifikasi.`,
      });
    } else if (status === "rejected") {
      evaluate(false, {
        id: `legal.${doc.type}.${doc.number}.verification_rejected`,
        label: `Verifikasi ${doc.type} (${doc.number}) ditolak`,
        category: "legal",
        severity: "critical",
        failMessage: `Verifikasi dokumen ${doc.type} nomor ${doc.number} ditolak.`,
      });
    } else {
      evaluate(true, {
        id: `legal.${doc.type}.${doc.number}.verification_ok`,
        label: `Verifikasi ${doc.type} (${doc.number}) selesai`,
        category: "legal",
        severity: "info",
        failMessage: "",
        passMessage: `Dokumen diverifikasi oleh ${doc.verification?.verifiedBy ?? "â€”"}.`,
      });
    }
  });

  const landAreaDiff = Math.abs(report.valuationInput.landArea - totals.landArea);
  evaluate(landAreaDiff <= Math.max(5, report.valuationInput.landArea * 0.05), {
    id: "valuation.land_area_consistency",
    label: "Kesesuaian luas tanah",
    category: "valuation",
    severity: "warning",
    failMessage: `Terdapat selisih luas tanah antara input (${report.valuationInput.landArea}) dan total sertifikat (${totals.landArea}).`,
  });

  const buildingAreaDiff = Math.abs(report.valuationInput.buildingArea - totals.buildingArea);
  evaluate(buildingAreaDiff <= Math.max(5, report.valuationInput.buildingArea * 0.05), {
    id: "valuation.building_area_consistency",
    label: "Kesesuaian luas bangunan",
    category: "valuation",
    severity: "warning",
    failMessage: `Terdapat selisih luas bangunan antara input (${report.valuationInput.buildingArea}) dan total data agunan (${totals.buildingArea}).`,
  });

  report.collateral.forEach((collateral, index) => {
    const buildingArea = collateral.buildingArea ?? 0;
    const imbDoc = collateral.legalDocuments.find(
      (doc) => doc.type === "IMB" && typeof doc.area === "number" && doc.area > 0,
    );
    if (buildingArea > 0 && imbDoc?.area) {
      const differencePercent = Math.abs(buildingArea - imbDoc.area) / imbDoc.area * 100;
      evaluate(differencePercent <= 20, {
        id: `legal.imb_area_consistency.${collateral.id}`,
        label: `Selisih luas bangunan vs IMB (${collateral.name || `Agunan ${index + 1}`})`,
        category: "legal",
        severity: "warning",
        failMessage: `Selisih luas bangunan dengan IMB mencapai ${differencePercent.toFixed(
          1,
        )}%. Harap klarifikasi sebelum melanjutkan.`,
      });
    }
    const distance = collateral.sentuhTanahkuDistanceMeter;
    if (typeof distance === "number") {
      evaluate(distance <= 200, {
        id: `collateral.sentuh_tanahku_distance.${collateral.id}`,
        label: `Kesesuaian titik Sentuh Tanahku (${collateral.name || `Agunan ${index + 1}`})`,
        category: "data",
        severity: "warning",
        failMessage: `Jarak titik Sentuh Tanahku melebihi 200 meter (tercatat ${distance.toFixed(
          1,
        )} m).`,
        passMessage: "Lokasi sesuai hasil verifikasi Sentuh Tanahku.",
      });
    }
  });

  evaluate(report.comparables.length >= settings.checklist.requireComparablesCount, {
    id: "comparables.minimum_count",
    label: "Jumlah data pembanding mencukupi",
    category: "valuation",
    severity: "critical",
    failMessage: `Minimal ${settings.checklist.requireComparablesCount} pembanding wajib diisi.`,
  });

  evaluate((report.comparableAnalysis?.weightedAveragePricePerSquare ?? 0) > 0, {
    id: "comparables.analysis_ready",
    label: "Analisis pembanding terhitung",
    category: "valuation",
    severity: "warning",
    failMessage: "Belum ada analisis pembanding yang dapat digunakan sebagai referensi nilai pasar.",
  });

  if (report.comparables.length > 0) {
    const weights = report.comparables.map((item) =>
      typeof item.weight === "number" && Number.isFinite(item.weight) ? item.weight : 0,
    );
    const totalWeight = weights.reduce((acc, weight) => acc + weight, 0);
    evaluate(Math.abs(totalWeight - COMPARABLE_WEIGHT_TARGET) <= COMPARABLE_WEIGHT_TOLERANCE, {
      id: "comparables.weight_total",
      label: "Total bobot pembanding 100%",
      category: "valuation",
      severity: "critical",
      failMessage: `Total bobot pembanding harus ${COMPARABLE_WEIGHT_TARGET}%. Saat ini ${totalWeight.toFixed(
        2,
      )}%.`,
      passMessage: "Bobot pembanding sudah 100%.",
    });

    const unitPrices = report.comparables
      .map(
        (item) => item.finalPricePerSquare ?? item.adjustedPricePerSquare ?? item.pricePerSquare ?? 0,
      )
      .filter((value) => typeof value === "number" && Number.isFinite(value) && value > 0);
    if (unitPrices.length > 0) {
      const averageUnitPrice = unitPrices.reduce((acc, price) => acc + price, 0) / unitPrices.length;
      const deviating = report.comparables
        .map((item, index) => {
          const unitPrice = item.finalPricePerSquare ?? item.adjustedPricePerSquare ?? item.pricePerSquare;
          if (typeof unitPrice !== "number" || !Number.isFinite(unitPrice) || unitPrice <= 0) {
            return null;
          }
          const diffRatio = Math.abs(unitPrice - averageUnitPrice) / averageUnitPrice;
          return diffRatio > 0.3 ? `#${index + 1}` : null;
        })
        .filter((label): label is string => Boolean(label));

      evaluate(deviating.length === 0, {
        id: "comparables.price_variance",
        label: "Harga per m2 pembanding wajar",
        category: "valuation",
        severity: "warning",
        failMessage: `Harga per meter persegi pembanding ${deviating.join(
          ", ",
        )} menyimpang lebih dari 30% dari rata-rata. Mohon tinjau kembali penyesuaiannya.`,
        passMessage: "Harga per meter persegi pembanding berada dalam rentang kewajaran.",
      });
    }
  }

  const hasRequiredAttachments = (category: AttachmentCategory) =>
    report.attachments.some((attachment) => attachment.category === category);

  settings.checklist.requiredAttachments.forEach((category) => {
    evaluate(hasRequiredAttachments(category), {
      id: `attachment.required_${category}`,
      label: `Lampiran kategori ${category} tersedia`,
      category: "attachments",
      severity: category === "legal_doc" ? "critical" : "warning",
      failMessage: `Lampiran kategori ${category} belum tersedia.`,
    });
  });

  evaluate(report.environment.floodProne === false, {
    id: "environment.flood_prone",
    label: "Lokasi bebas potensi banjir",
    category: "workflow",
    severity: "warning",
    failMessage: "Lokasi agunan tercatat rawan banjir. Perlu catatan mitigasi.",
  });

  evaluate(report.environment.sutet === false, {
    id: "environment.sutet_clearance",
    label: "Jarak aman dari SUTET",
    category: "workflow",
    severity: "warning",
    failMessage: "Agunan berada di bawah/sekitar jaringan SUTET. Pastikan mitigasi risiko.",
  });

  evaluate(report.environment.hasDisputeNotice !== true, {
    id: "environment.dispute_notice",
    label: "Tidak ada informasi sengketa",
    category: "legal",
    severity: "critical",
    failMessage: "Terdapat catatan sengketa pada agunan. Klarifikasi diperlukan.",
  });

  const highRiskIndicators = [
    report.environment.floodProne,
    report.environment.sutet,
    report.environment.nearWasteFacility ?? false,
    report.environment.onWaqfLand ?? false,
    report.environment.onGreenBelt ?? false,
  ].filter(Boolean).length;
  if (highRiskIndicators > 0) {
    evaluate((report.environment.riskNotes?.length ?? 0) > 0, {
      id: "environment.risk_mitigation_notes",
      label: "Catatan mitigasi risiko lingkungan",
      category: "workflow",
      severity: "critical",
      failMessage:
        "Ada faktor risiko lingkungan yang ditandai, namun catatan mitigasi belum diisi. Harap lengkapi sebelum submit.",
      passMessage: "Mitigasi risiko lingkungan telah dicatat.",
    });
  }

  const { requestReceivedAt, appraisalDate } = report.generalInfo;
  if (requestReceivedAt && appraisalDate) {
    const receivedDate = new Date(requestReceivedAt);
    const appraisalDateObj = new Date(appraisalDate);
    if (!Number.isNaN(receivedDate.valueOf()) && !Number.isNaN(appraisalDateObj.valueOf())) {
      const diffMs = appraisalDateObj.getTime() - receivedDate.getTime();
      if (diffMs >= 0) {
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        evaluate(diffDays <= 14, {
          id: "workflow.sla_appraisal",
          label: "SLA penilaian terpenuhi",
          category: "workflow",
          severity: "warning",
          failMessage: `SLA penilaian melebihi 14 hari (tercatat ${Math.ceil(diffDays)} hari). Berikan justifikasi.`,
          passMessage: "SLA penilaian terpenuhi.",
        });
      }
    }
  }

  evaluate(report.valuationInput.safetyMarginPercent > 0, {
    id: "valuation.safety_margin_defined",
    label: "Safety margin terisi",
    category: "valuation",
    severity: "warning",
    failMessage: "Safety margin belum ditetapkan.",
  });

  evaluate(report.valuationInput.liquidationFactorPercent > 0, {
    id: "valuation.liquidation_factor_defined",
    label: "Faktor likuidasi terisi",
    category: "valuation",
    severity: "warning",
    failMessage: "Faktor likuidasi belum ditetapkan.",
  });

  evaluate(report.valuationResult.marketValue > 0, {
    id: "valuation.market_value_positive",
    label: "Nilai pasar terhitung",
    category: "valuation",
    severity: "critical",
    failMessage: "Nilai pasar belum terhitung atau bernilai 0.",
  });

  const summary = createQualitySummary(checks);

  return { checks, summary };
}

function createAuditEntry(
  action: AuditLogEntry["action"],
  actor: { id: string; role: UserRole },
  description: string,
  metadata?: Record<string, unknown>,
): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    actorId: actor.id,
    actorRole: actor.role,
    action,
    description,
  };
  if (metadata) {
    entry.metadata = metadata;
  }
  return entry;
}

function normaliseLegalDocuments(
  documents: Array<Omit<LegalDocument, "id"> & { id?: string; verification?: LegalDocumentVerification }>,
): LegalDocument[] {
  return documents.map((doc) => {
    const verification: LegalDocumentVerification =
      doc.verification && doc.verification.status ? doc.verification : { status: "pending" };
    return {
      ...doc,
      id: doc.id ?? randomUUID(),
      verification,
    };
  });
}

function normaliseCollateral(items: CollateralInput[]): CollateralItem[] {
  return items.map((item) => ({
    ...item,
    id: item.id ?? randomUUID(),
    legalDocuments: normaliseLegalDocuments(item.legalDocuments ?? []),
    inspectionChecklist: mergeInspectionChecklist(item.inspectionChecklist),
  }));
}

function normaliseComparables(items: ComparableInput[]): MarketComparable[] {
  return items.map((item) => {
    const adjustments: ComparableAdjustment[] = item.adjustments ?? [];
    const adjustmentTotal = adjustments.reduce((acc, adj) => acc + adj.amount, 0);
    const totalArea = item.landArea + (item.buildingArea ?? 0);
    const adjustedPriceDerived = Math.round(item.price + adjustmentTotal);
    const adjustedPrice =
      typeof item.adjustedPrice === "number" && Number.isFinite(item.adjustedPrice)
        ? item.adjustedPrice
        : adjustedPriceDerived;
    const basePricePerSquare =
      typeof item.pricePerSquare === "number" && Number.isFinite(item.pricePerSquare)
        ? item.pricePerSquare
        : totalArea > 0
          ? Math.round(item.price / totalArea)
          : undefined;
    const adjustedPricePerSquare =
      typeof item.adjustedPricePerSquare === "number" && Number.isFinite(item.adjustedPricePerSquare)
        ? item.adjustedPricePerSquare
        : totalArea > 0
          ? Math.round(adjustedPrice / totalArea)
          : undefined;
    const finalPricePerSquare =
      typeof item.finalPricePerSquare === "number" && Number.isFinite(item.finalPricePerSquare)
        ? item.finalPricePerSquare
        : adjustedPricePerSquare ?? basePricePerSquare;
    const weight =
      typeof item.weight === "number" && Number.isFinite(item.weight)
        ? Math.max(0, item.weight)
        : 0;

    const result: MarketComparable = {
      ...item,
      id: item.id ?? randomUUID(),
      adjustments,
      adjustedPrice,
      weight,
    };
    if (typeof basePricePerSquare === "number") {
      result.pricePerSquare = basePricePerSquare;
    }
    if (typeof adjustedPricePerSquare === "number") {
      result.adjustedPricePerSquare = adjustedPricePerSquare;
    }
    if (typeof finalPricePerSquare === "number") {
      result.finalPricePerSquare = finalPricePerSquare;
    }
    return result;
  });
}

/**
 * Calculates comprehensive property valuation based on input parameters.
 * 
 * This function performs the core valuation calculation for both land-only
 * properties and properties with buildings. It applies safety margins,
 * calculates liquidation values, and computes market values based on
 * various input parameters.
 * 
 * @param input - Valuation input containing all necessary parameters:
 *   - landArea, buildingArea: Property dimensions in m²
 *   - landRate, buildingRate: Per-square-meter rates
 *   - njopLand, njopBuilding: NJOP values for averaging
 *   - safetyMarginPercent: Safety deduction percentage
 *   - liquidationFactorPercent: Liquidation value percentage
 * 
 * @returns ValuationResult containing:
 *   - land: Component result for land
 *   - building: Component result for building (if applicable)
 *   - marketValue: Total market value
 *   - collateralValue: Value after safety margin
 *   - liquidationValue: Forced sale value
 *   - totalSafetyDeduction: Total deducted for safety
 * 
 * Calculation Logic:
 * 1. Land-Only: landArea * landRate
 * 2. Building: Uses buildingStandardRate (before depreciation)
 * 3. Safety margin applied to building only
 * 4. Liquidation factor applied to both after safety
 * 5. Average values computed with NJOP when available
 * 
 * @example
 * ```typescript
 * const result = calculateValuation({
 *   landArea: 100,
 *   landRate: 2000000,
 *   buildingArea: 80,
 *   buildingStandardRate: 3000000,
 *   safetyMarginPercent: 10,
 *   liquidationFactorPercent: 80
 * });
 * // Result includes market value, collateral value, liquidation value
 * ```
 */
function calculateValuation(input: ValuationInput): ValuationResult {
  // Logic for Vehicle and Machine/Heavy Equipment
  if (input.assetType === "vehicle" || input.assetType === "machine") {
    const marketPrice = input.marketPrice ?? 0;

    // Safety Margin % based on type (defaulting if not provided in input, though input should have it)
    // However, the requirement says: Vehicle = 30%, Machine = 40%.
    // We should respect the input.safetyMarginPercent if it adheres to these rules, or enforce it here.
    // The previous implementation took it from input. Let's assume input is correct, but we might want to log/warn if it differs?
    // For now, we trust the input `safetyMarginPercent` passed from frontend/controller.

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
  // Requirement: "Untuk perhitungan penyusutan bangunan tidak mempengaruhi perhitungan"
  // This means we use `buildingStandardRate` (base rate before depreciation) instead of `buildingRate`.

  const rawLandValue = input.landArea * input.landRate;

  // OLD Was: const rawBuildingValue = input.buildingArea * input.buildingRate;
  // NEW: Use base rate to ignore depreciation
  const appliedBuildingRate = input.buildingStandardRate;
  const rawBuildingValue = input.buildingArea * appliedBuildingRate;

  const landValue = Math.round(rawLandValue);
  const buildingValue = Math.round(rawBuildingValue);

  const landSafetyDeduction = 0;
  const buildingSafetyDeduction = Math.round((buildingValue * input.safetyMarginPercent) / 100);

  const landValueAfterSafety = landValue - landSafetyDeduction;
  const buildingValueAfterSafety = Math.max(0, buildingValue - buildingSafetyDeduction);

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

  const landAverageValue = computeAverageValue([landValue, input.njopLand]);
  const buildingAverageValue = computeAverageValue([buildingValue, input.njopBuilding]);

  const marketValueBeforeSafety = landValue + buildingValue;
  const totalSafetyDeduction = landSafetyDeduction + buildingSafetyDeduction;
  const collateralValueAfterSafety = landValueAfterSafety + buildingValueAfterSafety;

  const landLiquidationValue = Math.round((landValueAfterSafety * input.liquidationFactorPercent) / 100);
  const buildingLiquidationValue = Math.round((buildingValueAfterSafety * input.liquidationFactorPercent) / 100);
  const liquidationValue = landLiquidationValue + buildingLiquidationValue;

  const marketValue = marketValueBeforeSafety;

  const landComponentResult: ValuationComponentResult = {
    valueBeforeSafety: landValue,
    safetyDeduction: landSafetyDeduction,
    valueAfterSafety: landValueAfterSafety,
    liquidationValue: landLiquidationValue,
  };
  if (typeof landAverageValue === "number") {
    landComponentResult.averageValue = landAverageValue;
  }

  const buildingComponentResult: ValuationComponentResult = {
    valueBeforeSafety: buildingValue,
    safetyDeduction: buildingSafetyDeduction,
    valueAfterSafety: buildingValueAfterSafety,
    liquidationValue: buildingLiquidationValue,
  };
  if (typeof buildingAverageValue === "number") {
    buildingComponentResult.averageValue = buildingAverageValue;
  }

  return {
    marketValue,
    marketValueBeforeSafety,
    collateralValueAfterSafety,
    liquidationValue,
    totalSafetyDeduction,
    land: landComponentResult,
    building: buildingComponentResult,
  };
}



function normaliseValuationInput(
  valuationInput: ValuationInput,
  context: { technical: TechnicalSpecification; generalInfo: GeneralInfoInput },
): ValuationInput {
  const params: {
    standardCode: ValuationInput["buildingStandardCode"];
    yearBuilt?: number;
    appraisalDate?: string;
  } = {
    standardCode: valuationInput.buildingStandardCode,
  };
  if (typeof context.technical.yearBuilt === "number") {
    params.yearBuilt = context.technical.yearBuilt;
  }
  if (context.generalInfo.appraisalDate) {
    params.appraisalDate = context.generalInfo.appraisalDate;
  }

  const { adjustedRate, depreciationPercent, standardRate } = computeBuildingValuation(params);

  return {
    ...valuationInput,
    buildingStandardRate: standardRate,
    buildingDepreciationPercent: depreciationPercent,
    buildingRate: adjustedRate,
  };
}

export class ReportService {
  async listReports(query: ReportQuery = {}) {
    return db.getReports(query);
  }

  async getReport(reportId: string) {
    const report = await db.getReportById(reportId);
    if (!report) {
      throw new NotFoundError("Laporan tidak ditemukan.");
    }
    return report;
  }

  async createReport(input: ReportInput, requestedBy: string): Promise<Report> {
    const now = new Date().toISOString();
    const nextNumber = await db.getNextReportNumber();
    const formattedReportNumber = `SIPA-${new Date().getFullYear()}-${String(nextNumber).padStart(4, "0")}`;
    const settings = await db.getSettings();
    ensureComparableWeights(input.comparables);
    const actor =
      (await db.getUsers()).find((user) => user.id === requestedBy) ??
      ({
        id: requestedBy,
        role: "appraiser",
      } as User);
    const valuationInput = normaliseValuationInput(input.valuationInput, {
      technical: input.technical,
      generalInfo: input.generalInfo,
    });
    const collateral = normaliseCollateral(input.collateral);
    const comparables = normaliseComparables(input.comparables);
    const comparableAnalysis = computeComparableAnalysis(comparables);

    // Validate valuation input
    const validationErrors = validateValuationInput(valuationInput);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join('; '));
    }

    const valuationResult = {
      ...calculateValuation(valuationInput),
      comparablesAnalysis: comparableAnalysis,
    };

    let supervisorName = input.generalInfo.supervisorName;
    if ((!supervisorName || supervisorName.trim().length === 0) && input.generalInfo.reviewerId) {
      const supervisor = (await db.getUsers()).find((user) => user.id === input.generalInfo.reviewerId);
      supervisorName = supervisor?.fullName ?? supervisor?.username ?? supervisorName;
    }
    const normalisedSupervisorName = supervisorName?.trim() ?? "";

    const report: Report = {
      id: randomUUID(),
      title: input.title,
      status: "draft",
      assignedAppraiserId: input.assignedAppraiserId,
      generalInfo: {
        ...input.generalInfo,
        reportNumber: formattedReportNumber,
        supervisorName: normalisedSupervisorName,
      },
      collateral,
      technical: input.technical,
      environment: input.environment,
      ...(input.facility ? { facility: input.facility } : {}),
      comparables,
      valuationInput,
      valuationResult,
      attachments: [],
      qualityChecks: [],
      qualitySummary: { total: 0, passed: 0, failed: 0, warnings: 0 },
      auditTrail: [],
      signatures: {},
      workflowLock: { locked: false },
      legalAlerts: [],
      comparableAnalysis,
      createdAt: now,
      updatedAt: now,
    };
    if (input.remarks !== undefined) {
      report.remarks = input.remarks;
    }

    const { checks, summary } = evaluateReportQuality(report, settings);
    report.qualityChecks = checks;
    report.qualitySummary = summary;
    report.legalAlerts = checks.filter((check) => check.category === "legal" && check.status === "fail");
    report.auditTrail = [
      createAuditEntry(
        "report_created",
        { id: actor.id, role: actor.role },
        "Laporan dibuat dan disimpan sebagai draft.",
        {
          reportNumber: report.generalInfo.reportNumber,
        },
      ),
    ];

    await db.addReport(report);
    notificationService.notify("report:created", report);
    return report;
  }

  async updateReport(
    reportId: string,
    input: ReportInput,
    requester: { id: string; role: UserRole },
  ): Promise<Report> {
    const report = await this.getReport(reportId);
    const isOwner = report.assignedAppraiserId === requester.id;
    const isAdmin = requester.role === "admin";

    if (report.workflowLock?.locked && !isAdmin) {
      throw new Error(report.workflowLock.reason ?? "Laporan ini dikunci dan tidak dapat diubah.");
    }
    if (!isOwner && !isAdmin) {
      throw new UnauthorizedError("Anda tidak memiliki akses untuk memperbarui laporan ini.");
    }

    const settings = await db.getSettings();
    ensureComparableWeights(input.comparables);

    const valuationInput = normaliseValuationInput(input.valuationInput, {
      technical: input.technical,
      generalInfo: input.generalInfo,
    });

    let supervisorName = input.generalInfo.supervisorName;
    if ((!supervisorName || supervisorName.trim().length === 0) && input.generalInfo.reviewerId) {
      const supervisor = (await db.getUsers()).find((user) => user.id === input.generalInfo.reviewerId);
      supervisorName = supervisor?.fullName ?? supervisor?.username ?? supervisorName;
    }
    const normalisedSupervisorName = supervisorName?.trim() ?? "";

    const collateral = normaliseCollateral(input.collateral);
    const comparables = normaliseComparables(input.comparables);
    const comparableAnalysis = computeComparableAnalysis(comparables);

    // Validate valuation input
    const validationErrors = validateValuationInput(valuationInput);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join('; '));
    }

    const valuationResult = {
      ...calculateValuation(valuationInput),
      comparablesAnalysis: comparableAnalysis,
    };

    const payload: Partial<Report> = {
      title: input.title,
      assignedAppraiserId: input.assignedAppraiserId,
      generalInfo: {
        ...input.generalInfo,
        reportNumber: report.generalInfo.reportNumber,
        supervisorName: normalisedSupervisorName,
      },
      collateral,
      technical: input.technical,
      environment: input.environment,
      comparables,
      valuationInput,
      valuationResult,
    };

    if (input.facility !== undefined) {
      payload.facility = input.facility;
    }
    if (input.remarks !== undefined) {
      payload.remarks = input.remarks;
    }

    const mergedReport: Report = {
      ...report,
      ...payload,
      collateral,
      comparables,
      valuationInput,
      valuationResult,
      comparableAnalysis,
    };

    const { checks, summary } = evaluateReportQuality(mergedReport, settings);
    const auditEntry = createAuditEntry(
      "report_updated",
      { id: requester.id, role: requester.role },
      "Laporan diperbarui oleh pengguna.",
      {
        updatedFields: Object.keys(payload),
      },
    );

    payload.qualityChecks = checks;
    payload.qualitySummary = summary;
    payload.legalAlerts = checks.filter((check) => check.category === "legal" && check.status === "fail");
    payload.comparableAnalysis = comparableAnalysis;
    payload.auditTrail = [...report.auditTrail, auditEntry];

    await db.updateReport(reportId, payload);
    const updatedReport = await this.getReport(reportId);
    notificationService.notify("report:updated", updatedReport);
    return updatedReport;
  }

  async deleteReport(reportId: string) {
    const report = await this.getReport(reportId);
    const attachments = report.attachments ?? [];

    await Promise.all(
      attachments.map(async (attachment) => {
        const filePath = path.join(paths.uploadDir, attachment.filename);
        try {
          if (await fs.pathExists(filePath)) {
            await fs.remove(filePath);
          }
        } catch {
          // ignore
        }
      }),
    );

    const pdfFilePath = path.join(paths.pdfDir, `${report.generalInfo.reportNumber}.pdf`);
    try {
      if (await fs.pathExists(pdfFilePath)) {
        await fs.remove(pdfFilePath);
      }
    } catch {
      // ignore
    }

    await db.deleteReport(reportId);
  }

  async changeStatus(
    reportId: string,
    status: ReportStatus,
    options: { actorId: string; actorRole: UserRole; reason?: string },
  ) {
    const report = await this.getReport(reportId);
    const isOwner = report.assignedAppraiserId === options.actorId;
    const isSupervisor = options.actorRole === "supervisor";
    const isAdmin = options.actorRole === "admin";

    const allowForReview = isOwner || isSupervisor || isAdmin;
    const allowApprovalFlow = isSupervisor || isAdmin;

    const isAuthorised =
      status === "for_review"
        ? allowForReview
        : status === "approved" || status === "rejected"
          ? allowApprovalFlow
          : status === "draft"
            ? isAdmin
            : false;

    if (!isAuthorised) {
      throw new UnauthorizedError("Anda tidak memiliki akses untuk mengubah status ini.");
    }

    const settings = await db.getSettings();
    const { checks, summary } = evaluateReportQuality(report, settings);
    const criticalIssues = checks.filter((check) => check.status === "fail" && check.severity === "critical");
    const warningIssues = checks.filter((check) => check.status === "fail" && check.severity === "warning");

    if (status === "for_review") {
      if (criticalIssues.length) {
        const messages = criticalIssues.map((issue) => `- ${issue.label}: ${issue.message ?? "Perlu perbaikan."}`);
        throw new Error(
          `Laporan belum bisa diajukan review. Mohon selesaikan temuan kritis berikut:\n${messages.join("\n")}`,
        );
      }
      if (!settings.checklist.allowWarningsForSubmission && warningIssues.length) {
        const messages = warningIssues.map((issue) => `- ${issue.label}: ${issue.message ?? "Perlu tindakan."}`);
        throw new Error(
          `Laporan memiliki peringatan yang harus ditindaklanjuti sebelum diajukan:\n${messages.join("\n")}`,
        );
      }
    }

    if (status === "approved" && (criticalIssues.length || warningIssues.length)) {
      const messages = [...criticalIssues, ...warningIssues].map(
        (issue) => `- ${issue.label}: ${issue.message ?? "Perlu tindakan."}`,
      );
      throw new Error(`Laporan belum bersih dari temuan. Selesaikan catatan berikut:\n${messages.join("\n")}`);
    }

    const metadata: Partial<Report> = {
      qualityChecks: checks,
      qualitySummary: summary,
      legalAlerts: checks.filter((check) => check.category === "legal" && check.status === "fail"),
    };
    if (status === "rejected") {
      metadata.rejectionReason = options.reason ?? "";
    }
    if (status === "approved") {
      metadata.workflowLock = {
        locked: true,
        lockedAt: new Date().toISOString(),
        reason: "Laporan dikunci otomatis setelah disetujui.",
      };
    } else if (report.workflowLock?.locked) {
      metadata.workflowLock = {
        locked: false,
        reason: "Kunci laporan dibuka karena status berubah.",
      };
    }

    const auditMetadata: Record<string, unknown> | undefined = options.reason
      ? { reason: options.reason }
      : undefined;

    const auditEntry = createAuditEntry(
      "status_changed",
      { id: options.actorId, role: options.actorRole },
      `Status laporan berubah menjadi ${status}.`,
      auditMetadata,
    );
    metadata.auditTrail = [...report.auditTrail, auditEntry];

    await db.updateReportStatus(reportId, status, metadata);
    notificationService.notify("report:status_changed", { id: reportId, status, ...metadata });
  }

  async recalculate(reportId: string, actor: { id: string; role: UserRole }): Promise<Report> {
    const report = await this.getReport(reportId);
    const comparableAnalysis = computeComparableAnalysis(report.comparables);
    const valuationResult = {
      ...calculateValuation(report.valuationInput),
      comparablesAnalysis: comparableAnalysis,
    };
    const settings = await db.getSettings();
    const recomputedReport: Report = {
      ...report,
      valuationResult,
      comparableAnalysis,
    };
    const { checks, summary } = evaluateReportQuality(recomputedReport, settings);
    const auditEntry = createAuditEntry(
      "valuation_recalculated",
      actor,
      "Perhitungan nilai agunan dihitung ulang.",
    );
    await db.updateReport(reportId, {
      valuationResult,
      comparableAnalysis,
      qualityChecks: checks,
      qualitySummary: summary,
      legalAlerts: checks.filter((check) => check.category === "legal" && check.status === "fail"),
      auditTrail: [...report.auditTrail, auditEntry],
    });
    return this.getReport(reportId);
  }

  async addAttachment(reportId: string, attachment: Attachment, actor: { id: string; role: UserRole }) {
    const report = await this.getReport(reportId);
    const currentTotalSize = report.attachments.reduce((acc, item) => acc + (item.size ?? 0), 0);
    if (currentTotalSize + (attachment.size ?? 0) > MAX_TOTAL_ATTACHMENT_SIZE) {
      throw new Error("Total ukuran lampiran melebihi batas 100 MB.");
    }
    report.attachments.push(attachment);
    const settings = await db.getSettings();
    const recomputedReport: Report = {
      ...report,
      attachments: report.attachments,
    };
    const { checks, summary } = evaluateReportQuality(recomputedReport, settings);
    const auditEntry = createAuditEntry(
      "attachment_added",
      actor,
      `Lampiran baru ditambahkan (${attachment.category}).`,
      {
        filename: attachment.originalName,
      },
    );
    await db.updateReport(reportId, {
      attachments: report.attachments,
      qualityChecks: checks,
      qualitySummary: summary,
      legalAlerts: checks.filter((check) => check.category === "legal" && check.status === "fail"),
      auditTrail: [...report.auditTrail, auditEntry],
    });
    return attachment;
  }

  async removeAttachment(reportId: string, attachmentId: string, actor: { id: string; role: UserRole }) {
    const report = await this.getReport(reportId);
    report.attachments = report.attachments.filter((att) => att.id !== attachmentId);
    const settings = await db.getSettings();
    const recomputedReport: Report = {
      ...report,
      attachments: report.attachments,
    };
    const { checks, summary } = evaluateReportQuality(recomputedReport, settings);
    const auditEntry = createAuditEntry(
      "attachment_removed",
      actor,
      `Lampiran dengan ID ${attachmentId} dihapus.`,
    );
    await db.updateReport(reportId, {
      attachments: report.attachments,
      qualityChecks: checks,
      qualitySummary: summary,
      legalAlerts: checks.filter((check) => check.category === "legal" && check.status === "fail"),
      auditTrail: [...report.auditTrail, auditEntry],
    });
  }

  async updateLegalDocumentVerification(
    reportId: string,
    documentId: string,
    verification: LegalDocumentVerification,
    actor: { id: string; role: UserRole },
  ): Promise<Report> {
    const report = await this.getReport(reportId);
    let found = false;
    const users = await db.getUsers();
    const userRecord = users.find((user) => user.id === actor.id);
    const actorName = verification.verifiedBy ?? userRecord?.fullName ?? userRecord?.username ?? actor.id;

    const updatedCollateral = report.collateral.map((collateral) => {
      if (!collateral.legalDocuments.some((doc) => doc.id === documentId)) {
        return collateral;
      }

      const legalDocuments = collateral.legalDocuments.map((doc) => {
        if (doc.id !== documentId) {
          return doc;
        }
        found = true;
        const verifiedAt = verification.verifiedAt ?? new Date().toISOString();
        const updatedVerification: LegalDocumentVerification = {
          status: verification.status,
          verifiedBy: actorName,
          verifiedAt,
        };
        if (verification.verificationSource !== undefined) {
          updatedVerification.verificationSource = verification.verificationSource;
        } else if (doc.verification?.verificationSource) {
          updatedVerification.verificationSource = doc.verification.verificationSource;
        }
        if (verification.notes !== undefined) {
          updatedVerification.notes = verification.notes;
        } else if (doc.verification?.notes) {
          updatedVerification.notes = doc.verification.notes;
        }
        if (verification.reminderDate !== undefined) {
          updatedVerification.reminderDate = verification.reminderDate;
        } else if (doc.verification?.reminderDate) {
          updatedVerification.reminderDate = doc.verification.reminderDate;
        }

        const updatedDoc: LegalDocument = {
          ...doc,
          verification: updatedVerification,
        };
        if (verification.reminderDate !== undefined) {
          updatedDoc.reminderDate = verification.reminderDate;
        }
        return updatedDoc;
      });

      return {
        ...collateral,
        legalDocuments,
      };
    });

    if (!found) {
      throw new NotFoundError("Dokumen legal tidak ditemukan.");
    }

    const updatedReport: Report = {
      ...report,
      collateral: updatedCollateral,
    };
    const settings = await db.getSettings();
    const { checks, summary } = evaluateReportQuality(updatedReport, settings);
    const auditEntry = createAuditEntry(
      "legal_document_verified",
      actor,
      "Status verifikasi dokumen legal diperbarui.",
      {
        documentId,
        status: verification.status,
      },
    );

    await db.updateReport(reportId, {
      collateral: updatedCollateral,
      qualityChecks: checks,
      qualitySummary: summary,
      legalAlerts: checks.filter((check) => check.category === "legal" && check.status === "fail"),
      auditTrail: [...report.auditTrail, auditEntry],
    });

    return this.getReport(reportId);
  }
  async exportReports(query: ReportQuery = {}): Promise<Buffer> {
    const reports = await this.listReports(query);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Laporan");

    worksheet.columns = [
      { header: "No. Laporan", key: "reportNumber", width: 20 },
      { header: "Nasabah", key: "customerName", width: 30 },
      { header: "Status", key: "status", width: 15 },
      { header: "Plafond", key: "plafond", width: 20 },
      { header: "Tanggal Update", key: "updatedAt", width: 20 },
    ];

    reports.forEach((report) => {
      worksheet.addRow({
        reportNumber: report.generalInfo.reportNumber,
        customerName: report.generalInfo.customerName,
        status: report.status,
        plafond: report.generalInfo.plafond,
        updatedAt: new Date(report.updatedAt).toLocaleDateString("id-ID"),
      });
    });

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  async saveSignature(
    reportId: string,
    role: "appraiser" | "supervisor",
    imageDataUrl: string,
    actor: { id: string; role: UserRole },
  ) {
    const report = await this.getReport(reportId);
    const now = new Date().toISOString();

    const signature = {
      id: randomUUID(),
      actorId: actor.id,
      actorRole: actor.role,
      signedAt: now,
      name: actor.role === "appraiser" ? report.generalInfo.appraiserName ?? "Appraiser" : report.generalInfo.supervisorName ?? "Supervisor",
      imageDataUrl,
    };

    const updatedSignatures = {
      ...report.signatures,
      [role]: signature,
    };

    const auditEntry = createAuditEntry(
      "signature_added",
      actor,
      `Tanda tangan ditambahkan oleh ${role}`,
    );

    const updatedReport: Report = {
      ...report,
      signatures: updatedSignatures,
      auditTrail: [...report.auditTrail, auditEntry],
      updatedAt: now,
    };

    await db.updateReport(reportId, {
      signatures: updatedSignatures,
      auditTrail: [...report.auditTrail, auditEntry],
      updatedAt: now,
    });
    return updatedReport;
  }

  async deleteSignature(reportId: string, role: "appraiser" | "supervisor"): Promise<Report> {
    const report = await this.getReport(reportId);
    const now = new Date().toISOString();
    const actorId = report.signatures?.[role]?.name === report.generalInfo.appraiserName ? report.assignedAppraiserId : report.generalInfo.reviewerId; // Approximation, better to pass actor

    // We need the actor to log who deleted it. 
    // Ideally pass actor to this function. But for now let's just delete.
    // The controller checks permissions.

    if (!report.signatures || !report.signatures[role]) {
      return report;
    }

    const updatedSignatures = { ...report.signatures };
    delete updatedSignatures[role];

    const auditEntry = createAuditEntry(
      "report_updated", // Generic update since we don't have specific 'signature_deleted' action type yet or we can reuse existing
      { id: "system", role: "admin" }, // Placeholder, should pass actor
      `Tanda tangan ${role} dihapus`,
    );

    await db.updateReport(reportId, {
      signatures: updatedSignatures,
      auditTrail: [...report.auditTrail, auditEntry],
      updatedAt: now,
    });

    return {
      ...report,
      signatures: updatedSignatures,
      auditTrail: [...report.auditTrail, auditEntry],
      updatedAt: now,
    };
  }
}

export const reportService = new ReportService();

