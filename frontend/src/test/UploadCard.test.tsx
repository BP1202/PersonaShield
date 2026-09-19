import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { UploadCard } from "../components/upload/UploadCard";

describe("UploadCard Component", () => {
  it("renders upload dropzone instructions", () => {
    const mockUpload = vi.fn();
    render(<UploadCard onUpload={mockUpload} />);

    expect(screen.getByText(/Drop screenshot, document, or PDF here/i)).toBeInTheDocument();
    expect(screen.getByText(/Browse from Computer/i)).toBeInTheDocument();
    expect(screen.getByText(/Max 15 MB/i)).toBeInTheDocument();
  });

  it("handles valid file selection and shows file info", () => {
    const mockUpload = vi.fn();
    render(<UploadCard onUpload={mockUpload} />);

    const input = document.getElementById("document-upload-input") as HTMLInputElement;
    const file = new File([new Uint8Array([137, 80, 78, 71])], "screenshot.png", {
      type: "image/png",
    });

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText("screenshot.png")).toBeInTheDocument();
    expect(screen.getByText(/Start Cybersecurity Scan/i)).toBeInTheDocument();
  });

  it("calls onUpload when submit button is clicked", () => {
    const mockUpload = vi.fn().mockResolvedValue(undefined);
    render(<UploadCard onUpload={mockUpload} />);

    const input = document.getElementById("document-upload-input") as HTMLInputElement;
    const file = new File([new Uint8Array([137, 80, 78, 71])], "receipt.png", {
      type: "image/png",
    });

    fireEvent.change(input, { target: { files: [file] } });

    const submitBtn = screen.getByText(/Start Cybersecurity Scan/i);
    fireEvent.click(submitBtn);

    expect(mockUpload).toHaveBeenCalledWith(file);
  });
});
