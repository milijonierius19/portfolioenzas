export type InquiryKind = "design" | "3d" | "ai";

export type InquiryPayload = {
  kind: InquiryKind;
  name: string;
  email: string;
  timeline: string;
  budget: string;
  details: string;
  company?: string;
};

export type InquiryAgentConclusion = {
  summary: string;
  priority: "low" | "medium" | "high";
  nextStep: string;
};

export type InquirySubmission = InquiryPayload & {
  id: string;
  submittedAt: string;
};

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function clamp(value: string, max: number) {
  return value.length > max ? value.slice(0, max) : value;
}

export function parseInquiryPayload(body: unknown): InquiryPayload | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const input = body as Record<string, unknown>;
  const rawKind = normalizeString(input.kind).toLowerCase();
  const kind = rawKind === "design" || rawKind === "3d" || rawKind === "ai" ? rawKind : null;
  const name = clamp(normalizeString(input.name), 120);
  const email = clamp(normalizeString(input.email), 160);
  const timeline = clamp(normalizeString(input.timeline), 120);
  const budget = clamp(normalizeString(input.budget), 120);
  const details = clamp(normalizeString(input.details), 3000);
  const company = clamp(normalizeString(input.company), 120);

  if (!kind || !name || !email || !timeline || !budget || !details) {
    return null;
  }

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!isEmailValid) {
    return null;
  }

  return {
    kind,
    name,
    email,
    timeline,
    budget,
    details,
    company: company || undefined
  };
}

export function buildInquirySubmission(payload: InquiryPayload): InquirySubmission {
  return {
    ...payload,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    submittedAt: new Date().toISOString()
  };
}

function labelKind(kind: InquiryKind) {
  if (kind === "3d") return "3D";
  if (kind === "ai") return "AI";
  return "Design";
}

export function formatInquiryForTelegram(
  submission: InquirySubmission,
  conclusion?: InquiryAgentConclusion
): string {
  const detailsOneLine = submission.details.replace(/\s+/g, " ").trim();
  const compactDetails = detailsOneLine.length > 600 ? `${detailsOneLine.slice(0, 597)}...` : detailsOneLine;

  const lines = [
    "New Inquiry",
    `Type: ${labelKind(submission.kind)}`,
    `Need: ${compactDetails}`,
    `When: ${submission.timeline}`,
    `Budget: ${submission.budget}`,
    `Name: ${submission.name}`,
    `Email: ${submission.email}`,
    `Company: ${submission.company ?? "-"}`,
    `At: ${submission.submittedAt}`
  ];

  if (conclusion) {
    lines.push(`AI Summary: ${conclusion.summary}`);
    lines.push(`AI Priority: ${conclusion.priority.toUpperCase()}`);
    lines.push(`AI Next: ${conclusion.nextStep}`);
  }

  const message = lines.join("\n");
  return message.length > 3900 ? `${message.slice(0, 3897)}...` : message;
}
