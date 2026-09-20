import type { APIResponse } from "../types/api";

const BASE_URL = "/api/v1";

export class APIClientError extends Error {
  code: string;
  details?: any;
  status: number;

  constructor(message: string, code: string = "API_ERROR", status: number = 500, details?: any) {
    super(message);
    this.name = "APIClientError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  
  const headers = new Headers(options.headers || {});
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  // Only set Content-Type if body is not FormData (browser sets boundary automatically)
  if (!(options.body instanceof FormData) && !headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle direct file download or binary stream responses
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("image/") || contentType.includes("application/octet-stream")) {
    if (!response.ok) {
      throw new APIClientError(`Download failed with status ${response.status}`, "DOWNLOAD_ERROR", response.status);
    }
    return (await response.blob()) as unknown as T;
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    if (!response.ok) {
      throw new APIClientError(`HTTP ${response.status}: ${response.statusText}`, "NETWORK_ERROR", response.status);
    }
    return {} as T;
  }

  const apiResponse = data as APIResponse<T>;

  if (!response.ok || !apiResponse.success) {
    const error = apiResponse.error;
    const message = error?.message || `Request failed with status ${response.status}`;
    const code = error?.code || `HTTP_${response.status}`;
    throw new APIClientError(message, code, response.status, error?.details);
  }

  return apiResponse.data as T;
}
