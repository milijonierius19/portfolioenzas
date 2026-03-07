export type ThreeDCategory = {
  slug: string;
  folder: string;
  previewImage: string;
  alt: string;
};

export const THREE_D_CATEGORIES: ThreeDCategory[] = [
  { slug: "animations", folder: "animations", previewImage: "/d_el/animations.png", alt: "3D animations preview" },
  { slug: "objects", folder: "objects", previewImage: "/d_el/objects.png", alt: "3D objects preview" }
];

export const THREE_D_CATEGORY_BY_SLUG = Object.fromEntries(
  THREE_D_CATEGORIES.map((category) => [category.slug, category])
) as Record<string, ThreeDCategory>;
