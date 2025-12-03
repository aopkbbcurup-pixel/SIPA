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

async function inlineAttachments(attachments: Report["attachments"] | undefined): Promise<InlineAttachment[]> {
  if (!attachments || !Array.isArray(attachments)) {
    console.log("PdfService: No attachments found or invalid format.");
    return [];
  }

  console.log(`PdfService: Processing ${attachments.length} attachments...`);
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
          console.warn(`PdfService: Attachment file not found at ${filePath}`);
          return { ...attachment };
        }
        const buffer = await fs.readFile(filePath);
        const base64 = buffer.toString("base64");
        return { ...attachment, dataUrl: `data:${mime};base64,${base64}` };
      } catch (err) {
        console.error(`PdfService: Error reading attachment ${filePath}:`, err);
        return { ...attachment };
      }
    }),
  );
}

export async function buildReportHtmlWithInlineAssets(report: Report): Promise<string> {
  console.log("PdfService: Inlining assets...");
  const attachmentsWithInline = await inlineAttachments(report.attachments);
  return renderReportHtml(report, { attachments: attachmentsWithInline });
}

export class PdfService {
  async generate(report: Report): Promise<PdfResult> {
    console.log("PdfService: Starting PDF generation for report", report.id);
    try {
      console.log("PdfService: Launching browser...");
      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      try {
        console.log("PdfService: Browser launched. Creating new page...");
        const page = await browser.newPage();

        console.log("PdfService: Building HTML content...");
        const html = await buildReportHtmlWithInlineAssets(report);

        console.log("PdfService: Setting page content...");
        await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 60000 }); // Increased timeout

        const fileName = `${report.generalInfo.reportNumber}.pdf`;
        await fs.ensureDir(paths.pdfDir);
        const filePath = path.join(paths.pdfDir, fileName);

        console.log(`PdfService: Generating PDF to ${filePath}...`);
        await page.pdf({
          path: filePath,
          format: "A4",
          printBackground: true,
          margin: { top: "24px", bottom: "24px", left: "24px", right: "24px" },
        });

        console.log("PdfService: PDF generated successfully.");
        return { fileName, filePath };
      } finally {
        console.log("PdfService: Closing browser...");
        await browser.close();
      }
    } catch (error) {
      console.error("PdfService: Error generating PDF:", error);
      throw error;
    }
  }
}

export const pdfService = new PdfService();
