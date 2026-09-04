import { resources } from '../data/index.js';
import type { Resource } from '../types.js';

export interface ResourceSummary {
  id: string;
  title: string;
  filename: string;
  format: string;
  size: number;
  category: string;
  sourceUrl: string;
  downloadUrl: string;
}

const has = (value: string, needle: string): boolean =>
  needle.length === 0 || value.toLowerCase().includes(needle.toLowerCase()) === true;

const toSummary = (resource: Resource): ResourceSummary => ({
  id: resource.id,
  title: resource.title,
  filename: resource.filename,
  format: resource.format,
  size: resource.size,
  category: resource.category,
  sourceUrl: resource.sourceUrl,
  downloadUrl: resource.downloadUrl,
});

export function listResources(
  options: {
    category?: string | undefined;
    format?: string | undefined;
    query?: string | undefined;
  } = {},
): { count: number; total: number; resources: ResourceSummary[] } {
  const category = options.category?.trim() ?? '';
  const format = options.format?.trim() ?? '';
  const query = options.query?.trim() ?? '';
  const filtered = resources.filter(
    (resource) =>
      has(resource.category, category) &&
      has(resource.format, format) &&
      has(`${resource.title} ${resource.filename}`, query),
  );
  return { count: filtered.length, total: resources.length, resources: filtered.map(toSummary) };
}

export function getResource(id: string): Resource | undefined {
  return resources.find((resource) => resource.id === id);
}

export function resourceCategories(): string[] {
  return [...new Set(resources.map((resource) => resource.category))].sort();
}
