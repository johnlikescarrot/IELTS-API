import { Request, Response, NextFunction } from 'express';
import collegesData from '../data/colleges.json';
import { CollegeItem } from '../types';
import { paginateArray } from '../utils/pagination';
import { AppError } from '../middlewares/errorHandler';

const allColleges: CollegeItem[] = collegesData as CollegeItem[];

export function getColleges(req: Request, res: Response, next: NextFunction): void {
  try {
    const { province, provinceCode, city, type, minOverall, search, page, limit } = req.query;

    let filtered = [...allColleges];

    if (province && typeof province === 'string') {
      const p = province.trim().toLowerCase();
      filtered = filtered.filter((c) => c.province.toLowerCase().includes(p));
    }

    if (provinceCode && typeof provinceCode === 'string') {
      const pc = provinceCode.trim().toUpperCase();
      filtered = filtered.filter((c) => c.provinceCode.toUpperCase() === pc);
    }

    if (city && typeof city === 'string') {
      const ct = city.trim().toLowerCase();
      filtered = filtered.filter((c) => c.city.toLowerCase().includes(ct));
    }

    if (type && typeof type === 'string') {
      const t = type.trim().toLowerCase();
      filtered = filtered.filter((c) => c.type.toLowerCase().includes(t));
    }

    if (minOverall !== undefined && minOverall !== '') {
      const minScore = parseFloat(String(minOverall));
      if (isNaN(minScore) || minScore < 0 || minScore > 9) {
        throw new AppError(
          "Query parameter 'minOverall' must be a valid band score between 0.0 and 9.0.",
          400,
          'INVALID_SCORE'
        );
      }
      filtered = filtered.filter(
        (c) =>
          c.ieltsRequirements.diploma.overall <= minScore ||
          c.ieltsRequirements.postGraduate.overall <= minScore ||
          c.ieltsRequirements.degree.overall <= minScore
      );
    }

    if (search && typeof search === 'string') {
      const s = search.trim().toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          c.chineseName.includes(s) ||
          c.city.toLowerCase().includes(s) ||
          c.province.toLowerCase().includes(s) ||
          c.popularPrograms.some((p) => p.toLowerCase().includes(s))
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

export function getCollegeById(req: Request, res: Response, next: NextFunction): void {
  try {
    const id = String(req.params.id);
    const numId = parseInt(id, 10);

    if (isNaN(numId) || numId < 1) {
      throw new AppError('College ID must be a positive integer.', 400, 'INVALID_ID');
    }

    const college = allColleges.find((c) => c.id === numId);

    if (!college) {
      throw new AppError(`College with ID ${numId} was not found.`, 404, 'COLLEGE_NOT_FOUND');
    }

    res.json({
      success: true,
      data: college
    });
  } catch (error) {
    next(error);
  }
}

export function getProvinces(req: Request, res: Response, next: NextFunction): void {
  try {
    const provinceMap = new Map<
      string,
      { province: string; provinceCode: string; collegeCount: number; colleges: string[] }
    >();

    for (const c of allColleges) {
      if (!provinceMap.has(c.provinceCode)) {
        provinceMap.set(c.provinceCode, {
          province: c.province,
          provinceCode: c.provinceCode,
          collegeCount: 0,
          colleges: []
        });
      }
      const entry = provinceMap.get(c.provinceCode)!;
      entry.collegeCount++;
      entry.colleges.push(c.name);
    }

    const summary = Array.from(provinceMap.values());

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
}
