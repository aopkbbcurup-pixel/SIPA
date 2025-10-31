import path from "node:path";
import fs from "fs-extra";
import { v4 as uuidv4 } from "uuid";
import type {
  Attachment,
  CollateralItem,
  EnvironmentChecklist,
  FacilityInfo,
  GeneralInfo,
  MarketComparable,
  Report,
  ReportStatus,
  TechnicalSpecification,
  UserRole,
  ValuationInput,
  ValuationResult,
} from "../types/domain";
import { db } from "../store/database";
import { paths } from "../config/env";
import { computeBuildingValuation } from "../constants/buildingStandards";

type GeneralInfoInput = Omit<GeneralInfo, "reportNumber"> & { reportNumber?: string };
type CollateralInput = Omit<CollateralItem, "id"> & { id?: string };
type ComparableInput = Omit<MarketComparable, "id"> & { id?: string };

export interface ReportInput {
  title: string;
  assignedAppraiserId: string;
  generalInfo: GeneralInfoInput;
  collateral: CollateralInput[];
  technical: TechnicalSpecification;
  environment: EnvironmentChecklist;
  facility?: FacilityInfo;
  comparables: ComparableInput[];
  valuationInput: ValuationInput;
  remarks?: string;
}

export interface ReportQuery {
  search?: string;
  status?: ReportStatus;
  from?: string;
  to?: string;
}

function calculateValuation(input: ValuationInput): ValuationResult {
  const landValue = input.landArea * input.landRate;
  const buildingValue = input.buildingArea * input.buildingRate;
  const marketValue = landValue + buildingValue;
  const marketValueBeforeSafety = marketValue;
  const safetyDeduction = (marketValueBeforeSafety * input.safetyMarginPercent) / 100;
  const collateralValueAfterSafety = marketValueBeforeSafety - safetyDeduction;
  const liquidationValue = (collateralValueAfterSafety * input.liquidationFactorPercent) / 100;

  return {
    marketValue: Math.round(marketValue),
    marketValueBeforeSafety: Math.round(marketValueBeforeSafety),
    collateralValueAfterSafety: Math.round(collateralValueAfterSafety),
    liquidationValue: Math.round(liquidationValue),
  };
}

function normaliseValuationInput(
  valuationInput: ValuationInput,
  context: { technical: TechnicalSpecification; generalInfo: GeneralInfoInput },
): ValuationInput {
  const params: {
    standardCode: ValuationInput["buildingStandardCode"];
    yearBuilt?: number;
    appraisalDate?: string;
  } = {
    standardCode: valuationInput.buildingStandardCode,
  };
  if (typeof context.technical.yearBuilt === "number") {
    params.yearBuilt = context.technical.yearBuilt;
  }
  if (context.generalInfo.appraisalDate) {
    params.appraisalDate = context.generalInfo.appraisalDate;
  }

  const { adjustedRate, depreciationPercent, standardRate } = computeBuildingValuation(params);

  return {
    ...valuationInput,
    buildingStandardRate: standardRate,
    buildingDepreciationPercent: depreciationPercent,
    buildingRate: adjustedRate,
  };
}

export class ReportService {
  listReports(query: ReportQuery = {}) {
    const reports = db.getReports();
    return reports.filter((report) => {
      const matchesSearch =
        !query.search ||
        [report.generalInfo.customerName, report.generalInfo.reportNumber, report.title]
          .join(" ")
          .toLowerCase()
          .includes(query.search.toLowerCase());

      const matchesStatus = !query.status || report.status === query.status;
      const reportDate = new Date(report.createdAt).valueOf();
      const matchesFrom = !query.from || reportDate >= new Date(query.from).valueOf();
      const matchesTo = !query.to || reportDate <= new Date(query.to).valueOf();

      return matchesSearch && matchesStatus && matchesFrom && matchesTo;
    });
  }

  getReport(reportId: string) {
    const report = db.getReportById(reportId);
    if (!report) {
      throw new Error("Report not found");
    }
    return report;
  }

  async createReport(input: ReportInput, requestedBy: string): Promise<Report> {
    const now = new Date().toISOString();
    const nextNumber = db.getNextReportNumber();
    const formattedReportNumber = `SIPA-${new Date().getFullYear()}-${String(nextNumber).padStart(4, "0")}`;
    const valuationInput = normaliseValuationInput(input.valuationInput, {
      technical: input.technical,
      generalInfo: input.generalInfo,
    });
    const valuationResult = calculateValuation(valuationInput);
    const collateral = input.collateral.map<CollateralItem>((item) => ({
      ...item,
      id: item.id ?? uuidv4(),
    }));
    const comparables = input.comparables.map<MarketComparable>((item) => ({
      ...item,
      id: item.id ?? uuidv4(),
    }));

    const report: Report = {
      id: uuidv4(),
      title: input.title,
      status: "draft",
      assignedAppraiserId: input.assignedAppraiserId,
      generalInfo: {
        ...input.generalInfo,
        reportNumber: formattedReportNumber,
      },
      collateral,
      technical: input.technical,
      environment: input.environment,
      ...(input.facility ? { facility: input.facility } : {}),
      comparables,
      valuationInput,
      valuationResult,
      attachments: [],
      createdAt: now,
      updatedAt: now,
    };
    if (input.remarks !== undefined) {
      report.remarks = input.remarks;
    }
    await db.addReport(report);
    return report;
  }

  async updateReport(
    reportId: string,
    input: ReportInput,
    requester: { id: string; role: UserRole },
  ): Promise<Report> {
    const report = this.getReport(reportId);
    const isOwner = report.assignedAppraiserId === requester.id;
    const isAdmin = requester.role === "admin";

    if (report.status === "approved" && !isAdmin && !isOwner) {
      throw new Error("Approved report cannot be modified");
    }
    if (!isOwner && !isAdmin) {
      throw new Error("Anda tidak memiliki akses untuk memperbarui laporan ini.");
    }
    const valuationInput = normaliseValuationInput(input.valuationInput, {
      technical: input.technical,
      generalInfo: input.generalInfo,
    });
    const valuationResult = calculateValuation(valuationInput);
    const collateral = input.collateral.map<CollateralItem>((item) => ({
      ...item,
      id: item.id ?? uuidv4(),
    }));
    const comparables = input.comparables.map<MarketComparable>((item) => ({
      ...item,
      id: item.id ?? uuidv4(),
    }));

    const payload: Partial<Report> = {
      title: input.title,
      assignedAppraiserId: input.assignedAppraiserId,
      generalInfo: {
        ...input.generalInfo,
        reportNumber: report.generalInfo.reportNumber,
      },
      collateral,
      technical: input.technical,
      environment: input.environment,
      comparables,
      valuationInput,
      valuationResult,
    };
    if (input.facility !== undefined) {
      payload.facility = input.facility;
    }
    if (input.remarks !== undefined) {
      payload.remarks = input.remarks;
    }
    await db.updateReport(reportId, payload);
    return this.getReport(reportId);
  }

  async deleteReport(reportId: string) {
    const report = this.getReport(reportId);
    const attachments = report.attachments ?? [];

    await Promise.all(
      attachments.map(async (attachment) => {
        const filePath = path.join(paths.uploadDir, attachment.filename);
        try {
          if (await fs.pathExists(filePath)) {
            await fs.remove(filePath);
          }
        } catch {
          // ignore cleanup failure, continue deleting report metadata
        }
      }),
    );

    const pdfFilePath = path.join(paths.pdfDir, `${report.generalInfo.reportNumber}.pdf`);
    try {
      if (await fs.pathExists(pdfFilePath)) {
        await fs.remove(pdfFilePath);
      }
    } catch {
      // ignore cleanup failure
    }

    await db.deleteReport(reportId);
  }

  async changeStatus(
    reportId: string,
    status: ReportStatus,
    options: { actorId: string; actorRole: UserRole; reason?: string },
  ) {
    const report = this.getReport(reportId);
    const isOwner = report.assignedAppraiserId === options.actorId;
    const isSupervisor = options.actorRole === "supervisor";
    const isAdmin = options.actorRole === "admin";

    const allowForReview = isOwner || isSupervisor || isAdmin;
    const allowApprovalFlow = isSupervisor || isAdmin;

    const isAuthorised =
      status === "for_review"
        ? allowForReview
        : status === "approved" || status === "rejected"
        ? allowApprovalFlow
        : status === "draft"
        ? isAdmin
        : false;

    if (!isAuthorised) {
      throw new Error("Anda tidak memiliki akses untuk mengubah status ini.");
    }

    const metadata: Partial<Report> = {};
    if (status === "rejected") {
      metadata.rejectionReason = options.reason ?? "";
    }
    await db.updateReportStatus(reportId, status, metadata);
  }

  async recalculate(reportId: string) {
    const report = this.getReport(reportId);
    const valuationResult = calculateValuation(report.valuationInput);
    await db.updateReport(reportId, {
      valuationResult,
    });
    return valuationResult;
  }

  async addAttachment(reportId: string, attachment: Attachment) {
    const report = this.getReport(reportId);
    report.attachments.push(attachment);
    await db.updateReport(reportId, { attachments: report.attachments });
    return attachment;
  }

  async removeAttachment(reportId: string, attachmentId: string) {
    const report = this.getReport(reportId);
    report.attachments = report.attachments.filter((att) => att.id !== attachmentId);
    await db.updateReport(reportId, { attachments: report.attachments });
  }
}

export const reportService = new ReportService();
