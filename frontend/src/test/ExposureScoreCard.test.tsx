import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ExposureScoreCard } from "../components/report/ExposureScoreCard";
import type { CyberSafetyReceipt } from "../types/api";

describe("ExposureScoreCard Component", () => {
  const sampleReceipt: CyberSafetyReceipt = {
    scan_id: "test-scan-123",
    exposure_score: 85,
    risk_level: "CRITICAL",
    total_findings: 3,
    critical_count: 2,
    high_count: 1,
    medium_count: 0,
    low_count: 0,
    threat_categories: ["DEVELOPER_SECRETS"],
    safeshare_available: true,
    generated_at: "2026-09-20T00:00:00Z",
  };

  it("renders exposure score and risk level badge", () => {
    render(<ExposureScoreCard receipt={sampleReceipt} />);

    expect(screen.getByText("85")).toBeInTheDocument();
    expect(screen.getByText(/CRITICAL RISK/i)).toBeInTheDocument();
    expect(screen.getByText(/Cyber Safety Receipt/i)).toBeInTheDocument();
  });

  it("displays leak counts and SafeShare ready indicator", () => {
    render(<ExposureScoreCard receipt={sampleReceipt} />);

    expect(screen.getByText("3")).toBeInTheDocument(); // total leaks
    expect(screen.getByText("2")).toBeInTheDocument(); // critical
    expect(screen.getByText("1")).toBeInTheDocument(); // high risk
    expect(screen.getByText(/SafeShare Ready/i)).toBeInTheDocument();
  });
});
