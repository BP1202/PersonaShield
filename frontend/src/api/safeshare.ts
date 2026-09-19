import { request } from "./client";
import type { SafeShareGenerateRequest, SafeShareResponseData } from "../types/api";

export async function generateSafeShare(
  scanId: string,
  options: SafeShareGenerateRequest = {}
): Promise<SafeShareResponseData> {
  return request<SafeShareResponseData>(`/scan/${scanId}/safeshare`, {
    method: "POST",
    body: JSON.stringify(options),
  });
}

export async function getSafeShare(scanId: string): Promise<SafeShareResponseData> {
  return request<SafeShareResponseData>(`/scan/${scanId}/safeshare`, {
    method: "GET",
  });
}

export async function downloadSafeShare(redactionId: string): Promise<Blob> {
  return request<Blob>(`/redaction/${redactionId}/download`, {
    method: "GET",
  });
}

export function triggerBlobDownload(blob: Blob, filename = "SafeShare_sanitized.png"): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
