import mongoose, { Schema } from "mongoose";
import {
    User,
    Report,
    AppSettings,
    CollateralItem,
    MarketComparable,
    Attachment,
    LegalDocument,
    InspectionChecklistItem,
    QualityCheck,
    AuditLogEntry,
    Signature,
    WorkflowLock,
    ValuationInput,
    ValuationResult,
    GeneralInfo,
    TechnicalSpecification,
    EnvironmentChecklist,
    FacilityInfo,
    ComparableAnalysis,
    QualitySummary,
} from "../types/domain";

// --- User Schema ---
const UserSchema = new Schema<User>(
    {
        id: { type: String, required: true, unique: true },
        username: { type: String, required: true, unique: true },
        fullName: { type: String, required: true },
        role: { type: String, required: true, enum: ["appraiser", "supervisor", "admin"] },
        passwordHash: { type: String, required: true },
        unit: { type: String },
    },
    { timestamps: true }
);

// --- Sub-Schemas for Report ---

const LegalDocumentSchema = new Schema<LegalDocument>({
    id: { type: String },
    type: { type: String },
    number: { type: String },
    issueDate: { type: String },
    dueDate: { type: String },
    reminderDate: { type: String },
    notes: { type: String },
    verification: {
        status: { type: String, enum: ["pending", "verified", "rejected"] },
        verifiedBy: { type: String },
        verifiedAt: { type: String },
        verificationSource: { type: String },
        notes: { type: String },
        reminderDate: { type: String },
    },
    issuer: { type: String },
    area: { type: Number },
});

const InspectionChecklistItemSchema = new Schema<InspectionChecklistItem>({
    id: { type: String },
    label: { type: String },
    category: { type: String },
    response: { type: String, enum: ["yes", "no", "na"] },
    notes: { type: String },
    updatedAt: { type: String },
});

const CollateralItemSchema = new Schema<CollateralItem>({
    id: { type: String },
    kind: { type: String, required: true, enum: ["residential", "commercial", "land", "other"] },
    name: { type: String },
    address: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    landArea: { type: Number },
    buildingArea: { type: Number },
    occupancyStatus: { type: String, enum: ["dihuni", "kosong", "disewakan"] },
    occupancyNotes: { type: String },
    sentuhTanahkuDistanceMeter: { type: Number },
    legalDocuments: [LegalDocumentSchema],
    inspectionChecklist: [InspectionChecklistItemSchema],
});

const AttachmentSchema = new Schema<Attachment>({
    id: { type: String },
    category: { type: String },
    filename: { type: String },
    originalName: { type: String },
    mimeType: { type: String },
    size: { type: Number },
    url: { type: String },
    uploadedBy: { type: String },
    uploadedAt: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    capturedAt: { type: String },
    caption: { type: String },
});

const MarketComparableSchema = new Schema<MarketComparable>({
    id: { type: String, required: true },
    source: { type: String },
    address: { type: String },
    distance: { type: Number },
    landArea: { type: Number },
    buildingArea: { type: Number },
    price: { type: Number },
    pricePerSquare: { type: Number },
    notes: { type: String },
    transactionDate: { type: String },
    adjustments: [{
        factor: { type: String, required: true },
        amount: { type: Number, required: true },
        description: { type: String },
    }],
    weight: { type: Number },
    adjustedPrice: { type: Number },
    adjustedPricePerSquare: { type: Number },
    finalPricePerSquare: { type: Number },
    contactInfo: { type: String },
    category: { type: String },
});

const QualityCheckSchema = new Schema<QualityCheck>({
    id: { type: String, required: true },
    label: { type: String, required: true },
    category: { type: String, required: true },
    severity: { type: String, required: true, enum: ["info", "warning", "critical"] },
    status: { type: String, required: true, enum: ["pass", "fail"] },
    message: { type: String },
});

const AuditLogEntrySchema = new Schema<AuditLogEntry>({
    id: { type: String, required: true },
    timestamp: { type: String, required: true },
    actorId: { type: String, required: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true },
    description: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
});

const SignatureSchema = new Schema<Signature>({
    id: { type: String },
    actorId: { type: String },
    actorRole: { type: String },
    signedAt: { type: String },
    name: { type: String },
    title: { type: String },
    imageDataUrl: { type: String },
});

const WorkflowLockSchema = new Schema<WorkflowLock>({
    locked: { type: Boolean, required: true },
    reason: { type: String },
    lockedAt: { type: String },
});

// --- Report Schema ---
const ReportSchema = new Schema<Report>(
    {
        id: { type: String, required: true, unique: true },
        title: { type: String, required: true },
        status: { type: String, required: true, enum: ["draft", "for_review", "approved", "rejected"] },
        assignedAppraiserId: { type: String, required: true },
        generalInfo: {
            reportNumber: { type: String, required: true },
            customerName: { type: String },
            customerAddress: { type: String },
            customerId: { type: String },
            plafond: { type: Number },
            creditPurpose: { type: String },
            unit: { type: String },
            reportType: { type: String },
            reportDate: { type: String },
            requestDate: { type: String },
            otsSchedule: { type: String },
            requestLetterNumber: { type: String },
            requestLetterDate: { type: String },
            requestReceivedAt: { type: String },
            requestCompletedAt: { type: String },
            appraisalDate: { type: String },
            valuationPurpose: { type: String },
            valuationType: { type: String },
            valuationApproach: { type: String },
            appraiserName: { type: String },
            fieldContactName: { type: String },
            fieldContactRelation: { type: String },
            fieldContactPhone: { type: String },
            reviewerId: { type: String },
            supervisorName: { type: String },
        },
        collateral: [CollateralItemSchema],
        technical: {
            landShape: { type: String },
            landTopography: { type: String },
            buildingStructure: { type: String },
            wallMaterial: { type: String },
            floorMaterial: { type: String },
            roofMaterial: { type: String },
            yearBuilt: { type: Number },
            landUse: { type: String },
            conditionNotes: { type: String },
            measuredLandArea: { type: Number },
            measuredBuildingArea: { type: Number },
            utilities: {
                electricity: { type: String },
                water: { type: String },
                roadAccess: { type: String },
                other: { type: String },
            },
        },
        environment: {
            hasImb: { type: Boolean },
            hasPbb: { type: Boolean },
            hasAccessRoad: { type: Boolean },
            hasDisputeNotice: { type: Boolean },
            floodProne: { type: Boolean },
            sutet: { type: Boolean },
            nearCemetery: { type: Boolean },
            nearIndustrial: { type: Boolean },
            nearWasteFacility: { type: Boolean },
            onWaqfLand: { type: Boolean },
            onGreenBelt: { type: Boolean },
            carAccessible: { type: Boolean },
            boundaryNorth: { type: String },
            boundarySouth: { type: String },
            boundaryWest: { type: String },
            boundaryEast: { type: String },
            otherRisks: [{ type: String }],
            positiveFactors: [{ type: String }],
            riskLevel: { type: String, enum: ["low", "medium", "high"] },
            riskNotes: [{ type: String }],
            floodHistory: { type: String },
            sutetDistanceMeter: { type: Number },
        },
        facility: {
            roadClass: { type: String },
            roadMaterial: { type: String },
            facilityCompleteness: { type: String },
            roadWidth: { type: Number },
            transportAccess: { type: String },
            electricityCapacity: { type: String },
            waterSource: { type: String },
            floorPosition: { type: String },
            nearestPublicTransport: { type: String },
            distanceToCityCenterKm: { type: Number },
            notes: { type: String },
        },
        comparables: [MarketComparableSchema],
        valuationInput: {
            landArea: { type: Number },
            buildingArea: { type: Number },
            landRate: { type: Number },
            buildingStandardCode: { type: String },
            buildingStandardRate: { type: Number },
            buildingDepreciationPercent: { type: Number },
            buildingRate: { type: Number },
            njopLand: { type: Number },
            njopBuilding: { type: Number },
            safetyMarginPercent: { type: Number },
            liquidationFactorPercent: { type: Number },
            safetyMarginSource: { type: String },
            liquidationFactorSource: { type: String },
        },
        valuationResult: {
            marketValue: { type: Number },
            marketValueBeforeSafety: { type: Number },
            collateralValueAfterSafety: { type: Number },
            liquidationValue: { type: Number },
            totalSafetyDeduction: { type: Number },
            land: {
                valueBeforeSafety: { type: Number },
                safetyDeduction: { type: Number },
                valueAfterSafety: { type: Number },
                liquidationValue: { type: Number },
                averageValue: { type: Number },
                adjustedValuePerSquare: { type: Number },
            },
            building: {
                valueBeforeSafety: { type: Number },
                safetyDeduction: { type: Number },
                valueAfterSafety: { type: Number },
                liquidationValue: { type: Number },
                averageValue: { type: Number },
                adjustedValuePerSquare: { type: Number },
            },
            comparablesAnalysis: {
                weightedAveragePrice: { type: Number },
                weightedAveragePricePerSquare: { type: Number },
                totalWeight: { type: Number },
                notes: [{ type: String }],
            },
        },
        attachments: [AttachmentSchema],
        qualityChecks: [QualityCheckSchema],
        qualitySummary: {
            total: { type: Number },
            passed: { type: Number },
            failed: { type: Number },
            warnings: { type: Number },
        },
        auditTrail: [AuditLogEntrySchema],
        signatures: {
            appraiser: SignatureSchema,
            supervisor: SignatureSchema,
            reviewer: SignatureSchema,
        },
        workflowLock: WorkflowLockSchema,
        legalAlerts: [QualityCheckSchema],
        comparableAnalysis: {
            weightedAveragePrice: { type: Number },
            weightedAveragePricePerSquare: { type: Number },
            totalWeight: { type: Number },
            notes: [{ type: String }],
        },
        remarks: { type: String },
        submittedAt: { type: String },
        approvedAt: { type: String },
        rejectedAt: { type: String },
        rejectionReason: { type: String },
    },
    { timestamps: true }
);

// --- AppSettings Schema ---
const AppSettingsSchema = new Schema<AppSettings>({
    valuation: {
        safetyMarginOptions: [{ type: Number, required: true }],
        defaultSafetyMargin: { type: Number, required: true },
        liquidationFactorOptions: [{ type: Number, required: true }],
        defaultLiquidationFactor: { type: Number, required: true },
    },
    checklist: {
        requiredAttachments: [{ type: String, required: true }],
        requiredLegalDocumentTypes: [{ type: String, required: true }],
        requireComparablesCount: { type: Number, required: true },
        allowWarningsForSubmission: { type: Boolean, required: true },
    },
});

// --- Counters Schema ---
const CountersSchema = new Schema({
    reportNumber: { type: Number, required: true, default: 1000 },
});

// --- Models ---
export const UserModel = mongoose.model<User>("User", UserSchema);
export const ReportModel = mongoose.model<Report>("Report", ReportSchema);
export const AppSettingsModel = mongoose.model<AppSettings>("AppSettings", AppSettingsSchema);
export const CountersModel = mongoose.model("Counters", CountersSchema);
