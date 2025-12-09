import type { ReportInputPayload } from "../../types/report";

export const TECHNICAL_FIELD_OPTIONS: Record<
  "landShape" | "landTopography" | "buildingStructure" | "wallMaterial" | "floorMaterial" | "roofMaterial" | "landUse",
  string[]
> = {
  landShape: ["Persegi", "Persegi Panjang", "Trapesium", "Segitiga", "Tidak Beraturan"],
  landTopography: ["Datar", "Miring Ringan", "Miring Curam", "Bergelombang", "Berkontur"],
  buildingStructure: ["Beton Bertulang", "Baja", "Kayu", "Campuran", "Prefab"],
  wallMaterial: ["Bata Merah", "Batako", "Beton", "Kayu", "GRC", "Kaca"],
  floorMaterial: ["Keramik", "Granit", "Marmer", "Teraso", "Semen Plester", "Vinyl"],
  roofMaterial: ["Genteng Keramik", "Genteng Beton", "Genteng Metal", "Seng", "Asbes", "Dak Beton"],
  landUse: ["Permukiman", "Komersial", "Perkantoran", "Industri", "Pertanian", "Lainnya"],
};

export const FACILITY_FIELD_OPTIONS: Record<
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

export const UTILITY_FIELD_OPTIONS: Record<keyof ReportInputPayload["technical"]["utilities"], string[]> = {
  electricity: FACILITY_FIELD_OPTIONS.electricityCapacity,
  water: FACILITY_FIELD_OPTIONS.waterSource,
  roadAccess: ["Aspal", "Beton", "Paving", "Kerikil", "Tanah", "Gang Beton"],
  other: [
    "Telepon Rumah",
    "Internet Fiber",
    "Internet Wireless",
    "Drainase Tertutup",
    "Drainase Terbuka",
    "Lampu Jalan",
    "Pemadam Kebakaran",
    "Tidak Ada",
  ],
};

export const VALUATION_FIELD_OPTIONS: Array<[keyof ReportInputPayload["valuationInput"], string]> = [
  ["landArea", "Luas Tanah (m2)"],
  ["buildingArea", "Luas Bangunan (m2)"],
  ["landRate", "Harga Tanah (Rp/m2)"],
  ["njopLand", "Nilai NJOP Tanah (Rp)"],
  ["njopBuilding", "Nilai NJOP Bangunan (Rp)"],
];
