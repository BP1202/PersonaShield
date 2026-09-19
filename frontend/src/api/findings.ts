import { request } from "./client";
import type { FindingsData, ExposureScoreData } from "../types/api";

export async function detectExposure(scanId: string): Promise<FindingsData> {
  return request<FindingsData>(`/scan/${scanId}/detect`, {
    method: "POST",
  });
}

export async function getFindings(scanId: string): Promise<FindingsData> {
  return request<FindingsData>(`/scan/${scanId}/findings`, {
    method: "GET",
  });
}

export async function getScore(scanId: string): Promise<ExposureScoreData> {
  return request<ExposureScoreData>(`/scan/${scanId}/score`, {
    method: "GET",
  });
}
