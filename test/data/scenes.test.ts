import { describe, expect, it } from 'vitest';

import { QUESTION_TYPE_IDS, QUESTION_TYPES } from '../../src/data/questionTypes.js';
import { SCENES, SCENE_SKILLS, findScene } from '../../src/data/scenes.js';

describe('the communicative-context taxonomy', () => {
  it('publishes twelve listening scenes and eight reading domains', () => {
    expect([...SCENE_SKILLS]).toEqual(['listening', 'reading']);
    expect(SCENES).toHaveLength(20);
    expect(SCENES.filter((scene) => scene.skill === 'listening')).toHaveLength(12);
    expect(SCENES.filter((scene) => scene.skill === 'reading')).toHaveLength(8);
  });

  it('uses unique kebab-case identifiers', () => {
    const ids = SCENES.map((scene) => scene.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });

  it('keeps sections inside the paper structure', () => {
    for (const scene of SCENES) {
      expect(scene.sections.length).toBeGreaterThan(0);
      const maximum = scene.skill === 'listening' ? 4 : 3;
      for (const section of scene.sections) {
        expect(Number.isInteger(section)).toBe(true);
        expect(section).toBeGreaterThanOrEqual(1);
        expect(section).toBeLessThanOrEqual(maximum);
      }
    }
  });

  it('references canonical question types that belong to the same skill', () => {
    for (const scene of SCENES) {
      expect(scene.typicalQuestionTypes.length).toBeGreaterThan(0);
      for (const id of scene.typicalQuestionTypes) {
        expect(QUESTION_TYPE_IDS).toContain(id);
        const type = QUESTION_TYPES.find((entry) => entry.id === id);
        expect(type?.skills).toContain(scene.skill);
      }
    }
  });

  it('documents signals and vocabulary keywords for every context', () => {
    for (const scene of SCENES) {
      expect(scene.description.length).toBeGreaterThan(20);
      expect(scene.signals.length).toBeGreaterThanOrEqual(3);
      expect(scene.keywords.length).toBeGreaterThanOrEqual(3);
      expect(['everyday', 'academic']).toContain(scene.register);
    }
  });
});

describe('findScene', () => {
  it('finds a context case-insensitively', () => {
    expect(findScene('Academic-Lecture')?.name).toBe('Academic lecture monologue');
    expect(findScene('  health-medicine  ')?.skill).toBe('reading');
  });

  it('returns undefined for unknown identifiers', () => {
    expect(findScene('no-such-scene')).toBeUndefined();
  });
});
