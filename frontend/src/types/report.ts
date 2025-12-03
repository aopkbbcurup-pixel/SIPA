export type UserRole = "appraiser" | "supervisor" | "admin";
export type ReportStatus = "draft" | "for_review" | "approved" | "rejected";

export type BuildingStandardCode =
  | "house_one_story_type_a"
  | "house_one_story_type_b"
  | "house_one_story_type_c"
  | "house_one_story_type_d"
  | "house_one_story_simple_type_a"
  | "house_one_story_simple_type_b"
  | "house_two_story_type_a"
  | "house_two_story_type_b"
  | "house_two_story_type_c"
  | "house_two_story_type_d";

export interface BuildingStandard {
  code: BuildingStandardCode;
  name: string;
  floors: 1 | 2;
  category: "rumah_ruko" | "rumah_sederhana";
  baseRate: number;
  specification: string[];
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  unit?: string;
}

export interface GeneralInfo {
  reportNumber?: string;
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

export type LegalDocumentType = "SHM" | "HGB" | "AJB" | "IMB" | "Other";

export interface LegalDocumentVerification {
  status: "pending" | "verified" | "rejected";
  verifiedBy?: string;
  verifiedAt?: string;
  verificationSource?: string;
  notes?: string;
  reminderDate?: string;
}

export interface LegalDocument {
  id?: string;
  type: LegalDocumentType;
  number: string;
  issueDate: string;
  dueDate?: string;
  reminderDate?: string;
  notes?: string;
  issuer?: string;
  area?: number;
  holderName?: string;
  verification?: LegalDocumentVerification;
}

export interface CollateralItem {
  id?: string;
  kind: "residential" | "commercial" | "land" | "other";
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  landArea: number;
  buildingArea?: number;
  occupancyStatus?: CollateralOccupancyStatus;
  occupancyNotes?: string;
  sentuhTanahkuDistanceMeter?: number;
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

export interface InspectionChecklistTemplateItem {
  id: string;
  label: string;
  category: "akses" | "kondisi" | "legal" | "utilitas" | "lingkungan" | "lainnya";
  description?: string;
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

export interface ComparableAdjustment {
  factor: string;
  amount: number;
  description?: string;
}

export type ComparableCategory = "tanah" | "bangunan" | "tanah_bangunan";

export interface MarketComparable {
  id?: string;
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
  safetyMarginPercent: number;
  liquidationFactorPercent: number;
  safetyMarginSource?: string;
  liquidationFactorSource?: string;
}

export interface ValuationComponentResult {
  valueBeforeSafety: number;
  safetyDeduction: number;
  valueAfterSafety: number;
  liquidationValue: number;
  averageValue?: number;
  adjustedValuePerSquare?: number;
}

export interface ComparableAnalysis {
  weightedAveragePrice?: number;
  weightedAveragePricePerSquare?: number;
  totalWeight?: number;
  notes?: string[];
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

export interface Signature {
  id: string;
  actorId: string;
  actorRole: UserRole;
  signedAt: string;
  name: string;
  title?: string;
  imageDataUrl?: string;
}

export interface ReportSignatures {
  appraiser?: Signature;
  supervisor?: Signature;
  reviewer?: Signature;
}

export interface WorkflowLock {
  locked: boolean;
  lockedAt?: string;
  reason?: string;
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
}

export interface ReportInputPayload {
  title: string;
  assignedAppraiserId: string;
  generalInfo: GeneralInfo;
  collateral: CollateralItem[];
  technical: TechnicalSpecification;
  environment: EnvironmentChecklist;
  facility?: FacilityInfo;
  comparables: MarketComparable[];
  valuationInput: ValuationInput;
  remarks?: string;
}

export interface ValuationSettings {
  safetyMarginOptions: number[];
  defaultSafetyMargin: number;
  liquidationFactorOptions: number[];
  defaultLiquidationFactor: number;
}

export interface ChecklistSettings {
  requiredAttachments: AttachmentCategory[];
  requiredLegalDocumentTypes: LegalDocumentType[];
  requireComparablesCount: number;
  allowWarningsForSubmission: boolean;
}

export interface AppSettings {
  valuation: ValuationSettings;
  checklist: ChecklistSettings;
}

export interface MetadataLookups {
  occupancyStatuses: { value: CollateralOccupancyStatus; label: string }[];
  comparableCategories: { value: ComparableCategory; label: string }[];
  landUseOptions: string[];
}

export interface MetadataResponse {
  roles: UserRole[];
  reportStatuses: ReportStatus[];
  attachmentCategories: AttachmentCategory[];
  users: {
    appraisers: User[];
    supervisors: User[];
    admins: User[];
  };
  parameters: {
    safetyMarginOptions: number[];
    defaultSafetyMargin: number;
    liquidationFactorOptions: number[];
    defaultLiquidationFactor: number;
    buildingDepreciationRules: {
      minAge: number;
      maxAge: number | null;
      percent: number;
    }[];
    checklist: ChecklistSettings;
    inspectionChecklistTemplate: InspectionChecklistTemplateItem[];
  };
  buildingStandards: BuildingStandard[];
  settings: AppSettings;
  lookups: MetadataLookups;
}
