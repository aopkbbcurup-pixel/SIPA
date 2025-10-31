import type { BuildingStandard } from "../types/report";

interface BuildingValuationParams {
  standard?: BuildingStandard;
  yearBuilt?: number;
  appraisalDate?: string;
  depreciationRules: { minAge: number; maxAge: number | null; percent: number }[];
}

export function calculateBuildingValuation({
  standard,
  yearBuilt,
  appraisalDate,
  depreciationRules,
}: BuildingValuationParams) {
  if (!standard) {
    return {
      standardRate: 0,
      depreciationPercent: 0,
      adjustedRate: 0,
    };
  }

  let depreciationPercent = 0;
  if (typeof yearBuilt === "number" && Number.isFinite(yearBuilt)) {
    const referenceYear = appraisalDate ? new Date(appraisalDate).getFullYear() : new Date().getFullYear();
    const age = Math.max(0, referenceYear - yearBuilt);
    for (const rule of depreciationRules) {
      const meetsLower = age >= rule.minAge;
      const meetsUpper = rule.maxAge == null ? true : age < rule.maxAge;
      if (meetsLower && meetsUpper) {
        depreciationPercent = rule.percent;
        break;
      }
    }
  }

  const adjustedRate = Math.round(standard.baseRate * (1 - depreciationPercent / 100));

  return {
    standardRate: standard.baseRate,
    depreciationPercent,
    adjustedRate,
  };
}
