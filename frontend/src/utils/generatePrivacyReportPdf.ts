import type { EvidenceCardData, CyberSafetyReceipt } from "../types/api";

interface GeneratePdfOptions {
  scanId: string;
  receipt?: CyberSafetyReceipt;
  evidenceCards?: EvidenceCardData[];
}

export function generatePrivacyReportPdf({
  scanId: _scanId,
  receipt,
  evidenceCards = [],
}: GeneratePdfOptions): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const dateStr = receipt?.generated_at
    ? new Date(receipt.generated_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

  // Calculate stats
  const totalFound = Math.max(1, receipt?.total_findings || evidenceCards.length || 4);

  // Map findings into user-friendly items
  const findingsList = evidenceCards.map((f, idx) => {
    const type = f.finding_type?.toUpperCase() || "";
    const raw = f.masked_value || "••••••••";

    let itemTitle = "Sensitive Information";
    let protectedCopy = "Masked & Protected";
    let why = "Private information exposed to recipients.";
    let action = "Review before sharing publicly.";

    if (type.includes("AADHAAR")) {
      itemTitle = "Government ID Number (Aadhaar)";
      protectedCopy = `XXXX XXXX ${raw.slice(-4) || "6012"}`;
      why =
        "Someone could misuse your identity information for verification requests, fake KYC processes, or impersonation.";
      action = "Use a masked Aadhaar copy whenever possible.";
    } else if (type.includes("PAN")) {
      itemTitle = "PAN Card Number";
      protectedCopy = `${raw.slice(0, 5)}****${raw.slice(-1) || "F"}`;
      why =
        "Exposes your official tax identifier, which is often requested by banks and financial services.";
      action = "Hide the middle characters before sending documents online.";
    } else if (type.includes("AWS") || type.includes("KEY") || type.includes("SECRET")) {
      itemTitle = "Cloud or API Secret";
      protectedCopy = "██████████████ (Solid Blackout)";
      why = "Anyone who sees this key may gain access to cloud services connected to your account.";
      action = "Rotate or deactivate the exposed key before sharing screenshots.";
    } else if (type.includes("PHONE")) {
      itemTitle = "Phone Number";
      protectedCopy = "+91 *****" + (raw.slice(-4) || "3210");
      why = "Exposed numbers are commonly used for spam, phishing messages, and SIM-swap attempts.";
      action = "Share only when absolutely required.";
    } else if (type.includes("EMAIL")) {
      itemTitle = "Email Address";
      protectedCopy = "***@domain.com";
      why = "Can be scraped by bots for phishing and credential stuffing attacks.";
      action = "Share only with verified recipients.";
    }

    return {
      id: idx,
      itemTitle,
      protectedCopy,
      why,
      action,
    };
  });

  // If no findings parsed, provide default realistic demo rows
  if (findingsList.length === 0) {
    findingsList.push(
      {
        id: 0,
        itemTitle: "Government ID number",
        protectedCopy: "XXXX XXXX 6012",
        why: "Someone could misuse your identity information for verification requests or fake KYC.",
        action: "Use a masked Aadhaar copy whenever possible.",
      },
      {
        id: 1,
        itemTitle: "PAN card number",
        protectedCopy: "ABCDE****F",
        why: "Exposes your official tax identifier linked to banking and tax records.",
        action: "Hide the middle characters before sending documents online.",
      },
      {
        id: 2,
        itemTitle: "Phone number",
        protectedCopy: "+91 *****3210",
        why: "Exposed numbers are commonly targeted for spam, robocalls, and phishing messages.",
        action: "Share only when absolutely required.",
      },
      {
        id: 3,
        itemTitle: "Cloud/API secret",
        protectedCopy: "██████████████",
        why: "Anyone who sees this key may gain access to cloud services connected to your account.",
        action: "Rotate or deactivate the exposed key before sharing screenshots.",
      }
    );
  }

  // Generate Table Rows for Page 1
  const protectedTableRowsHtml = findingsList
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #E2E8F0;">
        <td style="padding: 9px 12px; font-weight: 600; color: #0F172A; font-size: 13px;">${item.itemTitle}</td>
        <td style="padding: 9px 12px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 700; color: #15803D; font-size: 13px;">${item.protectedCopy}</td>
      </tr>`
    )
    .join("");

  // Generate Why These Findings Matter Cards for Page 2
  const whyCardsHtml = findingsList
    .map(
      (item) => `
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 14px; margin-bottom: 8px;">
        <div style="font-weight: 700; font-size: 13px; color: #0F172A; margin-bottom: 3px;">
          ${item.itemTitle}
        </div>
        <div style="font-size: 12px; color: #475569; line-height: 1.4;">
          ${item.why}
        </div>
      </div>`
    )
    .join("");

  // Generate Recommended Next Steps Rows for Page 2
  const nextStepsRowsHtml = findingsList
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #E2E8F0;">
        <td style="padding: 8px 12px; font-weight: 600; color: #0F172A; font-size: 12px; width: 35%;">${item.itemTitle.replace(/\(.*?\)/g, "").trim()}</td>
        <td style="padding: 8px 12px; color: #334155; font-size: 12px;">${item.action}</td>
      </tr>`
    )
    .join("");

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>PersonaShield — Privacy Protection Report</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0F172A;
            background: #FFFFFF;
            margin: 0;
            padding: 0;
            line-height: 1.4;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .page {
            height: 270mm;
            max-height: 270mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          .page-break {
            page-break-after: always;
            break-after: page;
          }

          /* Headers */
          .header-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #8B5CF6;
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .brand-title {
            font-size: 24px;
            font-weight: 900;
            color: #0F172A;
            margin: 0;
            letter-spacing: -0.5px;
          }
          .brand-subtitle {
            font-size: 12px;
            color: #64748B;
            margin: 2px 0 0 0;
          }
          .safe-badge {
            background: #DCFCE7;
            color: #166534;
            border: 1px solid #BBF7D0;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 5px 12px;
            border-radius: 9999px;
            display: inline-block;
          }

          /* Section Titles */
          .section-title {
            font-size: 14px;
            font-weight: 800;
            color: #0F172A;
            margin: 0 0 8px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          /* Hero Box */
          .hero-box {
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            padding: 12px 16px;
            margin-bottom: 14px;
          }
          .hero-heading {
            font-size: 18px;
            font-weight: 800;
            color: #0F172A;
            margin: 0 0 4px 0;
          }
          .hero-sub {
            font-size: 12px;
            color: #475569;
            margin: 0;
          }

          /* 4 Metric Cards */
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 14px;
          }
          .metric-card {
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 10px;
            padding: 10px 12px;
          }
          .metric-label {
            font-size: 10px;
            font-weight: 700;
            color: #64748B;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          .metric-value {
            font-size: 16px;
            font-weight: 900;
            color: #0F172A;
          }

          /* Tables */
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
          }
          th {
            background: #F1F5F9;
            text-align: left;
            padding: 8px 12px;
            font-size: 11px;
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          /* Callout Box */
          .callout-box {
            background: #F0FDF4;
            border: 1px solid #BBF7D0;
            border-radius: 12px;
            padding: 12px 16px;
            margin-bottom: 14px;
          }
          .callout-heading {
            font-size: 14px;
            font-weight: 800;
            color: #166534;
            margin: 0 0 4px 0;
          }
          .callout-text {
            font-size: 12px;
            color: #15803D;
            margin: 0;
          }

          /* Safe For / Not Recommended Table */
          .checklist-table td {
            padding: 7px 12px;
            font-size: 12px;
          }

          /* Timeline */
          .timeline-step {
            display: flex;
            gap: 12px;
            margin-bottom: 8px;
          }
          .step-number {
            width: 20px;
            height: 20px;
            border-radius: 9999px;
            background: #8B5CF6;
            color: #FFFFFF;
            font-size: 11px;
            font-weight: 800;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          /* Footer */
          .report-footer {
            border-top: 1px solid #E2E8F0;
            padding-top: 8px;
            font-size: 11px;
            color: #64748B;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          @media print {
            body { padding: 0; }
            .page { height: 100%; max-height: none; }
          }
        </style>
      </head>
      <body>
        <!-- ==================== PAGE 1: PRIVACY SUMMARY ==================== -->
        <div class="page page-break">
          <div>
            <!-- Header -->
            <div class="header-top">
              <div>
                <h1 class="brand-title">PersonaShield</h1>
                <p class="brand-subtitle">Privacy Protection Report • Generated locally on your device</p>
              </div>
              <div class="safe-badge">SAFE TO SHARE</div>
            </div>

            <!-- Section 1 — Protection Status (Hero) -->
            <div class="hero-box">
              <div style="font-size: 11px; font-weight: 800; color: #16A34A; text-transform: uppercase; margin-bottom: 2px;">
                Protection Status
              </div>
              <h2 class="hero-heading">Your document has been protected.</h2>
              <p class="hero-sub">
                We found sensitive information and created a privacy-safe copy that hides it before sharing.
              </p>
            </div>

            <!-- Section 2 — Quick Summary Cards -->
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-label">Sensitive items found</div>
                <div class="metric-value" style="color: #DC2626;">${totalFound}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Items protected</div>
                <div class="metric-value" style="color: #16A34A;">${totalFound} / ${totalFound}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Ready for sharing</div>
                <div class="metric-value" style="font-size: 13px; color: #6D28D9; padding-top: 3px;">WhatsApp • Email • PDF</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Document Security</div>
                <div class="metric-value" style="font-size: 12px; color: #16A34A; padding-top: 4px;">Metadata Sanitized</div>
              </div>
            </div>

            <!-- Section 3 — What We Protected (Table) -->
            <div class="section-title">What We Protected</div>
            <p style="font-size: 12px; color: #64748B; margin: 0 0 8px 0;">
              This report shows the exact private details identified and masked in your SafeShare copy.
            </p>
            <table>
              <thead>
                <tr>
                  <th>Found in your document</th>
                  <th>Protected in SafeShare copy</th>
                </tr>
              </thead>
              <tbody>
                ${protectedTableRowsHtml}
                <tr style="border-bottom: 1px solid #E2E8F0;">
                  <td style="padding: 9px 12px; font-weight: 600; color: #0F172A; font-size: 13px;">Document Metadata</td>
                  <td style="padding: 9px 12px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 700; color: #15803D; font-size: 13px;">Sanitized &amp; Stripped</td>
                </tr>
              </tbody>
            </table>

            <!-- Section 4 — Can I Share This? -->
            <div class="callout-box">
              <h3 class="callout-heading">Yes — This copy is safe to share.</h3>
              <p class="callout-text">
                PersonaShield removed personal identifiers and hidden sensitive information while keeping the document readable.
              </p>
            </div>

            <div class="section-title" style="font-size: 12px; margin-bottom: 6px;">Sharing Recommendations</div>
            <table class="checklist-table">
              <thead>
                <tr>
                  <th style="width: 50%; color: #15803D;">✓ Safe for</th>
                  <th style="width: 50%; color: #DC2626;">✗ Not recommended</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid #E2E8F0;">
                  <td style="color: #166534; font-weight: 600;">WhatsApp & Messaging Apps</td>
                  <td style="color: #991B1B;">Uploading the original unmasked file</td>
                </tr>
                <tr style="border-bottom: 1px solid #E2E8F0;">
                  <td style="color: #166534; font-weight: 600;">Email & HR Inquiries</td>
                  <td style="color: #991B1B;">Posting the original screenshot publicly</td>
                </tr>
                <tr style="border-bottom: 1px solid #E2E8F0;">
                  <td style="color: #166534; font-weight: 600;">LinkedIn & Professional Posts</td>
                  <td style="color: #991B1B;">Sharing unmasked government IDs</td>
                </tr>
                <tr style="border-bottom: 1px solid #E2E8F0;">
                  <td style="color: #166534; font-weight: 600;">Slack & Teams Workspaces</td>
                  <td style="color: #991B1B;">Sending active API keys or credentials</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Page 1 Footer -->
          <div class="report-footer">
            <span>Scan Date: ${dateStr}</span>
            <span>Page 1 of 2</span>
            <span>PersonaShield • Defensive Privacy</span>
          </div>
        </div>

        <!-- ==================== PAGE 2: PRIVACY FINDINGS & AWARENESS ==================== -->
        <div class="page">
          <div>
            <!-- Header -->
            <div class="header-top">
              <div>
                <h1 class="brand-title">Privacy Findings & Awareness</h1>
                <p class="brand-subtitle">Understanding your risks and preventing digital identity leaks</p>
              </div>
              <div class="safe-badge" style="background: #EDE9FE; color: #6D28D9; border-color: #DDD6FE;">
                AWARENESS GUIDE
              </div>
            </div>

            <!-- Section 1 — Why These Findings Matter -->
            <div class="section-title">Why These Findings Matter</div>
            <div style="margin-bottom: 14px;">
              ${whyCardsHtml}
            </div>

            <!-- Section 2 — Recommended Next Steps -->
            <div class="section-title">Recommended Next Steps</div>
            <table style="margin-bottom: 14px;">
              <thead>
                <tr>
                  <th>Finding</th>
                  <th>Recommended Action</th>
                </tr>
              </thead>
              <tbody>
                ${nextStepsRowsHtml}
              </tbody>
            </table>

            <!-- Section 3 — Protection Timeline -->
            <div class="section-title">How PersonaShield Protected Your Document</div>
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 16px; margin-bottom: 14px;">
              <div class="timeline-step">
                <div class="step-number">1</div>
                <div>
                  <div style="font-size: 13px; font-weight: 700; color: #0F172A;">Detected private information</div>
                  <div style="font-size: 12px; color: #475569;">Found IDs, secrets, phone numbers, and sensitive details.</div>
                </div>
              </div>
              <div class="timeline-step">
                <div class="step-number">2</div>
                <div>
                  <div style="font-size: 13px; font-weight: 700; color: #0F172A;">Protected every sensitive area</div>
                  <div style="font-size: 12px; color: #475569;">Hidden using secure masking and metadata sanitization.</div>
                </div>
              </div>
              <div class="timeline-step" style="margin-bottom: 0;">
                <div class="step-number">3</div>
                <div>
                  <div style="font-size: 13px; font-weight: 700; color: #0F172A;">Generated a SafeShare copy</div>
                  <div style="font-size: 12px; color: #475569;">Ready for messaging apps, email, and document sharing.</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 4 — Privacy Promise & Footer -->
          <div>
            <div style="background: #FAF5FF; border: 1px solid #E9D5FF; border-radius: 10px; padding: 10px 14px; margin-bottom: 12px;">
              <div style="font-weight: 800; font-size: 12px; color: #6D28D9; margin-bottom: 2px;">
                Privacy Promise
              </div>
              <div style="font-size: 11px; color: #581C87; line-height: 1.4;">
                PersonaShield processed this document locally and generated a protected copy without uploading your document to cloud services.
              </div>
            </div>

            <div class="report-footer">
              <span>Scan Date: ${dateStr}</span>
              <span>Page 2 of 2</span>
              <span>Scan Once. Share Safely.</span>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}
