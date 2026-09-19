import { request } from "./client";
import type { DetectionSummaryData } from "../types/api";

export async function detectExposure(scanId: string): Promise<DetectionSummaryData> {
  return request<DetectionSummaryData>(`/scan/${scanId}/detect`, {
    method: "POST",
  });
}

export async function getFindings(scanId: string): Promise<any[]> {
  return request<any[]>(`/scan/${scanId}/findings`, {
    method: "GET",
  });
}

export async function getScore(scanId: string): Promise<any> {
  return request<any>(`/scan/${scanId}/score`, {
    method: "GET",
  });
}
