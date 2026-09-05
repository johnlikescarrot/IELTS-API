import { describe, expect, it } from 'vitest';

import { WRITING_EXERCISES, findWritingExercise } from '../../src/data/writingExercises.js';
import { renderWritingFigure } from '../../src/lib/writingFigure.js';

import type { ChartStimulus, WritingExercise } from '../../src/data/writingExercises.js';

function modifiedChart(id: string, update: Partial<ChartStimulus>): WritingExercise {
  const exercise = structuredClone(findWritingExercise(id)!);
  Object.assign(exercise.stimulus, update);
  return exercise;
}

describe('accessible, original SVG figures', () => {
  it.each(WRITING_EXERCISES)('renders $kind reproducibly without scripts or external assets', (exercise) => {
    const svg = renderWritingFigure(exercise);
    expect(svg).toBe(renderWritingFigure(exercise));
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
    expect(svg).toContain('viewBox="0 0 960 650"');
    expect(svg).toContain('role="img" aria-labelledby="figure-title figure-description"');
    expect(svg).toContain('orient="auto"');
    expect(svg).toContain(`<title id="figure-title">${exercise.stimulus.title}</title>`);
    expect(svg).toContain('Original fictional practice');
    expect(svg).toContain(exercise.id);
    expect(svg).toContain('CC BY 4.0');
    expect(svg).not.toMatch(/<(?:script|foreignObject|image)|href=|NaN|Infinity|undefined/);
    expect(svg.endsWith('</svg>\n')).toBe(true);
  });

  it('draws zero and missing bars differently', () => {
    const svg = renderWritingFigure(findWritingExercise('w1-cycle-rentals')!);
    expect(svg).toContain('>NR</text>');
    expect(svg).toContain('height="0"');
    expect(svg).toContain('>0</text>');
    expect(svg).toContain('rentals per day');
    expect(svg).toContain('not reported');
  });

  it('breaks line paths at missing observations rather than interpolating them', () => {
    const exercise = modifiedChart('w1-library-visits', {
      categories: ['a', 'b', 'c', 'd', 'e'],
      series: [{ label: 'Example', values: [10, 20, null, 30, 40] }],
    });
    const svg = renderWritingFigure(exercise);
    const path = /<path d="(M[^"]+)" fill="none" stroke="#1d4ed8"/.exec(svg)![1]!;
    expect(path.match(/M/g)).toHaveLength(2);
    expect(path.match(/L/g)).toHaveLength(2);
    expect(svg).toContain('>NR</text>');
  });

  it('handles zero-only series and a single observation without non-finite coordinates', () => {
    const zero = modifiedChart('w1-library-visits', {
      categories: ['Only year'],
      series: [{ label: 'No visits', values: [0] }],
    });
    expect(renderWritingFigure(zero)).not.toMatch(/NaN|Infinity/);
  });

  it('supports large pie arcs, empty sectors and a full-circle share', () => {
    const large = modifiedChart('w1-arts-income', {
      categories: ['a', 'b'],
      series: [{ label: 'Example', values: [75, 25] }],
    });
    expect(renderWritingFigure(large)).toMatch(/A125,125 0 1,1/);
    const full = modifiedChart('w1-arts-income', {
      categories: ['a', 'b'],
      series: [{ label: 'Example', values: [100, 0] }],
    });
    expect(renderWritingFigure(full)).toContain('<circle cx="265" cy="270" r="125"');
    expect(renderWritingFigure(full)).not.toContain('A125,125');
  });

  it('draws two nine-cell north-up maps and the correct number of process arrows', () => {
    const map = renderWritingFigure(findWritingExercise('w1-meadow-square')!);
    expect(map.match(/width="108" height="95"/g)).toHaveLength(18);
    expect(map).toContain('>N</text>');
    expect(map).toContain('>Solar farm</text>');
    const linear = renderWritingFigure(findWritingExercise('w1-bottle-refill')!);
    const cycle = renderWritingFigure(findWritingExercise('w1-flowering-cycle')!);
    expect(linear.match(/class="arrow"/g)).toHaveLength(5);
    expect(cycle.match(/class="arrow"/g)).toHaveLength(6);
    expect(linear).toContain('Linear sequence');
    expect(cycle).toContain('Repeating cycle');
  });

  it('XML-escapes all text, including the accessible description and long wrapped notes', () => {
    const exercise = structuredClone(WRITING_EXERCISES[0]!);
    exercise.stimulus.title = '<script>alert("x")</script> & \'quote\'';
    exercise.stimulus.note = 'A '.repeat(100) + '<img src=x onerror=alert(1)>';
    const svg = renderWritingFigure(exercise);
    expect(svg).not.toContain('<script>');
    expect(svg).not.toContain('<img');
    expect(svg).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;quote&#39;');
    expect(svg).toContain('&lt;img');
    expect(svg).toContain('y="609"');
  });
});
