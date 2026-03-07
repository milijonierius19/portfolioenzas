"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { minecardLCD } from "@/lib/fonts";
import type { ChapterWindow, ChapterWindowCTA } from "@/lib/chapters";

type GlassWindowProps = {
  windowData: ChapterWindow;
  sectionId: string;
  reducedMotion: boolean;
  className?: string;
};

type InquiryFormState = {
  inquiry: string;
  timeline: string;
  email: string;
};

type CarouselImage = {
  src: string;
  alt: string;
};

const FALLBACK_CAROUSEL_IMAGES: CarouselImage[] = [
  { src: "/carousel/2.png", alt: "SLK carousel image 1" },
  { src: "/carousel/4.png", alt: "SLK carousel image 2" },
  { src: "/carousel/5.png", alt: "SLK carousel image 3" }
];

const CAROUSEL_ROTATE_MS = 5000;

function isProjectsHref(href?: string) {
  return Boolean(href && href.startsWith("/projects"));
}

function cardCx(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(" ");
}

export default function GlassWindow({ windowData, sectionId, reducedMotion, className }: GlassWindowProps) {
  const [activeInquiryType, setActiveInquiryType] = useState<"design" | "3d" | "ai">("design");
  const [isInquiryOpen, setIsInquiryOpen] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [serverError, setServerError] = useState<string>("");
  const [carouselMainIndex, setCarouselMainIndex] = useState(0);
  const [carouselImages, setCarouselImages] = useState<CarouselImage[]>(FALLBACK_CAROUSEL_IMAGES);
  const [formState, setFormState] = useState<InquiryFormState>({
    inquiry: "",
    timeline: "",
    email: ""
  });

  const isDesignCarouselWindow = windowData.id === "design-carousel";
  const isVideoPreviewWindow = Boolean(windowData.videoSrc);
  const isContactMainWindow = windowData.id === "contact-main";

  useEffect(() => {
    if (!isDesignCarouselWindow || reducedMotion) {
      return;
    }

    const timer = window.setInterval(() => {
      setCarouselMainIndex((prev) => (prev + 1) % Math.max(carouselImages.length, 1));
    }, CAROUSEL_ROTATE_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [carouselImages.length, isDesignCarouselWindow, reducedMotion]);

  useEffect(() => {
    if (!isDesignCarouselWindow) {
      return;
    }

    let cancelled = false;

    const loadRandomDesignWorks = async () => {
      try {
        const response = await fetch("/api/design-carousel", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { images?: CarouselImage[] };
        const images = Array.isArray(payload.images) ? payload.images.filter((item) => Boolean(item?.src)) : [];
        if (!cancelled && images.length) {
          setCarouselImages(images);
          setCarouselMainIndex(0);
        }
      } catch {
        // Keep fallback images if random feed fails.
      }
    };

    loadRandomDesignWorks();

    return () => {
      cancelled = true;
    };
  }, [isDesignCarouselWindow]);

  useEffect(() => {
    if (!isInquiryOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previousInquiryFlag = document.body.dataset.inquiryOpen;
    document.body.style.overflow = "hidden";
    document.body.dataset.inquiryOpen = "true";

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsInquiryOpen(false);
      }
    };

    window.addEventListener("keydown", onEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousInquiryFlag) {
        document.body.dataset.inquiryOpen = previousInquiryFlag;
      } else {
        delete document.body.dataset.inquiryOpen;
      }
      window.removeEventListener("keydown", onEscape);
    };
  }, [isInquiryOpen]);

  const inquiryTitle =
    activeInquiryType === "3d" ? "3D Inquiry" : activeInquiryType === "ai" ? "AI Inquiry" : "Design Inquiry";

  const inquiryPrompt =
    activeInquiryType === "3d"
      ? "Tell me what you need in 3D"
      : activeInquiryType === "ai"
        ? "Tell me what you need in AI"
        : "Tell me what you need";

  const inquiryPlaceholder =
    activeInquiryType === "3d"
      ? "What do you want modeled, animated, or visualized?"
      : activeInquiryType === "ai"
        ? "What AI system, assistant, or automation do you want built?"
        : "What do you want designed?";

  const handleInquirySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const inquiry = formState.inquiry.trim();
    const timeline = formState.timeline.trim();
    const email = formState.email.trim();

    if (!inquiry || !timeline || !email) {
      setSubmitState("error");
      setServerError("Please fill all fields.");
      return;
    }

    setSubmitState("submitting");
    setServerError("");

    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          kind: activeInquiryType,
          name: "Website inquiry",
          company: "",
          details: inquiry,
          timeline,
          budget: "Not provided",
          email
        })
      });

      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        setSubmitState("error");
        setServerError(payload.error ?? "Could not send inquiry.");
        return;
      }

      setSubmitState("success");
      setFormState({ inquiry: "", timeline: "", email: "" });
    } catch {
      setSubmitState("error");
      setServerError("Network/server error while sending inquiry.");
    }
  };

  const renderCta = (cta: ChapterWindowCTA) => {
    const key = `${windowData.id}-${cta.href ?? cta.action ?? cta.label}`;
    const isContactSocial = isContactMainWindow && ["Instagram", "Facebook", "LinkedIn", "Email"].includes(cta.label);
    const baseClass = `${minecardLCD.className} rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs tracking-wide text-white transition-colors duration-200 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60`;
    const socialClass = isContactSocial
      ? cta.label === "Instagram"
        ? "text-fuchsia-300"
        : cta.label === "Facebook"
          ? "text-blue-300"
          : cta.label === "LinkedIn"
            ? "text-blue-400"
            : "text-yellow-300"
      : isContactMainWindow
        ? "text-[#ff8e43]"
        : "";

    if (cta.action) {
      return (
        <button
          key={key}
          type="button"
          className={cardCx(baseClass, socialClass)}
          onClick={() => {
            setSubmitState("idle");
            setServerError("");
            setActiveInquiryType(cta.action === "open3DInquiry" ? "3d" : cta.action === "openAIInquiry" ? "ai" : "design");
            setIsInquiryOpen(true);
          }}
        >
          {cta.label}
        </button>
      );
    }

    if (!cta.href) {
      return null;
    }

    let resolvedHref = cta.href;
    if (isProjectsHref(cta.href)) {
      const [path, query = ""] = cta.href.split("?");
      const params = new URLSearchParams(query);
      params.set("from", sectionId);
      resolvedHref = `${path}?${params.toString()}`;
    }

    return (
      <Link key={key} href={resolvedHref} className={cardCx(baseClass, socialClass)}>
        {cta.label}
      </Link>
    );
  };

  const carouselContent = useMemo(() => {
    const total = carouselImages.length;
    if (!total) {
      return null;
    }

    const getRole = (index: number) => {
      const delta = (index - carouselMainIndex + total) % total;
      if (delta === 0) return "center";
      if (delta === 1) return "right";
      return "left";
    };

    return (
      <div className="story-carousel" role="region" aria-label="Design work carousel">
        {[((carouselMainIndex - 1 + total) % total), carouselMainIndex, ((carouselMainIndex + 1) % total)].map((index) => {
          const image = carouselImages[index];
          const role = getRole(index);
          const isMain = role === "center";
          return (
            <button
              key={`${image.src}-${index}`}
              type="button"
              className={cardCx("story-carousel__item", isMain ? "is-main" : "")}
              style={{
                transform:
                  role === "center"
                    ? "translate(-50%, -50%) translateX(0) scale(1)"
                    : role === "left"
                      ? "translate(-50%, -50%) translateX(-38%) scale(0.72)"
                      : "translate(-50%, -50%) translateX(38%) scale(0.72)",
                zIndex: isMain ? 3 : 2,
                opacity: isMain ? 1 : 0.85
              }}
              onClick={() => setCarouselMainIndex(index)}
              aria-label={isMain ? "Current main image" : "Set as main image"}
              aria-current={isMain ? "true" : undefined}
            >
              <span className="carousel-frame">
                <Image
                  src={image.src}
                  alt={image.alt}
                  width={1920}
                  height={1200}
                  sizes="(max-width: 1024px) 88vw, 50vw"
                  className="carousel-image"
                />
              </span>
            </button>
          );
        })}
      </div>
    );
  }, [carouselImages, carouselMainIndex]);

  return (
    <>
      <article
        data-window-id={windowData.id}
        className={cardCx(
          "scene-glass-window h-full w-full min-w-0 rounded-2xl border border-white/20 bg-white/10 text-white shadow-[0_18px_42px_rgba(0,0,0,0.32)] backdrop-blur-[14px] backdrop-saturate-150",
          isDesignCarouselWindow ? "p-0" : windowData.compact ? "p-3" : "p-4 sm:p-5",
          isVideoPreviewWindow ? "overflow-hidden" : "",
          className
        )}
      >
        {isDesignCarouselWindow ? (
          carouselContent
        ) : windowData.ctaOnly ? (
          <div className="flex flex-wrap gap-2">{windowData.ctas.map((cta) => renderCta(cta))}</div>
        ) : (
          <>
            <p className={`${minecardLCD.className} text-[11px] uppercase tracking-[0.22em] text-[#ff8e43]`}>{windowData.eyebrow}</p>
            {windowData.logoSrc ? (
              <div className="mt-2 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className={`${minecardLCD.className} text-xl leading-tight`}>{windowData.title}</h2>
                  <p className="story-card-text mt-2 whitespace-pre-line text-sm leading-relaxed text-white/85">{windowData.body}</p>
                </div>
                {windowData.logoHref ? (
                  <a href={windowData.logoHref} target="_blank" rel="noreferrer" className="shrink-0 overflow-visible">
                    <Image
                      src={windowData.logoSrc}
                      alt={windowData.logoAlt ?? ""}
                      width={160}
                      height={windowData.logoHeightPx ?? 64}
                      className={cardCx("block h-auto w-auto max-w-none object-contain", windowData.logoWhite ? "brightness-0 invert" : "")}
                      style={{ height: `${windowData.logoHeightPx ?? 64}px` }}
                    />
                  </a>
                ) : (
                  <div className="shrink-0 overflow-visible">
                    <Image
                      src={windowData.logoSrc}
                      alt={windowData.logoAlt ?? ""}
                      width={160}
                      height={windowData.logoHeightPx ?? 64}
                      className={cardCx("block h-auto w-auto max-w-none object-contain", windowData.logoWhite ? "brightness-0 invert" : "")}
                      style={{ height: `${windowData.logoHeightPx ?? 64}px` }}
                    />
                  </div>
                )}
              </div>
            ) : windowData.videoSrc ? (
              <div className="mt-2 min-w-0">
                <h2 className={`${minecardLCD.className} text-center text-sm tracking-[0.08em]`}>{windowData.title}</h2>
                <video
                  className="mt-3 w-full rounded-xl border border-white/20 bg-black/35 object-cover"
                  src={windowData.videoSrc}
                  poster={windowData.videoPoster}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                />
                {windowData.body ? (
                  <p className="story-card-text mt-3 whitespace-pre-line text-xs leading-relaxed text-white/85">{windowData.body}</p>
                ) : null}
              </div>
            ) : (
              <>
                <h2 className={`${minecardLCD.className} mt-2 text-xl leading-tight ${isContactMainWindow ? "text-center text-[#ff8e43]" : ""}`}>
                  {windowData.title}
                </h2>
                <p
                  className={`story-card-text mt-2 min-w-0 whitespace-pre-line text-sm leading-relaxed text-white/85 ${
                    isContactMainWindow ? "text-center" : ""
                  }`}
                >
                  {windowData.body}
                </p>
              </>
            )}

            {windowData.ctas.length > 0 ? (
              isContactMainWindow ? (
                <div className="mt-4 space-y-2.5">
                  <div className="flex flex-wrap justify-center gap-2">
                    {windowData.ctas
                      .filter((cta) => !["Instagram", "Facebook", "LinkedIn", "Email"].includes(cta.label))
                      .map((cta) => renderCta(cta))}
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {windowData.ctas
                      .filter((cta) => ["Instagram", "Facebook", "LinkedIn", "Email"].includes(cta.label))
                      .map((cta) => renderCta(cta))}
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">{windowData.ctas.map((cta) => renderCta(cta))}</div>
              )
            ) : null}
          </>
        )}
      </article>

      {isInquiryOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={inquiryTitle}
          onClick={(event) => {
            if (event.currentTarget === event.target) {
              setIsInquiryOpen(false);
            }
          }}
        >
          <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-md" />
          <div className="relative w-full max-w-2xl rounded-3xl border border-white/35 bg-white/12 p-5 text-white shadow-[0_26px_70px_rgba(0,0,0,0.35)] backdrop-blur-2xl backdrop-saturate-150 sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`${minecardLCD.className} text-[11px] uppercase tracking-[0.22em] text-[#ff8e43]`}>{inquiryTitle}</p>
                <h2 className={`${minecardLCD.className} mt-2 text-2xl`}>{inquiryPrompt}</h2>
              </div>
              <button
                type="button"
                className="rounded-full border border-white/35 bg-white/10 px-3 py-1 text-xs tracking-wide text-white transition-colors hover:bg-white/20"
                onClick={() => setIsInquiryOpen(false)}
              >
                Close
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleInquirySubmit}>
              <label className="block text-sm">
                <span className="mb-1.5 block text-white/90">Inquiry details</span>
                <textarea
                  required
                  rows={5}
                  placeholder={inquiryPlaceholder}
                  value={formState.inquiry}
                  onChange={(event) => {
                    setSubmitState("idle");
                    setServerError("");
                    setFormState((prev) => ({ ...prev, inquiry: event.target.value }));
                  }}
                  className="w-full rounded-2xl border border-white/25 bg-black/20 px-3 py-2.5 text-sm text-white placeholder-white/60 outline-none backdrop-blur-md focus:border-white/45"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1.5 block text-white/90">How soon do you need it?</span>
                <input
                  required
                  type="text"
                  placeholder="Example: 1 week, 2 days, ASAP"
                  value={formState.timeline}
                  onChange={(event) => {
                    setSubmitState("idle");
                    setServerError("");
                    setFormState((prev) => ({ ...prev, timeline: event.target.value }));
                  }}
                  className="w-full rounded-2xl border border-white/25 bg-black/20 px-3 py-2.5 text-sm text-white placeholder-white/60 outline-none backdrop-blur-md focus:border-white/45"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1.5 block text-white/90">Contact email</span>
                <input
                  required
                  type="email"
                  placeholder="you@company.com"
                  value={formState.email}
                  onChange={(event) => {
                    setSubmitState("idle");
                    setServerError("");
                    setFormState((prev) => ({ ...prev, email: event.target.value }));
                  }}
                  className="w-full rounded-2xl border border-white/25 bg-black/20 px-3 py-2.5 text-sm text-white placeholder-white/60 outline-none backdrop-blur-md focus:border-white/45"
                />
              </label>

              {submitState === "success" ? <p className="text-sm text-emerald-200">We will respond to your contact email ASAP.</p> : null}
              {submitState === "error" ? (
                <p className="text-sm text-rose-200">{serverError || "Could not send inquiry. Check fields and try again."}</p>
              ) : null}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="submit"
                  disabled={submitState === "submitting"}
                  className={`${minecardLCD.className} rounded-full border border-white/35 bg-white/15 px-4 py-2 text-xs tracking-wide text-white transition-colors hover:bg-white/25`}
                >
                  {submitState === "submitting" ? "Sending..." : "Send Inquiry"}
                </button>
                <button
                  type="button"
                  className={`${minecardLCD.className} rounded-full border border-white/30 bg-black/20 px-4 py-2 text-xs tracking-wide text-white transition-colors hover:bg-black/35`}
                  onClick={() => setIsInquiryOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
