import type {
  InspectionChecklistItem,
  InspectionChecklistTemplateItem,
  InspectionChecklistResponse,
} from "../types/report";

export function createChecklistFromTemplate(
  template: InspectionChecklistTemplateItem[] | undefined,
): InspectionChecklistItem[] {
  if (!template) {
    return [];
  }
  return template.map((item) => ({
    id: item.id,
    label: item.label,
    category: item.category,
  }));
}

export function mergeChecklistWithTemplate(
  template: InspectionChecklistTemplateItem[] | undefined,
  existing: InspectionChecklistItem[] | undefined,
): InspectionChecklistItem[] {
  const defaults = createChecklistFromTemplate(template);
  if (!existing || !existing.length) {
    return defaults;
  }
  const existingMap = new Map(existing.map((item) => [item.id, item]));
  const merged: InspectionChecklistItem[] = defaults.map((item) => {
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

  existing
    .filter((item) => !template?.some((definition) => definition.id === item.id))
    .forEach((item) => merged.push(item));

  return merged;
}

export function responseLabel(response?: InspectionChecklistResponse): string {
  switch (response) {
    case "yes":
      return "Ya";
    case "no":
      return "Tidak";
    case "na":
      return "N/A";
    default:
      return "-";
  }
}
