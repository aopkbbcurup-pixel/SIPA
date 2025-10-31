import { api, getApiBaseUrl } from "./api";
import type {
  Attachment,
  AttachmentCategory,
  MetadataResponse,
  Report,
  ReportInputPayload,
  ReportStatus,
  ValuationResult,
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
  const { data } = await api.post<ValuationResult>(`/reports/${reportId}/recalculate`);
  return data;
}

export async function uploadReportAttachments(
  reportId: string,
  category: AttachmentCategory,
  files: FileList | File[],
) {
  const formData = new FormData();
  formData.append("category", category);
  Array.from(files).forEach((file) => formData.append("files", file));
  const { data } = await api.post<Attachment[]>(`/reports/${reportId}/attachments`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
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

export function getUploadsBaseUrl() {
  const apiUrl = getApiBaseUrl();
  return apiUrl.replace(/\/api$/, "/uploads");
}
