import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { DownloadSafeShareCard } from "../components/safeshare/DownloadSafeShareCard";

describe("DownloadSafeShareCard Component", () => {
  it("renders audit indicators and download action", () => {
    render(
      <BrowserRouter>
        <DownloadSafeShareCard redactionId="test-redaction-id" />
      </BrowserRouter>
    );

    expect(screen.getByText("SafeShare Ready to Distribute")).toBeInTheDocument();
    expect(screen.getByText("Download Sanitized PNG")).toBeInTheDocument();
    expect(screen.getByText("Lossless PNG")).toBeInTheDocument();
    expect(screen.getByText("100% EXIF & GPS Stripped")).toBeInTheDocument();
    expect(screen.getByText("Verified (Internal SHA-256)")).toBeInTheDocument();
  });
});
