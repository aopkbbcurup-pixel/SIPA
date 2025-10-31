import type { Request, Response } from "express";
import { db } from "../store/database";
import { buildingStandards, buildingDepreciationRules } from "../constants/buildingStandards";

export function metadataController(_req: Request, res: Response) {
  const users = db.getUsers();
  const sanitize = (user: typeof users[number]) => {
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  };
  const appraisers = users.filter((user) => user.role === "appraiser").map(sanitize);
  const supervisors = users.filter((user) => user.role === "supervisor").map(sanitize);
  const admins = users.filter((user) => user.role === "admin").map(sanitize);

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
      safetyMarginOptions: [0, 5, 10, 15, 20],
      liquidationFactorOptions: [40, 50, 60, 70, 80],
      buildingDepreciationRules,
    },
    buildingStandards,
  });
}
