export type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  imageUrl: string | null;
  sortOrder: number;
};

export type ResolvedCategory = {
  category: CategoryRecord;
  ancestors: CategoryRecord[];
  children: CategoryRecord[];
  peers: CategoryRecord[];
  scopeIds: string[];
};

export function categoryHref(nodes: { slug: string }[]): string {
  return `/c/${nodes.map((node) => node.slug).join("/")}`;
}

export function categoryBySlug(all: CategoryRecord[], slug: string): CategoryRecord | undefined {
  return all.find((category) => category.slug === slug);
}

export function categoryChain(all: CategoryRecord[], id: string): CategoryRecord[] | null {
  const byId = new Map(all.map((category) => [category.id, category]));
  const chain: CategoryRecord[] = [];
  const seen = new Set<string>();
  let current = byId.get(id);

  while (current) {
    if (seen.has(current.id)) return null;
    seen.add(current.id);
    chain.push(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  return chain.reverse();
}

function byShelf(left: CategoryRecord, right: CategoryRecord): number {
  if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
  return left.name.localeCompare(right.name);
}

function descendants(all: CategoryRecord[], rootId: string): string[] {
  const ids = [rootId];
  const pending = [rootId];
  while (pending.length > 0) {
    const parentId = pending.pop();
    if (!parentId) continue;
    for (const category of all) {
      if (category.parentId !== parentId) continue;
      ids.push(category.id);
      pending.push(category.id);
    }
  }
  return ids;
}

export function topCategories(all: CategoryRecord[], limit: number): CategoryRecord[] {
  return all
    .filter((category) => category.parentId === null)
    .sort(byShelf)
    .slice(0, limit);
}

export function resolveCategoryPath(
  all: CategoryRecord[],
  slug: string[],
): ResolvedCategory | null {
  if (slug.length === 0) return null;

  const ancestors: CategoryRecord[] = [];
  let parentId: string | null = null;
  let current: CategoryRecord | null = null;

  for (const part of slug) {
    const match =
      all.find((category) => category.slug === part && category.parentId === parentId) ?? null;
    if (!match) return null;
    if (current) ancestors.push(current);
    current = match;
    parentId = match.id;
  }

  if (!current) return null;

  const children = all.filter((category) => category.parentId === current.id).sort(byShelf);
  const peers = all.filter((category) => category.parentId === current.parentId).sort(byShelf);

  return {
    category: current,
    ancestors,
    children,
    peers,
    scopeIds: descendants(all, current.id),
  };
}
