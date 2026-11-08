import { describe, expect, it } from "vitest";
import {
  categoryChain,
  categoryHref,
  resolveCategoryPath,
  topCategories,
  type CategoryRecord,
} from "@/lib/categories";

const shop: CategoryRecord[] = [
  { id: "home", name: "Home", slug: "home", parentId: null, imageUrl: null, sortOrder: 0 },
  { id: "kitchen", name: "Kitchen", slug: "kitchen", parentId: null, imageUrl: null, sortOrder: 1 },
  { id: "bedding", name: "Bedding", slug: "bedding", parentId: "home", imageUrl: null, sortOrder: 0 },
  { id: "pillows", name: "Pillows", slug: "pillows", parentId: "bedding", imageUrl: null, sortOrder: 0 },
  { id: "linen", name: "Linen", slug: "linen", parentId: "home", imageUrl: null, sortOrder: 1 },
];

describe("resolveCategoryPath", () => {
  it("resolves a top-level department and its descendants", () => {
    const resolved = resolveCategoryPath(shop, ["home"]);
    expect(resolved?.category.slug).toBe("home");
    expect(resolved?.children.map((category) => category.slug)).toEqual(["bedding", "linen"]);
    expect(resolved?.scopeIds.sort()).toEqual(["bedding", "home", "linen", "pillows"]);
    expect(categoryHref(resolved ? [resolved.category] : [])).toBe("/c/home");
  });

  it("resolves a nested path and rejects a child used as a root", () => {
    const resolved = resolveCategoryPath(shop, ["home", "bedding"]);
    expect(resolved?.ancestors.map((category) => category.slug)).toEqual(["home"]);
    expect(resolved?.children.map((category) => category.slug)).toEqual(["pillows"]);
    expect(resolved?.peers.map((category) => category.slug)).toEqual(["bedding", "linen"]);
    expect(resolved).not.toBeNull();
    if (!resolved) return;
    expect(categoryHref([...resolved.ancestors, resolved.category])).toBe("/c/home/bedding");
    expect(resolveCategoryPath(shop, ["bedding"])).toBeNull();
    expect(categoryChain(shop, "pillows")?.map((category) => category.slug)).toEqual([
      "home",
      "bedding",
      "pillows",
    ]);
  });

  it("keeps the configured shelf order for the home tiles", () => {
    expect(topCategories(shop, 8).map((category) => category.slug)).toEqual(["home", "kitchen"]);
  });
});
