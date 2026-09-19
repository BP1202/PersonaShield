import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProcessingTimeline, type PipelineStage } from "../components/processing/ProcessingTimeline";

describe("ProcessingTimeline Component", () => {
  const sampleStages: PipelineStage[] = [
    {
      id: "upload",
      name: "Upload & File Integrity",
      endpoint: "POST /api/v1/scan",
      description: "UUID isolation and SHA-256 fingerprinting.",
      state: "completed",
      detail: "Artifact securely buffered.",
    },
    {
      id: "ocr",
      name: "OCR Extraction Pipeline",
      endpoint: "POST /api/v1/scan/{id}/extract",
      description: "Preprocessing and text normalization.",
      state: "running",
    },
    {
      id: "detect",
      name: "Exposure Intelligence & Scoring",
      endpoint: "POST /api/v1/scan/{id}/detect",
      description: "Compounding risk analysis.",
      state: "pending",
    },
  ];

  it("renders all pipeline stages with endpoints", () => {
    render(<ProcessingTimeline stages={sampleStages} />);

    expect(screen.getByText("Upload & File Integrity")).toBeInTheDocument();
    expect(screen.getByText("OCR Extraction Pipeline")).toBeInTheDocument();
    expect(screen.getByText("Exposure Intelligence & Scoring")).toBeInTheDocument();

    expect(screen.getByText("POST /api/v1/scan")).toBeInTheDocument();
    expect(screen.getByText("POST /api/v1/scan/{id}/extract")).toBeInTheDocument();
  });

  it("displays correct status labels and detail outputs", () => {
    render(<ProcessingTimeline stages={sampleStages} />);

    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Running...")).toBeInTheDocument();
    expect(screen.getByText("Waiting")).toBeInTheDocument();
    expect(screen.getByText("Artifact securely buffered.")).toBeInTheDocument();
  });
});
