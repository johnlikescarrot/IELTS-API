import { Request, Response, NextFunction } from 'express';
import resourcesData from '../data/resources.json';
import { ResourceItem } from '../types';
import { paginateArray } from '../utils/pagination';
import { AppError } from '../middlewares/errorHandler';

const allResources: ResourceItem[] = resourcesData as ResourceItem[];

export function getResources(req: Request, res: Response, next: NextFunction): void {
  try {
    const { skill, category, format, search, page, limit } = req.query;

    let filtered = [...allResources];

    if (skill && typeof skill === 'string') {
      const sk = skill.trim().toLowerCase();
      filtered = filtered.filter((r) => r.skill.toLowerCase().includes(sk));
    }

    if (category && typeof category === 'string') {
      const cat = category.trim().toLowerCase();
      filtered = filtered.filter((r) => r.category.toLowerCase().includes(cat));
    }

    if (format && typeof format === 'string') {
      const fmt = format.trim().toUpperCase();
      filtered = filtered.filter((r) => r.format.toUpperCase() === fmt);
    }

    if (search && typeof search === 'string') {
      const s = search.trim().toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(s) ||
          r.author.toLowerCase().includes(s) ||
          r.description.toLowerCase().includes(s)
      );
    }

    const paginated = paginateArray(filtered, page as string, limit as string);

    res.json({
      success: true,
      data: paginated.data,
      meta: paginated.meta
    });
  } catch (error) {
    next(error);
  }
}

export function getResourceById(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = String(req.params.id);
    const resource = allResources.find((r) => r.id === id);

    if (!resource) {
      throw new AppError(`Resource with ID '${id}' was not found.`, 404, 'RESOURCE_NOT_FOUND');
    }

    res.json({
      success: true,
      data: resource
    });
  } catch (error) {
    next(error);
  }
}

export function getSkillsSummary(req: Request, res: Response, next: NextFunction): void {
  try {
    const skillCounts: Record<string, number> = {};

    for (const r of allResources) {
      skillCounts[r.skill] = (skillCounts[r.skill] || 0) + 1;
    }

    const summary = Object.entries(skillCounts).map(([skill, count]) => ({
      skill,
      resourceCount: count
    }));

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
}
