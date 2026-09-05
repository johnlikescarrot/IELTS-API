import { describe, expect, it } from 'vitest';
import {
  findReceptiveTasks,
  LISTENING_TASKS,
  READING_TASKS,
  RECEPTIVE_TASK_SOURCES,
} from '../../src/data/receptive-tasks.js';

describe('original receptive-task guidance', () => {
  it('covers all 11 Reading and 6 Listening families, with unique IDs and official references', () => {
    expect(READING_TASKS).toHaveLength(11);
    expect(LISTENING_TASKS).toHaveLength(6);
    const all = [...READING_TASKS, ...LISTENING_TASKS];
    expect(new Set(all.map((item) => item.id)).size).toBe(17);
    for (const item of all) {
      expect(item.id).toMatch(new RegExp(`^${item.skill}-[a-z-]+$`));
      expect(item.sourceUrl).toBe(RECEPTIVE_TASK_SOURCES[item.skill]);
      expect(item.strategy).toHaveLength(3);
      expect(item.focus.length).toBeGreaterThan(40);
      expect(item.pitfall.length).toBeGreaterThan(40);
      expect(['selection', 'text', 'mixed']).toContain(item.responseMode);
    }
  });

  it('keeps factual evidence distinct from writer viewpoints and paragraph gist', () => {
    expect(findReceptiveTasks('reading', '', 'reading-identifying-information')[0]?.pitfall).toContain(
      'false',
    );
    expect(findReceptiveTasks('reading', '', 'reading-identifying-views')[0]?.focus).toContain('writer');
    expect(findReceptiveTasks('reading', '', 'reading-matching-headings')[0]?.focus).toContain(
      'central purpose',
    );
  });

  it('combines skill, type and substring filters without mutating the source arrays', () => {
    expect(findReceptiveTasks('reading')).toHaveLength(11);
    expect(findReceptiveTasks('listening')).toHaveLength(6);
    expect(findReceptiveTasks('listening', 'CORRECTS')).toHaveLength(1);
    expect(findReceptiveTasks('reading', '', 'listening-matching')).toEqual([]);
    expect(findReceptiveTasks('reading', 'not-a-real-task')).toEqual([]);
    expect(READING_TASKS).toHaveLength(11);
  });
});
