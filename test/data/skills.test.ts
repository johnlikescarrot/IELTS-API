import { describe, expect, it } from 'vitest';

import { SKILL_FORMATS, SKILL_IDS, findSkillFormat } from '../../src/data/skills.js';

describe('SKILL_FORMATS', () => {
  it('covers all four skills in test order', () => {
    expect(SKILL_IDS).toEqual(['listening', 'reading', 'writing', 'speaking']);
    expect(SKILL_FORMATS).toHaveLength(4);
  });

  it('documents every skill fully', () => {
    for (const skill of SKILL_FORMATS) {
      expect(skill.summary.length).toBeGreaterThan(30);
      expect(skill.modules.length).toBeGreaterThan(0);
      expect(skill.modules.every((module) => module === 'academic' || module === 'general-training')).toBe(
        true,
      );
      expect(skill.minutes).toBeGreaterThan(0);
      expect(skill.parts.length).toBeGreaterThanOrEqual(2);
      expect(skill.notes.length).toBeGreaterThanOrEqual(3);
      expect(skill.scoringNote.length).toBeGreaterThan(10);
      for (const part of skill.parts) {
        expect(part.name.length).toBeGreaterThan(0);
        expect(part.focus.length).toBeGreaterThan(10);
        expect(part.minutes === null || part.minutes > 0).toBe(true);
        expect(part.questionCount === null || part.questionCount > 0).toBe(true);
      }
    }
  });

  it('states question counts where they are fixed', () => {
    const listening = findSkillFormat('listening');
    const writing = findSkillFormat('writing');
    expect(listening?.questionCount).toBe(40);
    expect(writing?.questionCount).toBeNull();
  });
});

describe('findSkillFormat', () => {
  it('finds an existing skill', () => {
    expect(findSkillFormat('speaking')?.name).toBe('Speaking');
  });

  it('returns undefined for unknown ids', () => {
    expect(findSkillFormat('pronunciation')).toBeUndefined();
  });
});
