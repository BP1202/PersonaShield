import { request } from "./client";
import type { ExtractionData } from "../types/api";

export async function extractEntities(scanId: string): Promise<ExtractionData> {
  return request<ExtractionData>(`/scan/${scanId}/extract`, {
    method: "POST",
  });
}

export async function getEntities(scanId: string): Promise<ExtractionData> {
  return request<ExtractionData>(`/scan/${scanId}/entities`, {
    method: "GET",
  });
}
