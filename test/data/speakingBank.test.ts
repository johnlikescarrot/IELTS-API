import { describe, expect, it } from 'vitest';

import {
  CARD_CATEGORIES,
  CARD_STATUSES,
  bankIndex,
  findSpeakingCard,
  findSpeakingCards,
  part1Topics,
  season,
  speakingBankStats,
  speakingCardsPage,
} from '../../src/data/speakingBank.js';

describe('speaking bank dataset', () => {
  it('classifies the whole Part 2 deck', () => {
    const stats = speakingBankStats();
    expect(stats.deckCards).toBe(76);
    expect(stats.byCategory).toEqual({ person: 16, object: 25, event: 26, place: 9 });
    expect(stats.byStatus).toEqual({ new: 27, retained: 49 });
    expect(stats.bankCards).toBe(22);
    expect(stats.titleMatches).toBe(10);
  });

  it('describes the September-December 2025 season and its rotation', () => {
    const window = season();
    expect(window.start).toBe('2025-09-01');
    expect(window.end).toBe('2025-12-31');
    expect(window.rotation).toContain('January, May and September');
  });

  it('exposes the classification vocabularies', () => {
    expect(CARD_CATEGORIES).toEqual(['person', 'object', 'event', 'place']);
    expect(CARD_STATUSES).toEqual(['new', 'retained']);
  });

  it('lists Part 1 topic sets with question counts', () => {
    const topics = part1Topics();
    expect(topics).toHaveLength(18);
    expect(topics.reduce((sum, topic) => sum + topic.questions, 0)).toBe(speakingBankStats().part1Questions);
    const phones = part1Topics('phone');
    expect(phones.map((topic) => topic.name)).toContain('Phone');
    expect(part1Topics('xyzzy-nothing')).toHaveLength(0);
  });

  it('filters cue cards by category, status and free text', () => {
    const people = findSpeakingCards({ category: 'person' });
    expect(people).toHaveLength(16);
    expect(people.every((card) => card.category === 'person')).toBe(true);

    const freshPeople = findSpeakingCards({ category: 'person', status: 'new' });
    expect(freshPeople.length).toBeGreaterThan(0);
    expect(freshPeople.every((card) => card.status === 'new')).toBe(true);

    expect(findSpeakingCards({ status: 'retained' })).toHaveLength(49);

    const creative = findSpeakingCards({ query: 'creative person' });
    expect(creative.map((card) => card.id)).toContain('sb-001');
    const chinese = findSpeakingCards({ query: '钦佩' });
    expect(chinese.length).toBeGreaterThan(0);
    expect(findSpeakingCards({ query: 'xyzzy-nothing' })).toHaveLength(0);
  });

  it('paginates and sorts the cue cards', () => {
    const page = speakingCardsPage({ limit: 10, offset: 0 });
    expect(page.items).toHaveLength(10);
    expect(page.total).toBe(76);
    expect(page.hasMore).toBe(true);

    const byPrompt = speakingCardsPage({ sort: 'prompt', limit: 3, offset: 0 });
    const prompts = byPrompt.items.map((card) => card.promptLine.toLowerCase());
    expect(prompts).toEqual([...prompts].sort());

    const tail = speakingCardsPage({ order: 'desc', limit: 2, offset: 74 });
    expect(tail.items.map((card) => card.id)).toEqual(['sb-002', 'sb-001']);
    expect(tail.hasMore).toBe(false);
  });

  it('finds single cards and misses unknown identifiers', () => {
    const card = findSpeakingCard('sb-001');
    expect(card?.titleZh).toBe('钦佩的有创造力的人');
    expect(card?.promptLine).toContain('Describe a creative person');
    expect(findSpeakingCard('sb-999')).toBeUndefined();
  });

  it('indexes the crowd bank with Part 3 follow-up counts', () => {
    const index = bankIndex();
    expect(index).toHaveLength(22);
    expect(index.reduce((sum, card) => sum + card.followUps, 0)).toBe(speakingBankStats().part3FollowUps);
    const science = bankIndex('science');
    expect(science.map((card) => card.titleEn)).toContain('An interesting area of science');
    expect(bankIndex('xyzzy-nothing')).toHaveLength(0);
  });
});
