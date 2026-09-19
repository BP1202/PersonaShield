import { request } from "./client";
import type { ScanUploadData } from "../types/api";

export async function uploadScan(file: File): Promise<ScanUploadData> {
  const formData = new FormData();
  formData.append("file", file);

  return request<ScanUploadData>("/scan", {
    method: "POST",
    body: formData,
  });
}

export async function getScanStatus(scanId: string): Promise<ScanUploadData> {
  return request<ScanUploadData>(`/scan/${scanId}`, {
    method: "GET",
  });
}
