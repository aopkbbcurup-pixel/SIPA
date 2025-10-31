import type { Request, Response } from "express";
import path from "node:path";
import fs from "fs-extra";
import { reportService } from "../services/report.service";
import type { ReportQuery } from "../services/report.service";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { buildReportHtmlWithInlineAssets, pdfService } from "../services/pdf.service";
import type { PdfResult } from "../services/pdf.service";
import { attachmentCategorySchema } from "../types/report.dto";
import type { AttachmentCategory, ReportStatus, UserRole } from "../types/domain";
import { paths } from "../config/env";

const isPrivilegedReviewer = (role: UserRole) => role === "supervisor" || role === "admin";
const isAdmin = (role: UserRole) => role === "admin";
const unauthorizedMessage = "Anda tidak memiliki akses untuk melakukan aksi ini.";

export function listReportsController(req: Request, res: Response) {
  try {
    const query =
      (req as Request & { validatedQuery?: ReportQuery }).validatedQuery ??
      (req.query as unknown as ReportQuery);
    const reports = reportService.listReports(query);
    return res.json(reports);
  } catch (error) {
    return res.status(500).json({ message: (error as Error).message });
  }
}

export function getReportController(req: Request, res: Response) {
  try {
    const { id } = req.params as { id: string };
    const report = reportService.getReport(id);
    return res.json(report);
  } catch (error) {
    return res.status(404).json({ message: (error as Error).message });
  }
}

export async function createReportController(req: AuthenticatedRequest, res: Response) {
  try {
    const report = await reportService.createReport(req.body, req.user!.id);
    return res.status(201).json(report);
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
}

export async function updateReportController(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params as { id: string };
  const actor = req.user!;

  let existingReport;
  try {
    existingReport = reportService.getReport(id);
  } catch (error) {
    return res.status(404).json({ message: (error as Error).message });
  }

  const isOwner = existingReport.assignedAppraiserId === actor.id;
  if (!isOwner && !isAdmin(actor.role)) {
    return res.status(403).json({ message: unauthorizedMessage });
  }

  try {
    const report = await reportService.updateReport(id, req.body, {
      id: actor.id,
      role: actor.role,
    });
    return res.json(report);
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
}

export async function deleteReportController(req: Request, res: Response) {
  try {
    const { id } = req.params as { id: string };
    await reportService.deleteReport(id);
    return res.status(204).send();
  } catch (error) {
    return res.status(404).json({ message: (error as Error).message });
  }
}

export async function updateStatusController(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params as { id: string };
    const { status, reason } = req.body as { status: ReportStatus; reason?: string };
    const actorRole = req.user!.role;
    const actorId = req.user!.id;

    let report;
    try {
      report = reportService.getReport(id);
    } catch (error) {
      return res.status(404).json({ message: (error as Error).message });
    }

    const isOwner = report.assignedAppraiserId === actorId;

    const isAllowed =
      status === "for_review"
        ? ["appraiser", "supervisor", "admin"].includes(actorRole)
        : status === "approved" || status === "rejected"
        ? ["supervisor", "admin"].includes(actorRole)
      : status === "draft"
        ? actorRole === "admin"
        : false;

    if (!isAllowed) {
      return res.status(403).json({ message: "Anda tidak memiliki akses untuk mengubah status ini." });
    }

    if (status === "for_review" && actorRole === "appraiser" && !isOwner) {
      return res.status(403).json({ message: "Hanya penilai yang ditugaskan yang dapat mengajukan review." });
    }

    const trimmedReason = reason?.trim();
    if (status === "rejected" && !trimmedReason) {
      return res.status(400).json({ message: "Alasan penolakan wajib diisi." });
    }

    const options: { actorId: string; actorRole: UserRole; reason?: string } = { actorId, actorRole };
    if (trimmedReason) {
      options.reason = trimmedReason;
    }

    await reportService.changeStatus(id, status, options);
    const updatedReport = reportService.getReport(id);
    return res.json(updatedReport);
  } catch (error) {
    if (error instanceof Error && error.message === "Report not found") {
      return res.status(404).json({ message: "Laporan tidak ditemukan" });
    }
    if (error instanceof Error && error.message === "Anda tidak memiliki akses untuk mengubah status ini.") {
      return res.status(403).json({ message: error.message });
    }
    return res.status(400).json({ message: (error as Error).message });
  }
}

export async function recalculateController(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params as { id: string };
    const actor = req.user!;
    let report;
    try {
      report = reportService.getReport(id);
    } catch (error) {
      return res.status(404).json({ message: (error as Error).message });
    }

    const isOwner = report.assignedAppraiserId === actor.id;
    if (!isOwner && !isPrivilegedReviewer(actor.role)) {
      return res.status(403).json({ message: unauthorizedMessage });
    }

    const result = await reportService.recalculate(id);
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ message: (error as Error).message });
  }
}

export async function uploadAttachmentsController(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params as { id: string };
    const { category } = req.body as { category: AttachmentCategory };
    const actor = req.user!;
    const files = (req.files as Express.Multer.File[]) || [];

    const cleanupUploadedFiles = async () => {
      await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(paths.uploadDir, file.filename);
          try {
            if (await fs.pathExists(filePath)) {
              await fs.remove(filePath);
            }
          } catch {
            // ignore cleanup failure
          }
        }),
      );
    };

    let report;
    try {
      report = reportService.getReport(id);
    } catch (error) {
      await cleanupUploadedFiles();
      return res.status(404).json({ message: (error as Error).message });
    }

    const isOwner = report.assignedAppraiserId === actor.id;
    if (!isOwner && !isPrivilegedReviewer(actor.role)) {
      await cleanupUploadedFiles();
      return res.status(403).json({ message: unauthorizedMessage });
    }

    const categoryResult = attachmentCategorySchema.safeParse(category);
    if (!categoryResult.success) {
      await cleanupUploadedFiles();
      return res.status(400).json({ message: "Kategori lampiran tidak valid" });
    }

    if (!files.length) {
      return res.status(400).json({ message: "Tidak ada file yang diunggah" });
    }

    const attachments = [];
    for (const file of files) {
      const attachment = await reportService.addAttachment(id, {
        id: file.filename,
        category: categoryResult.data,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: `/uploads/${file.filename}`,
        uploadedBy: actor.id,
        uploadedAt: new Date().toISOString(),
      });
      attachments.push(attachment);
    }

    return res.status(201).json(attachments);
  } catch (error) {
    if (error instanceof Error && error.message === "Report not found") {
      return res.status(404).json({ message: "Laporan tidak ditemukan" });
    }
    return res.status(400).json({ message: (error as Error).message });
  }
}

export async function deleteAttachmentController(req: AuthenticatedRequest, res: Response) {
  try {
    const { id, attachmentId } = req.params as { id: string; attachmentId: string };
    const report = reportService.getReport(id);
    const actor = req.user!;
    const isOwner = report.assignedAppraiserId === actor.id;
    if (!isOwner && !isPrivilegedReviewer(actor.role)) {
      return res.status(403).json({ message: unauthorizedMessage });
    }

    const target = report.attachments.find((att) => att.id === attachmentId);
    if (!target) {
      return res.status(404).json({ message: "Lampiran tidak ditemukan" });
    }

    const filePath = path.join(paths.uploadDir, target.filename);
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
    }

    await reportService.removeAttachment(id, attachmentId);
    return res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message === "Report not found") {
      return res.status(404).json({ message: "Laporan tidak ditemukan" });
    }
    return res.status(400).json({ message: (error as Error).message });
  }
}

export async function generatePdfController(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params as { id: string };
    const actor = req.user!;
    let report;
    try {
      report = reportService.getReport(id);
    } catch (error) {
      return res.status(404).json({ message: (error as Error).message });
    }

    const isOwner = report.assignedAppraiserId === actor.id;
    if (!isOwner && !isPrivilegedReviewer(actor.role)) {
      return res.status(403).json({ message: unauthorizedMessage });
    }

    const pdf: PdfResult = await pdfService.generate(report);
    return res.download(pdf.filePath, pdf.fileName);
  } catch (error) {
    return res.status(500).json({ message: (error as Error).message });
  }
}

export async function previewReportController(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params as { id: string };
    const actor = req.user!;
    let report;
    try {
      report = reportService.getReport(id);
    } catch (error) {
      return res.status(404).json({ message: (error as Error).message });
    }

    const isOwner = report.assignedAppraiserId === actor.id;
    if (!isOwner && !isPrivilegedReviewer(actor.role)) {
      return res.status(403).json({ message: unauthorizedMessage });
    }

    const html = await buildReportHtmlWithInlineAssets(report);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(html);
  } catch (error) {
    return res.status(500).json({ message: (error as Error).message });
  }
}
