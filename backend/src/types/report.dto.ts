import { z } from "zod";
import { AttachmentCategory, ReportStatus } from "./domain";
import { buildingStandardCodes } from "../constants/buildingStandards";

const legalDocumentSchema = z.object({
  type: z.enum(["SHM", "HGB", "AJB", "IMB", "Other"]),
  number: z.string().min(1),
  issueDate: z.string(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

const collateralSchema = z.object({
  id: z.string().optional(),
  kind: z.enum(["residential", "commercial", "land", "other"]),
  name: z.string().min(1),
  address: z.string().min(1),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  landArea: z.number().nonnegative(),
  buildingArea: z.number().nonnegative().optional(),
  legalDocuments: z.array(legalDocumentSchema),
});

const technicalSchema = z.object({
  landShape: z.string().min(1),
  landTopography: z.string().min(1),
  buildingStructure: z.string().min(1),
  wallMaterial: z.string().min(1),
  floorMaterial: z.string().min(1),
  roofMaterial: z.string().min(1),
  yearBuilt: z.number().optional(),
  conditionNotes: z.string().optional(),
  utilities: z.object({
    electricity: z.string(),
    water: z.string(),
    roadAccess: z.string(),
    other: z.string().optional(),
  }),
});

const environmentSchema = z.object({
  hasImb: z.boolean().optional(),
  hasPbb: z.boolean().optional(),
  hasAccessRoad: z.boolean().optional(),
  hasDisputeNotice: z.boolean().optional(),
  floodProne: z.boolean(),
  sutet: z.boolean(),
  nearCemetery: z.boolean(),
  nearIndustrial: z.boolean(),
  nearWasteFacility: z.boolean().optional(),
  onWaqfLand: z.boolean().optional(),
  onGreenBelt: z.boolean().optional(),
  carAccessible: z.boolean().optional(),
  boundaryNorth: z.string().optional(),
  boundarySouth: z.string().optional(),
  boundaryWest: z.string().optional(),
  boundaryEast: z.string().optional(),
  otherRisks: z.array(z.string()).optional(),
  positiveFactors: z.array(z.string()).optional(),
});

const facilitySchema = z.object({
  roadClass: z.string().optional(),
  roadMaterial: z.string().optional(),
  facilityCompleteness: z.string().optional(),
  roadWidth: z.number().optional(),
  transportAccess: z.string().optional(),
  electricityCapacity: z.string().optional(),
  waterSource: z.string().optional(),
  floorPosition: z.string().optional(),
}).optional();

const comparableSchema = z.object({
  id: z.string().optional(),
  source: z.string(),
  address: z.string(),
  distance: z.number(),
  landArea: z.number(),
  buildingArea: z.number().optional(),
  price: z.number(),
  pricePerSquare: z.number().optional(),
  notes: z.string().optional(),
});

const valuationInputSchema = z.object({
  landArea: z.number().nonnegative(),
  buildingArea: z.number().nonnegative(),
  landRate: z.number().nonnegative(),
  buildingStandardCode: z.enum(buildingStandardCodes),
  buildingStandardRate: z.number().nonnegative(),
  buildingDepreciationPercent: z.number().min(0).max(100),
  buildingRate: z.number().nonnegative(),
  njopLand: z.number().optional(),
  njopBuilding: z.number().optional(),
  safetyMarginPercent: z.number().min(0).max(100),
  liquidationFactorPercent: z.number().min(0).max(100),
});

export const reportInputSchema = z.object({
  title: z.string().min(1),
  assignedAppraiserId: z.string().min(1),
  generalInfo: z.object({
    reportNumber: z.string().optional(),
    customerName: z.string().min(1),
    customerAddress: z.string().optional(),
    customerId: z.string().optional(),
    plafond: z.number().nonnegative(),
    creditPurpose: z.string().min(1),
    unit: z.string().min(1),
    reportType: z.string().optional(),
    reportDate: z.string().optional(),
    requestDate: z.string(),
    otsSchedule: z.string(),
    requestLetterNumber: z.string().optional(),
    requestLetterDate: z.string().optional(),
    requestReceivedAt: z.string().optional(),
    requestCompletedAt: z.string().optional(),
    appraisalDate: z.string().optional(),
    valuationPurpose: z.string().optional(),
    valuationType: z.string().optional(),
    valuationApproach: z.string().optional(),
    appraiserName: z.string().optional(),
    fieldContactName: z.string().optional(),
    fieldContactRelation: z.string().optional(),
    fieldContactPhone: z.string().optional(),
    reviewerId: z.string().optional(),
  }),
  collateral: z.array(collateralSchema),
  technical: technicalSchema,
  environment: environmentSchema,
  facility: facilitySchema,
  comparables: z.array(comparableSchema),
  valuationInput: valuationInputSchema,
  remarks: z.string().optional(),
});

export const reportQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["draft", "for_review", "approved", "rejected"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const statusUpdateSchema = z.object({
  status: z.enum(["draft", "for_review", "approved", "rejected"]),
  reason: z.string().optional(),
});

export const attachmentCategorySchema = z.enum([
  "photo_front",
  "photo_right",
  "photo_left",
  "photo_interior",
  "map",
  "legal_doc",
  "other",
] as [AttachmentCategory, ...AttachmentCategory[]]);
