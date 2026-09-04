import { describe, expect, it } from 'vitest';

describe('the cli entry module', () => {
  it('can be imported without starting a server', async () => {
    const module = await import('../src/cli.js');
    expect(Object.keys(module)).toEqual([]);
  });
});
