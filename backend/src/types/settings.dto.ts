import { z } from "zod";
import { attachmentCategorySchema } from "./report.dto";

export const settingsUpdateSchema = z.object({
  valuation: z
    .object({
      safetyMarginOptions: z.array(z.number().min(0).max(100)).min(1).optional(),
      defaultSafetyMargin: z.number().min(0).max(100).optional(),
      liquidationFactorOptions: z.array(z.number().min(0).max(100)).min(1).optional(),
      defaultLiquidationFactor: z.number().min(0).max(100).optional(),
    })
    .optional(),
  checklist: z
    .object({
      requiredAttachments: z.array(attachmentCategorySchema).min(1).optional(),
      requiredLegalDocumentTypes: z.array(z.enum(["SHM", "HGB", "AJB", "IMB", "Other"])).min(1).optional(),
      requireComparablesCount: z.number().min(1).optional(),
      allowWarningsForSubmission: z.boolean().optional(),
    })
    .optional(),
});

export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;
