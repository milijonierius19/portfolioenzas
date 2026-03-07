import { NextResponse } from "next/server";
import { concludeInquiry } from "@/lib/server/inquiryAgent";
import {
  buildInquirySubmission,
  formatInquiryForTelegram,
  parseInquiryPayload
} from "@/lib/server/inquiry";
import { sendTelegramMessage } from "@/lib/server/telegram";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const payload = parseInquiryPayload(body);
  if (!payload) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing or invalid fields"
      },
      { status: 400 }
    );
  }

  const submission = buildInquirySubmission(payload);
  const conclusion = await concludeInquiry(submission);
  const telegramText = formatInquiryForTelegram(submission, conclusion);

  try {
    const telegramResult = await sendTelegramMessage(telegramText);

    if (!telegramResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "Failed to send Telegram message",
          reason: telegramResult.reason
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      id: submission.id,
      submittedAt: submission.submittedAt,
      aiConclusion: conclusion
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Unexpected server error"
      },
      { status: 500 }
    );
  }
}
