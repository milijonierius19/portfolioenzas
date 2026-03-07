export type ChapterWindowCTA = {
  label: string;
  href?: string;
  action?: "openDesignInquiry" | "open3DInquiry" | "openAIInquiry";
};

export type BreakpointSpan = {
  mobile?: number;
  tablet?: number;
  desktop?: number;
  wide?: number;
};

export type ChapterWindow = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  ctas: ChapterWindowCTA[];
  // Grid spans per breakpoint (12-column grid) keep layout deterministic across browsers.
  span?: BreakpointSpan;
  compact?: boolean;
  logoSrc?: string;
  logoAlt?: string;
  logoHeightPx?: number;
  logoHref?: string;
  logoWhite?: boolean;
  videoSrc?: string;
  videoPoster?: string;
  ctaOnly?: boolean;
};

export type Chapter = {
  id: string;
  label: string;
  stopTimeSec: number;
  windows: ChapterWindow[];
};

export const VIDEO_END_SEC = 28.333;

export const chapters: Chapter[] = [
  {
    id: "intro",
    label: "Intro",
    stopTimeSec: 4,
    windows: []
  },
  {
    id: "design",
    label: "Design",
    stopTimeSec: 15.633,
    windows: [
      {
        id: "design-main-story",
        eyebrow: "DESIGN STORY",
        title: "Design since 2024",
        body: "30+ design projects shipped across digital and brand work.\n100+ AI-assisted marketing visuals created for campaigns and products.",
        ctas: [
          { label: "Inquire Design", action: "openDesignInquiry" },
          { label: "View Projects", href: "/projects/design" }
        ],
        span: { mobile: 12, tablet: 12, desktop: 7, wide: 7 }
      },
      {
        id: "design-what",
        eyebrow: "DESIGN WORK",
        title: "What I Design",
        body: "• Clothing graphics & apparel\n• Packaging & label design\n• Web & digital UI\n• Advertising & campaign visuals\n• Brand identity systems",
        ctas: [],
        compact: true,
        span: { mobile: 12, tablet: 6, desktop: 5, wide: 3 }
      },
      {
        id: "design-how",
        eyebrow: "SIDE PROJECT",
        title: "SLKWEAR.COM",
        body: "Streetwear clothing brand with a national theme.",
        ctas: [],
        compact: true,
        logoSrc: "/elements/slk-white.png",
        logoAlt: "SLKWear logo",
        logoHeightPx: 64,
        logoHref: "https://slkwear.com",
        span: { mobile: 12, tablet: 6, desktop: 4, wide: 2 }
      },
      {
        id: "design-carousel",
        eyebrow: "",
        title: "",
        body: "",
        ctas: [],
        compact: true,
        ctaOnly: true,
        span: { mobile: 12, tablet: 12, desktop: 8, wide: 6 }
      }
    ]
  },
  {
    id: "development",
    label: "3D Works",
    stopTimeSec: 21.733,
    windows: [
      {
        id: "dev-3d-practice-main",
        eyebrow: "3D PRACTICE",
        title: "3D Mockups & Motion",
        body: "I build and modify concepts directly in 3D environments from product mockups to simple animations and scene tests.\nIt lets you see how something can look and move before it exists in the real world, so direction is clearer before production starts.",
        ctas: [
          { label: "Inquire 3D", action: "open3DInquiry" },
          { label: "View Projects", href: "/projects/3d" }
        ],
        logoSrc: "/elements/blender-1.svg",
        logoAlt: "Blender icon",
        logoHeightPx: 56,
        logoWhite: true,
        span: { mobile: 12, tablet: 12, desktop: 7, wide: 6 }
      },
      {
        id: "dev-3d-story",
        eyebrow: "THIS SITE",
        title: "Built Inside a 3D Story",
        body: "The root of this website is 3D work: the full scroll journey is a custom 3D environment made to represent my skills as visuals.",
        ctas: [],
        span: { mobile: 12, tablet: 6, desktop: 5, wide: 3 }
      },
      {
        id: "dev-3d-stat",
        eyebrow: "",
        title: "",
        body: "",
        ctas: [],
        compact: true,
        span: { mobile: 12, tablet: 6, desktop: 3, wide: 2 }
      },
      {
        id: "dev-3d-video-example",
        eyebrow: "3D PREVIEW",
        title: "ONE OF THE WORK EXAMPLES",
        body: "",
        ctas: [],
        videoSrc: "/story.mp4",
        compact: true,
        span: { mobile: 12, tablet: 6, desktop: 4, wide: 3 }
      }
    ]
  },
  {
    id: "ai",
    label: "AI",
    stopTimeSec: 26.633,
    windows: [
      {
        id: "ai-hero",
        eyebrow: "AI SOLUTIONS",
        title: "AI Systems for Brands",
        body: "I build AI-assisted pipelines for content, visuals, and campaign iteration.\nFaster testing, clearer direction, less production drag.",
        ctas: [
          { label: "View Projects", href: "/projects/ai" },
          { label: "Inquire AI", action: "openAIInquiry" }
        ],
        span: { mobile: 12, tablet: 12, desktop: 7, wide: 6 }
      },
      {
        id: "ai-what-i-do",
        eyebrow: "WHAT I BUILD",
        title: "Systems, not toys.",
        body: "• AI sales agents that qualify & book leads\n• Content engines: idea -> script -> post\n• Workflow automation across your stack\n• Internal copilots trained on your knowledge",
        ctas: [],
        compact: true,
        span: { mobile: 12, tablet: 6, desktop: 5, wide: 3 }
      },
      {
        id: "ai-example",
        eyebrow: "ONE SIMPLE WORKFLOW",
        title: "Inbox Autopilot",
        body: "1) Email arrives -> AI classifies (basic / important / sales)\n2) Basic -> drafts reply in your tone + tags + archives\n3) Important -> suggests times, books via calendar, logs to CRM\n\nWorks with Gmail/Outlook + Google Calendar. Human approval optional.",
        ctas: [],
        compact: true,
        videoSrc: "/story.mp4",
        videoPoster: "/carousel/4.png",
        span: { mobile: 12, tablet: 6, desktop: 5, wide: 3 }
      }
    ]
  },
  {
    id: "contact",
    label: "Contact",
    stopTimeSec: VIDEO_END_SEC,
    windows: [
      {
        id: "contact-main",
        eyebrow: "Contact",
        title: "Let's Build Something",
        body: "",
        ctas: [
          { label: "Inquire Design", action: "openDesignInquiry" },
          { label: "Inquire 3D", action: "open3DInquiry" },
          { label: "Inquire AI", action: "openAIInquiry" },
          { label: "Instagram", href: "https://instagram.com" },
          { label: "Facebook", href: "https://facebook.com" },
          { label: "Email", href: "mailto:you@company.com" },
          { label: "LinkedIn", href: "https://linkedin.com" }
        ],
        span: { mobile: 12, tablet: 12, desktop: 10, wide: 8 }
      }
    ]
  }
];
