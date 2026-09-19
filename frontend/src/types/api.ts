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
  category: string;
  entity_type: string;
  text_snippet: string;
  confidence: number;
  bbox: [number, number, number, number];
  page_number: number;
  created_at: string;
}

export interface ExtractionSummaryData {
  scan_id: string;
  status: string;
  total_characters: number;
  total_tokens: number;
  total_entities: number;
  entities_by_category: Record<string, number>;
}

export interface RecommendationData {
  title: string;
  priority?: string;
  impact_summary: string;
  action_steps: string[];
}

export interface EvidenceCardData {
  id: string;
  finding_type: string;
  category: string;
  attack_surface: string;
  exposure_vector: string;
  severity: string;
  confidence: number;
  confidence_reasons: string[];
  masked_value: string;
  bbox: [number, number, number, number];
  page_number: number;
  recommendation: RecommendationData;
}

export interface CyberSafetyReceipt {
  scan_id: string;
  exposure_score: number;
  risk_level: string;
  total_findings: number;
  files_scanned?: number;
  critical_findings?: number;
  high_findings?: number;
  medium_findings?: number;
  low_findings?: number;
  critical_count?: number;
  high_count?: number;
  medium_count?: number;
  low_count?: number;
  safeshare_ready?: boolean;
  safeshare_available?: boolean;
  threat_categories: Record<string, number> | string[];
  generated_at: string;
}

export interface ExposureChainStep {
  step_number: number;
  stage: string;
  description: string;
}

export interface ExposureChainData {
  finding_type: string;
  title: string;
  steps: ExposureChainStep[];
}

export interface IntelligenceReportData {
  report_id: string;
  scan_id: string;
  receipt: CyberSafetyReceipt;
  evidence_cards: EvidenceCardData[];
  exposure_chains: ExposureChainData[];
  safeshare_available: boolean;
  safeshare_preview_cta?: string;
}

export interface DetectionSummaryData {
  scan_id: string;
  status: string;
  total_findings: number;
  exposure_score: number;
  risk_level: string;
  findings: any[];
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
