import { api, getApiBaseUrl } from "./api";
import type {
  AppSettings,
  Attachment,
  AttachmentCategory,
  LegalDocumentVerification,
  MetadataResponse,
  Report,
  ReportInputPayload,
  ReportStatus,
} from "../types/report";

export interface ReportQueryParams {
  search?: string;
  status?: ReportStatus;
  from?: string;
  to?: string;
}

export async function fetchReports(params: ReportQueryParams = {}) {
  const { data } = await api.get<Report[]>("/reports", { params });
  return data;
}

export async function fetchReport(reportId: string) {
  const { data } = await api.get<Report>(`/reports/${reportId}`);
  return data;
}

export async function fetchMetadata() {
  const { data } = await api.get<MetadataResponse>("/meta");
  return data;
}

export async function createReport(payload: ReportInputPayload) {
  const { data } = await api.post<Report>("/reports", payload);
  return data;
}

export async function updateReport(reportId: string, payload: ReportInputPayload) {
  const { data } = await api.put<Report>(`/reports/${reportId}`, payload);
  return data;
}

export async function deleteReport(reportId: string) {
  await api.delete(`/reports/${reportId}`);
}

export async function updateReportStatus(reportId: string, status: ReportStatus, reason?: string) {
  const { data } = await api.patch<Report>(`/reports/${reportId}/status`, {
    status,
    ...(reason ? { reason } : {}),
  });
  return data;
}

export async function recalculateReport(reportId: string) {
  const { data } = await api.post<Report>(`/reports/${reportId}/recalculate`);
  return data;
}


export async function uploadReportAttachments(
  reportId: string,
  category: AttachmentCategory,
  files: FileList | File[],
  options?: { latitude?: number; longitude?: number; capturedAt?: string; onProgress?: (percent: number) => void },
) {
  const formData = new FormData();
  formData.append("category", category);
  if (options?.latitude !== undefined) {
    formData.append("latitude", String(options.latitude));
  }
  if (options?.longitude !== undefined) {
    formData.append("longitude", String(options.longitude));
  }
  if (options?.capturedAt) {
    formData.append("capturedAt", options.capturedAt);
  }
  Array.from(files).forEach((file) => formData.append("files", file));
  const { data } = await api.post<Attachment[]>(`/reports/${reportId}/attachments`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (event) => {
      if (!options?.onProgress) {
        return;
      }
      const total = event.total ?? 0;
      if (total <= 0) {
        return;
      }
      const percent = Math.round((event.loaded / total) * 100);
      options.onProgress(percent);
    },
  });
  return data;
}

export async function deleteReportAttachment(reportId: string, attachmentId: string) {
  await api.delete(`/reports/${reportId}/attachments/${attachmentId}`);
}

export async function downloadReportPdf(reportId: string, filename?: string) {
  const response = await api.get<ArrayBuffer>(`/reports/${reportId}/pdf`, { responseType: "arraybuffer" });
  const blob = new Blob([response.data], { type: "application/pdf" });
  const link = document.createElement("a");
  const downloadName = filename ?? `report-${reportId}.pdf`;
  link.href = window.URL.createObjectURL(blob);
  link.download = downloadName;
  link.click();
  window.URL.revokeObjectURL(link.href);
}

export async function fetchReportPreview(reportId: string) {
  const response = await api.get<string>(`/reports/${reportId}/preview`, { responseType: "text" });
  return response.data;
}

export async function verifyLegalDocument(
  reportId: string,
  documentId: string,
  payload: LegalDocumentVerification,
) {
  const { data } = await api.patch<Report>(
    `/reports/${reportId}/legal-documents/${documentId}/verification`,
    payload,
  );
  return data;
}

export function getUploadsBaseUrl() {
  const apiUrl = getApiBaseUrl();
  return apiUrl.replace(/\/api$/, "/uploads");
}

export async function updateAppSettings(updates: Partial<AppSettings>) {
  const { data } = await api.patch<AppSettings>("/meta/settings", updates);
  return data;
}

export async function exportReports(params: ReportQueryParams = {}) {
  const response = await api.get<ArrayBuffer>("/reports/export", {
    params,
    responseType: "arraybuffer",
  });
  const blob = new Blob([response.data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const link = document.createElement("a");
  link.href = window.URL.createObjectURL(blob);
  link.download = "Laporan.xlsx";
  link.click();
  window.URL.revokeObjectURL(link.href);
}

export async function generateRemarks(reportData: Partial<Report>) {
  const { data } = await api.post<{ remarks: string }>("/ai/generate-remarks", reportData);
  return data.remarks;
}

export async function predictPrice(reportData: Partial<Report>) {
  const { data } = await api.post<{ min: number; max: number; confidence: number }>("/ai/predict-price", reportData);
  return data;
}

export async function chatWithAi(query: string) {
  const { data } = await api.post<{ answer: string }>("/ai/chat", { query });
  return data.answer;
}

export async function extractDocument(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post<any>("/ai/extract-document", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function analyzeImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post<any>("/ai/analyze-image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
