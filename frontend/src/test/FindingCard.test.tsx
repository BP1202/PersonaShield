import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FindingCard } from "../components/findings/FindingCard";
import type { FindingItem } from "../types/api";

describe("FindingCard Component", () => {
  const sampleFinding: FindingItem = {
    id: "finding-uuid-1",
    threat_category: "DEVELOPER_SECRETS",
    finding_type: "AWS Access Key",
    severity: "CRITICAL",
    confidence: 0.98,
    masked_evidence: "AKIA************Q9TZ",
    attack_surface: "Developer",
    exposure_vector: "Credential Leakage",
    confidence_reasons: [
      "AKIA prefix matches AWS key format.",
      "OCR confidence: 0.98.",
      "Bounding box confirmed.",
    ],
    recommendation: "Rotate the key immediately and audit CloudTrail.",
    remediation_playbook: {
      action: "Revoke AWS IAM credentials",
      steps: ["Navigate to AWS IAM Console", "Deactivate Access Key ID"],
    },
  };

  it("renders collapsed finding summary with masked evidence", () => {
    render(<FindingCard finding={sampleFinding} />);

    expect(screen.getByText("AWS Access Key")).toBeInTheDocument();
    expect(screen.getByText("CRITICAL")).toBeInTheDocument();
    expect(screen.getByText("Developer")).toBeInTheDocument();
    expect(screen.getByText("AKIA************Q9TZ")).toBeInTheDocument();
  });

  it("expands to display confidence reasons and remediation on click", () => {
    render(<FindingCard finding={sampleFinding} />);

    // Click header to expand
    fireEvent.click(screen.getByText("AWS Access Key"));

    expect(screen.getByText("AKIA prefix matches AWS key format.")).toBeInTheDocument();
    expect(screen.getByText("Rotate the key immediately and audit CloudTrail.")).toBeInTheDocument();
    expect(screen.getByText(/Navigate to AWS IAM Console/i)).toBeInTheDocument();
  });
});
