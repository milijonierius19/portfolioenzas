export type DesignCategory = {
  slug: string;
  folder: string;
  previewImage: string;
  alt: string;
};

export const DESIGN_CATEGORIES: DesignCategory[] = [
  { slug: "social-posts", folder: "social_posts", previewImage: "/d_el/social%20posts.png", alt: "Social posts design preview" },
  { slug: "posters", folder: "posters", previewImage: "/d_el/posters.png", alt: "Poster design preview" },
  { slug: "ai-marketing-posts", folder: "ai_marketing_posts", previewImage: "/d_el/ai%20marketing.png", alt: "AI marketing design preview" },
  { slug: "clothing-design", folder: "clothing_design", previewImage: "/d_el/clothing%20design.png", alt: "Clothing design preview" },
  { slug: "web-design", folder: "web_design", previewImage: "/d_el/webdsgn.png", alt: "Web design preview" },
  { slug: "packaging-design", folder: "packaging_design", previewImage: "/d_el/pack%20design.png", alt: "Packaging design preview" }
];

export const DESIGN_CATEGORY_BY_SLUG = Object.fromEntries(DESIGN_CATEGORIES.map((category) => [category.slug, category])) as Record<
  string,
  DesignCategory
>;
