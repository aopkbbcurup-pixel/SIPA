import type { InspectionChecklistItem } from "../types/domain";

export type InspectionChecklistResponse = "yes" | "no" | "na";

export interface InspectionChecklistTemplateItem {
  id: string;
  label: string;
  category: "akses" | "kondisi" | "legal" | "utilitas" | "lingkungan" | "lainnya";
  description?: string;
}

export const inspectionChecklistTemplate: InspectionChecklistTemplateItem[] = [
  {
    id: "akses_kendaraan",
    label: "Akses kendaraan roda 4 sampai ke lokasi agunan",
    category: "akses",
  },
  {
    id: "topografi_memadai",
    label: "Topografi dan kontur lahan tidak menimbulkan risiko besar (longsor/banjir)",
    category: "lingkungan",
  },
  {
    id: "struktur_baik",
    label: "Struktur bangunan utama dalam kondisi baik tanpa kerusakan mayor",
    category: "kondisi",
  },
  {
    id: "utilitas_listrik_air",
    label: "Utilitas dasar (listrik & air) aktif dan memadai",
    category: "utilitas",
  },
  {
    id: "legalitas_sesuai",
    label: "Dokumen legalitas sesuai dengan kondisi fisik di lapangan",
    category: "legal",
  },
  {
    id: "lingkungan_umum",
    label: "Lingkungan sekitar mendukung peruntukan agunan",
    category: "lingkungan",
  },
];

export function createInspectionChecklist(): InspectionChecklistItem[] {
  return inspectionChecklistTemplate.map((item) => ({
    id: item.id,
    label: item.label,
    category: item.category,
  }));
}

export function mergeInspectionChecklist(
  existing: InspectionChecklistItem[] | undefined,
): InspectionChecklistItem[] {
  const defaults = createInspectionChecklist();
  if (!existing || !existing.length) {
    return defaults;
  }

  const existingMap = new Map(existing.map((item) => [item.id, item]));

  const merged = defaults.map((item) => {
    const current = existingMap.get(item.id);
    if (!current) {
      return item;
    }
    const mergedItem: InspectionChecklistItem = { ...item };
    if (current.response !== undefined) {
      mergedItem.response = current.response;
    }
    if (current.notes !== undefined) {
      mergedItem.notes = current.notes;
    }
    if (current.updatedAt) {
      mergedItem.updatedAt = current.updatedAt;
    }
    return mergedItem;
  });

  // Append any custom items that are not part of the template
  existing
    .filter((item) => !inspectionChecklistTemplate.some((def) => def.id === item.id))
    .forEach((item) => merged.push(item));

  return merged;
}


