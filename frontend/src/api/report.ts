import { request } from "./client";
import type { IntelligenceReportData, CyberSafetyReceipt } from "../types/api";

export async function generateReport(scanId: string): Promise<IntelligenceReportData> {
  return request<IntelligenceReportData>(`/scan/${scanId}/report`, {
    method: "POST",
  });
}

export async function getReport(scanId: string): Promise<IntelligenceReportData> {
  return request<IntelligenceReportData>(`/scan/${scanId}/report`, {
    method: "GET",
  });
}

export async function getSummary(scanId: string): Promise<CyberSafetyReceipt> {
  return request<CyberSafetyReceipt>(`/scan/${scanId}/summary`, {
    method: "GET",
  });
}
