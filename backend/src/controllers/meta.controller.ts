import type { Request, Response } from "express";
import { db } from "../store/database";
import { buildingStandards, buildingDepreciationRules } from "../constants/buildingStandards";
import { inspectionChecklistTemplate } from "../constants/inspectionChecklist";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import type { AppSettings } from "../types/domain";
import { ValidationError } from "../utils/errors";

export async function metadataController(_req: Request, res: Response) {
  const users = await db.getUsers();
  const sanitize = (user: typeof users[number]) => {
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  };
  const appraisers = users.filter((user) => user.role === "appraiser").map(sanitize);
  const supervisors = users.filter((user) => user.role === "supervisor").map(sanitize);
  const admins = users.filter((user) => user.role === "admin").map(sanitize);
  const settings = await db.getSettings();
  const occupancyStatuses = [
    { value: "dihuni", label: "Dihuni" },
    { value: "kosong", label: "Kosong" },
    { value: "disewakan", label: "Disewakan" },
  ];
  const comparableCategories = [
    { value: "tanah", label: "Tanah" },
    { value: "bangunan", label: "Bangunan" },
    { value: "tanah_bangunan", label: "Tanah & Bangunan" },
  ];
  const landUseOptions = ["Permukiman", "Komersial", "Perkantoran", "Industri", "Pertanian", "Lainnya"];

  return res.json({
    roles: ["appraiser", "supervisor", "admin"],
    reportStatuses: ["draft", "for_review", "approved", "rejected"],
    attachmentCategories: [
      "photo_front",
      "photo_right",
      "photo_left",
      "photo_interior",
      "map",
      "legal_doc",
      "other",
    ],
    users: {
      appraisers,
      supervisors,
      admins,
    },
    parameters: {
      safetyMarginOptions: settings.valuation.safetyMarginOptions,
      defaultSafetyMargin: settings.valuation.defaultSafetyMargin,
      liquidationFactorOptions: settings.valuation.liquidationFactorOptions,
      defaultLiquidationFactor: settings.valuation.defaultLiquidationFactor,
      buildingDepreciationRules,
      checklist: settings.checklist,
      inspectionChecklistTemplate,
    },
    buildingStandards,
    settings,
    lookups: {
      occupancyStatuses,
      comparableCategories,
      landUseOptions,
    },
  });
}

export async function updateSettingsController(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Hanya admin yang dapat memperbarui pengaturan." });
    }
    const updates = req.body as Partial<AppSettings>;
    await db.updateSettings(updates);
    const updatedSettings = await db.getSettings();
    return res.json(updatedSettings);
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
}

export const getDashboardStats = async (req: Request, res: Response) => {
  const users = await db.getUsers();
  const reports = await db.getReports();

  const stats = {
    totalReports: reports.length,
    pendingReports: reports.filter((r) => r.status === "draft" || r.status === "for_review").length,
    completedReports: reports.filter((r) => r.status === "approved").length,
    activeAppraisers: users.filter((u) => u.role === "appraiser").length,
  };

  res.json(stats);
};

export const getAppSettings = async (req: Request, res: Response) => {
  const settings = await db.getSettings();
  res.json(settings);
};

export const updateAppSettings = async (req: Request, res: Response) => {
  try {
    // Validate input using Zod schema if needed, for now direct partial update
    const updates = req.body;

    // Basic validation
    if (!updates.valuation && !updates.checklist) {
      throw new ValidationError("Invalid settings update payload");
    }

    await db.updateSettings(updates);
    const updatedSettings = await db.getSettings();
    res.json(updatedSettings);
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: error.message });
    } else {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
};
