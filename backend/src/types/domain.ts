export type UserRole = "appraiser" | "supervisor" | "admin";

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  passwordHash: string;
  unit?: string;
  createdAt: string;
  updatedAt: string;
}

export type ReportStatus = "draft" | "for_review" | "approved" | "rejected";

export interface ReportQuery {
  search?: string;
  status?: ReportStatus;
  from?: string;
  to?: string;
  limit?: number;
}

export type LegalDocumentVerificationStatus = "pending" | "verified" | "rejected";

export interface LegalDocumentVerification {
  status: LegalDocumentVerificationStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  verificationSource?: string;
  notes?: string;
  reminderDate?: string;
}

export interface GeneralInfo {
  reportNumber: string;
  customerName: string;
  customerAddress?: string;
  customerId?: string;
  plafond: number;
  creditPurpose: string;
  unit: string;
  reportType?: string;
  reportDate?: string;
  requestDate: string;
  otsSchedule: string;
  requestLetterNumber?: string;
  requestLetterDate?: string;
  requestReceivedAt?: string;
  requestCompletedAt?: string;
  appraisalDate?: string;
  valuationPurpose?: string;
  valuationType?: string;
  valuationApproach?: string;
  appraiserName?: string;
  fieldContactName?: string;
  fieldContactRelation?: string;
  fieldContactPhone?: string;
  reviewerId?: string;
  supervisorName?: string;
}

export type CollateralOccupancyStatus = "dihuni" | "kosong" | "disewakan";

export interface LegalDocument {
  id: string;
  type: "SHM" | "HGB" | "AJB" | "IMB" | "Other";
  number: string;
  issueDate: string;
  dueDate?: string;
  reminderDate?: string;
  notes?: string;
  verification?: LegalDocumentVerification;
  issuer?: string;
  area?: number;
  holderName?: string;
}

export interface CollateralItem {
  id: string;
  kind: "residential" | "commercial" | "land" | "vehicle" | "machine" | "other";
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  landArea: number;
  buildingArea?: number;
  occupancyStatus?: CollateralOccupancyStatus;
  occupancyNotes?: string;
  sentuhTanahkuDistanceMeter?: number;
  // Vehicle & Machine specifics
  brand?: string;
  model?: string;
  manufacturingYear?: number;
  color?: string;
  engineNumber?: string;
  chassisNumber?: string;
  serialNumber?: string;
  productionCapacity?: string;
  legalDocuments: LegalDocument[];
  inspectionChecklist?: InspectionChecklistItem[];
}

export type InspectionChecklistResponse = "yes" | "no" | "na";

export interface InspectionChecklistItem {
  id: string;
  label: string;
  category?: string;
  response?: InspectionChecklistResponse;
  notes?: string;
  updatedAt?: string;
}

export interface TechnicalSpecification {
  landShape: string;
  landTopography: string;
  buildingStructure: string;
  wallMaterial: string;
  floorMaterial: string;
  roofMaterial: string;
  yearBuilt?: number;
  landUse?: string;
  conditionNotes?: string;
  measuredLandArea?: number;
  measuredBuildingArea?: number;
  utilities: {
    electricity: string;
    water: string;
    roadAccess: string;
    other?: string;
  };
}

export interface EnvironmentChecklist {
  hasImb?: boolean;
  hasPbb?: boolean;
  hasAccessRoad?: boolean;
  hasDisputeNotice?: boolean;
  floodProne: boolean;
  sutet: boolean;
  nearCemetery: boolean;
  nearIndustrial: boolean;
  nearWasteFacility?: boolean;
  onWaqfLand?: boolean;
  onGreenBelt?: boolean;
  carAccessible?: boolean;
  boundaryNorth?: string;
  boundarySouth?: string;
  boundaryWest?: string;
  boundaryEast?: string;
  otherRisks?: string[];
  positiveFactors?: string[];
  riskLevel?: "low" | "medium" | "high";
  riskNotes?: string[];
  floodHistory?: string;
  sutetDistanceMeter?: number;
}

export interface FacilityInfo {
  roadClass?: string;
  roadMaterial?: string;
  facilityCompleteness?: string;
  roadWidth?: number;
  transportAccess?: string;
  electricityCapacity?: string;
  waterSource?: string;
  floorPosition?: string;
  nearestPublicTransport?: string;
  distanceToCityCenterKm?: number;
  notes?: string;
}

export type ComparableCategory = "tanah" | "bangunan" | "tanah_bangunan";

export interface ComparableAdjustment {
  factor: string;
  amount: number;
  description?: string;
}

export interface MarketComparable {
  id: string;
  source: string;
  address: string;
  distance: number;
  landArea: number;
  buildingArea?: number;
  price: number;
  pricePerSquare?: number;
  notes?: string;
  transactionDate?: string;
  adjustments?: ComparableAdjustment[];
  weight?: number;
  adjustedPrice?: number;
  adjustedPricePerSquare?: number;
  finalPricePerSquare?: number;
  contactInfo?: string;
  category?: ComparableCategory;
}

import type { BuildingStandardCode } from "../constants/buildingStandards";

export interface ValuationInput {
  landArea: number;
  buildingArea: number;
  landRate: number;
  buildingStandardCode: BuildingStandardCode;
  buildingStandardRate: number;
  buildingDepreciationPercent: number;
  buildingRate: number;
  njopLand?: number;
  njopBuilding?: number;
  njopLandPerM2?: number;
  njopBuildingPerM2?: number;
  marketPriceLandPerM2?: number;
  safetyMarginPercent: number;
  liquidationFactorPercent: number;
  safetyMarginSource?: string;
  liquidationFactorSource?: string;
  // Non-property inputs
  marketPrice?: number;
  assetType?: "property" | "vehicle" | "machine";
}

export interface ValuationComponentResult {
  valueBeforeSafety: number;
  safetyDeduction: number;
  valueAfterSafety: number;
  liquidationValue: number;
  averageValue?: number;
  adjustedValuePerSquare?: number;
}

export interface ValuationResult {
  marketValue: number;
  marketValueBeforeSafety: number;
  collateralValueAfterSafety: number;
  liquidationValue: number;
  totalSafetyDeduction?: number;
  land?: ValuationComponentResult;
  building?: ValuationComponentResult;
  comparablesAnalysis?: ComparableAnalysis;
}

export interface ComparableAnalysis {
  weightedAveragePrice?: number;
  weightedAveragePricePerSquare?: number;
  totalWeight?: number;
  notes?: string[];
}

export type AttachmentCategory =
  | "photo_front"
  | "photo_right"
  | "photo_left"
  | "photo_interior"
  | "map"
  | "legal_doc"
  | "other";

export interface Attachment {
  id: string;
  category: AttachmentCategory;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
  latitude?: number;
  longitude?: number;
  capturedAt?: string;
  caption?: string;
}

export interface Report {
  id: string;
  title: string;
  status: ReportStatus;
  assignedAppraiserId: string;
  generalInfo: GeneralInfo;
  collateral: CollateralItem[];
  technical: TechnicalSpecification;
  environment: EnvironmentChecklist;
  facility?: FacilityInfo;
  comparables: MarketComparable[];
  valuationInput: ValuationInput;
  valuationResult: ValuationResult;
  attachments: Attachment[];
  qualityChecks: QualityCheck[];
  qualitySummary: QualitySummary;
  auditTrail: AuditLogEntry[];
  signatures?: ReportSignatures;
  workflowLock?: WorkflowLock;
  legalAlerts?: QualityCheck[];
  comparableAnalysis?: ComparableAnalysis;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  submittedBy?: string;
  approvedBy?: string;
  rejectedBy?: string;
}

export interface ReportSignatures {
  appraiser?: Signature;
  supervisor?: Signature;
  reviewer?: Signature;
}

export interface Signature {
  id: string;
  actorId: string;
  actorRole: UserRole;
  signedAt: string;
  name: string;
  title?: string;
  imageDataUrl?: string;
}

export interface WorkflowLock {
  locked: boolean;
  reason?: string;
  lockedAt?: string;
}

export type QualityCheckCategory = "data" | "legal" | "valuation" | "attachments" | "workflow";
export type QualityCheckSeverity = "info" | "warning" | "critical";

export interface QualityCheck {
  id: string;
  label: string;
  category: QualityCheckCategory;
  severity: QualityCheckSeverity;
  status: "pass" | "fail";
  message?: string;
}

export interface QualitySummary {
  total: number;
  passed: number;
  failed: number;
  warnings: number;
}

export type AuditAction =
  | "report_created"
  | "report_updated"
  | "status_changed"
  | "attachment_added"
  | "attachment_removed"
  | "legal_document_verified"
  | "valuation_recalculated"
  | "signature_added";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorRole: UserRole;
  action: AuditAction;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface ValuationSettings {
  safetyMarginOptions: number[];
  defaultSafetyMargin: number;
  liquidationFactorOptions: number[];
  defaultLiquidationFactor: number;
}

export interface ChecklistSettings {
  requiredAttachments: AttachmentCategory[];
  requiredLegalDocumentTypes: LegalDocument["type"][];
  requireComparablesCount: number;
  allowWarningsForSubmission: boolean;
}

export interface AppSettings {
  valuation: ValuationSettings;
  checklist: ChecklistSettings;
}

export interface DatabaseSchema {
  users: User[];
  reports: Report[];
  counters: {
    reportNumber: number;
  };
  settings: AppSettings;
}
