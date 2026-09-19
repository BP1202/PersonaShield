import { request } from "./client";
import type { ExtractionSummaryData, EntityItem } from "../types/api";

export async function extractEntities(scanId: string): Promise<ExtractionSummaryData> {
  return request<ExtractionSummaryData>(`/scan/${scanId}/extract`, {
    method: "POST",
  });
}

export async function getEntities(scanId: string): Promise<EntityItem[]> {
  return request<EntityItem[]>(`/scan/${scanId}/entities`, {
    method: "GET",
  });
}
