import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SafeShareComparison } from "../components/safeshare/SafeShareComparison";
import type { SafeShareResponseData } from "../types/api";

describe("SafeShareComparison Component", () => {
  const sampleSafeShare: SafeShareResponseData = {
    redaction_id: "redaction-12345678",
    download_url: "/api/v1/redaction/redaction-12345678/download",
    total_redacted_regions: 2,
    applied_findings_count: 2,
    custom_regions_count: 0,
    metadata_removed: true,
  };

  it("renders redacted image preview and metadata stats", () => {
    const mockModeChange = vi.fn();
    render(
      <SafeShareComparison
        safeShareData={sampleSafeShare}
        activeMode="blur"
        onModeChange={mockModeChange}
      />
    );

    const img = screen.getByAltText("SafeShare Redacted Preview") as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toContain("/api/v1/redaction/redaction-12345678/download");
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Regions Redacted/i)).toBeInTheDocument();
    expect(screen.getByText(/100% EXIF & GPS Metadata Removed/i)).toBeInTheDocument();
  });

  it("calls onModeChange when switching mode button is clicked", () => {
    const mockModeChange = vi.fn();
    render(
      <SafeShareComparison
        safeShareData={sampleSafeShare}
        activeMode="blur"
        onModeChange={mockModeChange}
      />
    );

    const blackoutBtn = screen.getByText("blackout");
    fireEvent.click(blackoutBtn);

    expect(mockModeChange).toHaveBeenCalledWith("blackout");
  });
});
