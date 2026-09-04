import { writingSamples } from '../data/index.js';
import type { WritingSample } from '../types.js';

const has = (value: string, needle: string): boolean =>
  needle.length === 0 || value.toLowerCase().includes(needle.toLowerCase()) === true;

export function listWritingSamples(query = ''): {
  count: number;
  total: number;
  samples: WritingSample[];
} {
  const finalQuery = query.trim();
  const samples = writingSamples.filter((sample) =>
    has(`${sample.subject} ${sample.prompt} ${sample.examinerComment}`, finalQuery),
  );
  return { count: samples.length, total: writingSamples.length, samples };
}

export function getWritingSample(id: string): WritingSample | undefined {
  return writingSamples.find((sample) => sample.id === id);
}
