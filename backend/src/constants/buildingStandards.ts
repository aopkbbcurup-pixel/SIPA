export const buildingStandardCodes = [
  "house_one_story_type_a",
  "house_one_story_type_b",
  "house_one_story_type_c",
  "house_one_story_type_d",
  "house_one_story_simple_type_a",
  "house_one_story_simple_type_b",
  "house_two_story_type_a",
  "house_two_story_type_b",
  "house_two_story_type_c",
  "house_two_story_type_d",
] as const;

export type BuildingStandardCode = (typeof buildingStandardCodes)[number];

export interface BuildingStandard {
  code: BuildingStandardCode;
  name: string;
  floors: 1 | 2;
  category: "rumah_ruko" | "rumah_sederhana";
  baseRate: number;
  specification: string[];
}

export const buildingStandards: BuildingStandard[] = [
  {
    code: "house_two_story_type_a",
    name: "Bangunan Dua Lantai Rumah/Ruko Type A",
    floors: 2,
    category: "rumah_ruko",
    baseRate: 3_500_000,
    specification: [
      "Dinding batu dan beton di plester (permanen)",
      "Lantai granit",
      "Atap genteng metal / atap semen cor",
    ],
  },
  {
    code: "house_two_story_type_b",
    name: "Bangunan Dua Lantai Rumah/Ruko Type B",
    floors: 2,
    category: "rumah_ruko",
    baseRate: 3_200_000,
    specification: [
      "Dinding batu dan beton di plester (permanen)",
      "Lantai keramik standar",
      "Atap genteng metal / atap semen cor",
    ],
  },
  {
    code: "house_two_story_type_c",
    name: "Bangunan Dua Lantai Rumah/Ruko Type C",
    floors: 2,
    category: "rumah_ruko",
    baseRate: 2_750_000,
    specification: [
      "Lantai 1 dinding batu dan beton di plester (permanen)",
      "Lantai 2 dinding GRC atau sejenisnya / papan dan sejenisnya",
      "Lantai granit",
      "Atap genteng metal",
    ],
  },
  {
    code: "house_two_story_type_d",
    name: "Bangunan Dua Lantai Rumah/Ruko Type D",
    floors: 2,
    category: "rumah_ruko",
    baseRate: 2_300_000,
    specification: [
      "Lantai 1 dinding batu dan beton di plester (permanen)",
      "Lantai 2 dinding GRC atau sejenisnya / papan dan sejenisnya",
      "Lantai keramik standar",
      "Atap seng gelombang",
    ],
  },
  {
    code: "house_one_story_type_a",
    name: "Bangunan Satu Lantai Rumah/Ruko Type A",
    floors: 1,
    category: "rumah_ruko",
    baseRate: 2_900_000,
    specification: [
      "Dinding batu-beton di plester (permanen)",
      "Lantai granit",
      "Atap genteng metal / atap semen cor",
    ],
  },
  {
    code: "house_one_story_type_b",
    name: "Bangunan Satu Lantai Rumah/Ruko Type B",
    floors: 1,
    category: "rumah_ruko",
    baseRate: 2_600_000,
    specification: [
      "Dinding batu-beton di plester (permanen)",
      "Lantai keramik standar",
      "Atap genteng metal / atap semen cor",
    ],
  },
  {
    code: "house_one_story_type_c",
    name: "Bangunan Satu Lantai Rumah/Ruko Type C",
    floors: 1,
    category: "rumah_ruko",
    baseRate: 2_500_000,
    specification: [
      "Dinding batu-beton di plester (permanen)",
      "Lantai granit",
      "Atap seng gelombang",
    ],
  },
  {
    code: "house_one_story_type_d",
    name: "Bangunan Satu Lantai Rumah/Ruko Type D",
    floors: 1,
    category: "rumah_ruko",
    baseRate: 2_300_000,
    specification: [
      "Dinding batu-beton di plester (permanen)",
      "Lantai keramik standar",
      "Atap seng gelombang",
    ],
  },
  {
    code: "house_one_story_simple_type_a",
    name: "Bangunan Satu Lantai Sederhana Type A",
    floors: 1,
    category: "rumah_sederhana",
    baseRate: 2_000_000,
    specification: [
      "Dinding batu dan beton di plester (permanen)",
      "Lantai semen biasa",
      "Atap genteng metal / atap semen cor",
    ],
  },
  {
    code: "house_one_story_simple_type_b",
    name: "Bangunan Satu Lantai Sederhana Type B",
    floors: 1,
    category: "rumah_sederhana",
    baseRate: 1_500_000,
    specification: [
      "Dinding batu dan beton di plester (semi permanen)",
      "Lantai semen biasa",
      "Atap seng gelombang",
    ],
  },
];

export const buildingStandardMap = new Map(buildingStandards.map((standard) => [standard.code, standard]));

export interface BuildingDepreciationRule {
  minAge: number;
  maxAge: number | null;
  percent: number;
}

export const buildingDepreciationRules: BuildingDepreciationRule[] = [
  { minAge: 0, maxAge: 5, percent: 5 },
  { minAge: 5, maxAge: 10, percent: 15 },
  { minAge: 10, maxAge: 20, percent: 25 },
  { minAge: 20, maxAge: null, percent: 50 },
];

export function getBuildingStandard(code: BuildingStandardCode) {
  return buildingStandardMap.get(code);
}

export function getDepreciationPercentForAge(age: number): number {
  if (Number.isNaN(age) || age < 0) {
    return 0;
  }
  for (const rule of buildingDepreciationRules) {
    const withinLower = age >= rule.minAge;
    const withinUpper = rule.maxAge === null ? true : age < rule.maxAge;
    if (withinLower && withinUpper) {
      return rule.percent;
    }
  }
  return 0;
}

export function computeBuildingValuation({
  standardCode,
  yearBuilt,
  appraisalDate,
}: {
  standardCode: BuildingStandardCode;
  yearBuilt?: number;
  appraisalDate?: string;
}) {
  const standard = getBuildingStandard(standardCode);
  if (!standard) {
    throw new Error("Standar bangunan tidak ditemukan.");
  }
  let depreciationPercent = 0;
  if (yearBuilt) {
    const referenceYear = appraisalDate ? new Date(appraisalDate).getFullYear() : new Date().getFullYear();
    const age = Math.max(0, referenceYear - yearBuilt);
    depreciationPercent = getDepreciationPercentForAge(age);
  }
  const adjustedRate = Math.round(standard.baseRate * (1 - depreciationPercent / 100));

  return {
    standard,
    standardRate: standard.baseRate,
    depreciationPercent,
    adjustedRate,
  };
}
