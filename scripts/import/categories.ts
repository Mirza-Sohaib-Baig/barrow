export type Subcategory = {
  name: string;
  slug: string;
  keywords: readonly string[];
};

export type ImportCategory = {
  dataset: string;
  name: string;
  slug: string;
  subcategories: readonly Subcategory[];
};

export const importCategories: readonly ImportCategory[] = [
  {
    dataset: "All_Beauty",
    name: "Beauty",
    slug: "beauty",
    subcategories: [
      {
        name: "Skincare",
        slug: "skincare",
        keywords: ["skin", "face", "serum", "moistur", "cleanser", "sunscreen", "lotion", "cream", "toner"],
      },
      {
        name: "Haircare",
        slug: "haircare",
        keywords: ["hair", "shampoo", "conditioner", "scalp"],
      },
      {
        name: "Fragrance",
        slug: "fragrance",
        keywords: ["perfume", "fragrance", "cologne", "parfum", "scent", "eau de"],
      },
    ],
  },
  {
    dataset: "Handmade_Products",
    name: "Handmade",
    slug: "handmade",
    subcategories: [
      {
        name: "Jewellery",
        slug: "jewellery",
        keywords: ["jewel", "necklace", "earring", "bracelet", "pendant", "ring"],
      },
      {
        name: "Home",
        slug: "home",
        keywords: ["home", "decor", "candle", "vase", "cushion", "kitchen", "wall"],
      },
      {
        name: "Gifts",
        slug: "gifts",
        keywords: ["gift", "present", "occasion"],
      },
    ],
  },
  {
    dataset: "Musical_Instruments",
    name: "Music",
    slug: "music",
    subcategories: [
      {
        name: "Guitars",
        slug: "guitars",
        keywords: ["guitar", "ukulele"],
      },
      {
        name: "Keys",
        slug: "keys",
        keywords: ["piano", "keyboard", "synth", "organ"],
      },
      {
        name: "Studio",
        slug: "studio",
        keywords: ["microphone", "studio", "mixer", "headphone", "audio interface"],
      },
    ],
  },
  {
    dataset: "Gift_Cards",
    name: "Gift cards",
    slug: "gift-cards",
    subcategories: [
      {
        name: "Experiences",
        slug: "experiences",
        keywords: ["experience", "spa", "dining", "travel", "adventure"],
      },
      {
        name: "Retail",
        slug: "retail",
        keywords: ["retail", "store", "shop"],
      },
      {
        name: "Occasions",
        slug: "occasions",
        keywords: ["birthday", "wedding", "christmas", "holiday"],
      },
    ],
  },
];

export function childSlug(category: ImportCategory, subcategory: Subcategory): string {
  return `${category.slug}-${subcategory.slug}`;
}
