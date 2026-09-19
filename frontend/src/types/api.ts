export interface APIError {
  code: string;
  message: string;
  details?: any;
}

export interface APIResponse<T> {
  success: boolean;
  data: T | null;
  error: APIError | null;
  request_id: string;
}

export interface ScanUploadData {
  scan_id: string;
  status: string;
  original_filename: string;
  file_size_bytes: number;
  mime_type: string;
  created_at: string;
}

export interface EntityItem {
  id: string;
  entity_type: string;
  text_snippet: string;
  confidence: number;
  bbox: [number, number, number, number];
  page_number: number;
}

export interface ExtractionData {
  scan_id: string;
  status: string;
  total_entities: number;
  entities: EntityItem[];
}

export interface FindingItem {
  id: string;
  scan_id?: string;
  threat_category: string;
  finding_type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  confidence: number;
  masked_evidence: string;
  attack_surface?: string;
  exposure_vector?: string;
  confidence_reasons?: string[];
  recommendation: string;
  remediation_playbook?: {
    action: string;
    steps: string[];
  };
  bounding_box?: [number, number, number, number];
  created_at?: string;
}

export interface FindingsData {
  scan_id: string;
  total_findings: number;
  findings: FindingItem[];
  exposure_score: number;
  risk_level: string;
  category_breakdown: Record<string, number>;
}

export interface ExposureScoreData {
  scan_id: string;
  exposure_score: number;
  risk_level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "SAFE";
  total_findings: number;
  severity_counts: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  compounding_risk_bonus: number;
}

export interface ExposureChainStep {
  step: number;
  title: string;
  description: string;
}

export interface CyberSafetyReceipt {
  scan_id: string;
  exposure_score: number;
  risk_level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "SAFE";
  total_findings: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  threat_categories: string[];
  safeshare_available: boolean;
  generated_at: string;
}

export interface IntelligenceReportData {
  scan_id: string;
  receipt: CyberSafetyReceipt;
  findings: FindingItem[];
  exposure_chains: Record<string, ExposureChainStep[]>;
  threat_category_breakdown: Record<string, number>;
}

export interface SafeShareRegionItem {
  source: string;
  finding_id?: string;
  finding_type: string;
  bbox: [number, number, number, number];
  mode: string;
  masked_value?: string;
  label?: string;
}

export interface SafeShareResponseData {
  redaction_id: string;
  download_url: string;
  total_redacted_regions: number;
  applied_findings_count: number;
  custom_regions_count: number;
  metadata_removed: boolean;
  output_sha256?: string;
  redacted_regions?: SafeShareRegionItem[];
  created_at?: string;
}

export interface SafeShareGenerateRequest {
  selected_finding_ids?: string[];
  custom_regions?: Array<{
    bbox: [number, number, number, number];
    mode?: string;
    label?: string;
  }>;
  override_modes?: Record<string, string>;
  blur_intensity?: number;
}
