import path from "node:path";
import fs from "fs-extra";
import puppeteer from "puppeteer";
import type { Report } from "../types/domain";
import { paths } from "../config/env";
import { renderReportHtml } from "../templates/reportTemplate";

export interface PdfResult {
  filePath: string;
  fileName: string;
}

type InlineAttachment = Report["attachments"][number] & { dataUrl?: string };

async function inlineAttachments(attachments: Report["attachments"]): Promise<InlineAttachment[]> {
  return Promise.all(
    attachments.map(async (attachment) => {
      const mime = attachment.mimeType;
      const isImage = typeof mime === "string" && mime.startsWith("image/");
      if (!isImage) {
        return { ...attachment };
      }

      const filePath = path.join(paths.uploadDir, attachment.filename);
      try {
        const exists = await fs.pathExists(filePath);
        if (!exists) {
          return { ...attachment };
        }
        const buffer = await fs.readFile(filePath);
        const base64 = buffer.toString("base64");
        return { ...attachment, dataUrl: `data:${mime};base64,${base64}` };
      } catch {
        return { ...attachment };
      }
    }),
  );
}

export async function buildReportHtmlWithInlineAssets(report: Report): Promise<string> {
  const attachmentsWithInline = await inlineAttachments(report.attachments);
  return renderReportHtml(report, { attachments: attachmentsWithInline });
}

export class PdfService {
  async generate(report: Report): Promise<PdfResult> {
    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      const html = await buildReportHtmlWithInlineAssets(report);
      await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 0 });
      const fileName = `${report.generalInfo.reportNumber}.pdf`;
      await fs.ensureDir(paths.pdfDir);
      const filePath = path.join(paths.pdfDir, fileName);
      await page.pdf({
        path: filePath,
        format: "A4",
        printBackground: true,
        margin: { top: "24px", bottom: "24px", left: "24px", right: "24px" },
      });
      return { fileName, filePath };
    } finally {
      await browser.close();
    }
  }
}

export const pdfService = new PdfService();
