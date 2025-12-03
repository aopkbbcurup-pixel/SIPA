import { describe, expect, it } from "vitest";
import {
  inspectionChecklistTemplate,
  mergeInspectionChecklist,
} from "../src/constants/inspectionChecklist";
import type { InspectionChecklistItem, MarketComparable } from "../src/types/domain";
import { computeComparableAnalysis } from "../src/services/report.service";

describe("mergeInspectionChecklist", () => {
  it("menggabungkan template default dengan jawaban yang sudah ada", () => {
    const existing: InspectionChecklistItem[] = [
      {
        id: inspectionChecklistTemplate[0].id,
        label: inspectionChecklistTemplate[0].label,
        response: "yes",
        notes: "Akses baik",
      },
      {
        id: "custom_warning",
        label: "Catatan Khusus",
        response: "no",
        notes: "Butuh tindak lanjut",
      },
    ];

    const merged = mergeInspectionChecklist(existing);
    expect(merged).toHaveLength(inspectionChecklistTemplate.length + 1);

    const firstItem = merged.find((item) => item.id === inspectionChecklistTemplate[0].id);
    expect(firstItem?.response).toBe("yes");
    expect(firstItem?.notes).toBe("Akses baik");

    const customItem = merged.find((item) => item.id === "custom_warning");
    expect(customItem).toBeDefined();
    expect(customItem?.response).toBe("no");
  });
});

describe("computeComparableAnalysis", () => {
  it("menghitung rata-rata tertimbang harga pembanding", () => {
    const comparables: MarketComparable[] = [
      {
        id: "cmp-1",
        source: "Portal Properti",
        address: "Jl. Mawar 1",
        distance: 120,
        landArea: 150,
        buildingArea: 90,
        price: 900_000_000,
        weight: 60,
        category: "tanah_bangunan",
      },
      {
        id: "cmp-2",
        source: "Agen",
        address: "Jl. Melati 2",
        distance: 200,
        landArea: 120,
        buildingArea: 80,
        price: 750_000_000,
        weight: 40,
        adjustedPrice: 780_000_000,
        finalPricePerSquare: 6_000_000,
        category: "tanah_bangunan",
      },
    ];

    const analysis = computeComparableAnalysis(comparables);

    expect(analysis.totalWeight).toBeCloseTo(100, 5);
    expect(analysis.weightedAveragePrice).toBeGreaterThan(0);
    expect(analysis.weightedAveragePricePerSquare).toBeGreaterThan(0);
    expect(analysis.notes ?? []).toHaveLength(0);
  });
});
