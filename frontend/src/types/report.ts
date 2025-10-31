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
}

export interface LegalDocument {
  type: "SHM" | "HGB" | "AJB" | "IMB" | "Other";
  number: string;
  issueDate: string;
  dueDate?: string;
  notes?: string;
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
  legalDocuments: LegalDocument[];
}

export interface TechnicalSpecification {
  landShape: string;
  landTopography: string;
  buildingStructure: string;
  wallMaterial: string;
  floorMaterial: string;
  roofMaterial: string;
  yearBuilt?: number;
  conditionNotes?: string;
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
}

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
}

export interface ValuationResult {
  marketValue: number;
  marketValueBeforeSafety: number;
  collateralValueAfterSafety: number;
  liquidationValue: number;
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
    liquidationFactorOptions: number[];
    buildingDepreciationRules: {
      minAge: number;
      maxAge: number | null;
      percent: number;
    }[];
  };
  buildingStandards: BuildingStandard[];
}
