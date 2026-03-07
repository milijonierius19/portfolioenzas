import type { InquiryAgentConclusion, InquirySubmission } from "@/lib/server/inquiry";

const DEFAULT_MODEL = process.env.OPENAI_INQUIRY_MODEL || "gpt-4o-mini";

function fallbackConclusion(inquiry: InquirySubmission): InquiryAgentConclusion {
  const short = inquiry.details.replace(/\s+/g, " ").trim();
  const summary = short.length > 180 ? `${short.slice(0, 177)}...` : short;

  return {
    summary,
    priority: inquiry.timeline.toLowerCase().includes("asap") ? "high" : "medium",
    nextStep: `Reply to ${inquiry.email} with a quick scope and first call options.`
  };
}

function safeParseJson<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function normalizePriority(value: unknown): InquiryAgentConclusion["priority"] {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }
  return "medium";
}

export async function concludeInquiry(inquiry: InquirySubmission): Promise<InquiryAgentConclusion> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallbackConclusion(inquiry);
  }

  const prompt = [
    "You are a project inquiry triage assistant.",
    "Return strict JSON only with keys: summary, priority, nextStep.",
    "summary max 180 chars, priority one of low|medium|high, nextStep max 120 chars.",
    "",
    `Inquiry type: ${inquiry.kind}`,
    `Client: ${inquiry.name}`,
    `Email: ${inquiry.email}`,
    `Company: ${inquiry.company ?? "-"}`,
    `Timeline: ${inquiry.timeline}`,
    `Budget: ${inquiry.budget}`,
    `Details: ${inquiry.details}`
  ].join("\n");

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You summarize inbound freelance inquiries for quick routing."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      return fallbackConclusion(inquiry);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return fallbackConclusion(inquiry);
    }

    const parsed = safeParseJson<Record<string, unknown>>(content);
    if (!parsed) {
      return fallbackConclusion(inquiry);
    }

    const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    const nextStep = typeof parsed.nextStep === "string" ? parsed.nextStep.trim() : "";

    if (!summary || !nextStep) {
      return fallbackConclusion(inquiry);
    }

    return {
      summary: summary.length > 180 ? `${summary.slice(0, 177)}...` : summary,
      priority: normalizePriority(parsed.priority),
      nextStep: nextStep.length > 120 ? `${nextStep.slice(0, 117)}...` : nextStep
    };
  } catch {
    return fallbackConclusion(inquiry);
  }
}
