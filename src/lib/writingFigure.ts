/** Deterministic, self-contained SVG figures for the original Task 1 bank. */

import { escapeHtml } from './docs.js';
import { round2 } from './textstats.js';
import { WRITING_EXERCISE_REVISION } from '../data/writingExercises.js';

import type {
  ChartStimulus,
  MapStimulus,
  ProcessStimulus,
  TableStimulus,
  WritingExercise,
} from '../data/writingExercises.js';

const COLORS = ['#1d4ed8', '#b45309', '#0f766e', '#9333ea'];

/** Text nodes are escaped even though all current stimuli are project-authored. */
function text(x: number, y: number, value: string | number, anchor = 'start'): string {
  return `<text x="${round2(x)}" y="${round2(y)}" text-anchor="${anchor}">${escapeHtml(String(value))}</text>`;
}

function color(index: number): string {
  return COLORS[index % COLORS.length] as string;
}

/** Small, deterministic word wrapping, independent of system font measurement. */
function wrappedText(x: number, y: number, value: string, width: number): string {
  const lines: string[] = [];
  let line = '';
  for (const word of value.split(' ')) {
    if (line.length > 0 && line.length + word.length + 1 > width) {
      lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  lines.push(line);
  return lines.map((value, index) => text(x, y + index * 23, value)).join('');
}

/** Line and grouped bar charts share axes, units and a textual legend. */
function cartesian(stimulus: ChartStimulus): string {
  const left = 95;
  const bottom = 430;
  const width = 790;
  const height = 285;
  const maximum = Math.max(1, ...stimulus.series.flatMap((series) => series.values.map((v) => v ?? 0)));
  const ceiling = Math.ceil(maximum / 20) * 20;
  const y = (value: number): number => bottom - (value / ceiling) * height;
  const parts = [text(left, 105, stimulus.unit)];
  for (let tick = 0; tick <= 4; tick += 1) {
    const value = (ceiling * tick) / 4;
    parts.push(`<path d="M${left},${y(value)} H${left + width}" stroke="#cbd5e1"/>`);
    parts.push(text(left - 14, y(value) + 6, value, 'end'));
  }
  const groupWidth = width / stimulus.categories.length;
  const x = (index: number): number => {
    if (stimulus.kind === 'line-graph') {
      return left + (index * width) / Math.max(1, stimulus.categories.length - 1);
    }
    return left + groupWidth * (index + 0.5);
  };
  stimulus.categories.forEach((category, index) =>
    parts.push(text(x(index), bottom + 32, category, 'middle')),
  );
  stimulus.series.forEach((series, seriesIndex) => {
    const ink = color(seriesIndex);
    if (stimulus.kind === 'line-graph') {
      let path = '';
      let connected = false;
      series.values.forEach((value, index) => {
        if (value === null) {
          connected = false;
          parts.push(text(x(index), bottom - 10 - seriesIndex * 24, 'NR', 'middle'));
          return;
        }
        path += `${connected ? 'L' : 'M'}${round2(x(index))},${round2(y(value))} `;
        connected = true;
        parts.push(`<circle cx="${round2(x(index))}" cy="${round2(y(value))}" r="5" fill="${ink}"/>`);
      });
      parts.push(`<path d="${path.trim()}" fill="none" stroke="${ink}" stroke-width="3"/>`);
    } else {
      const barWidth = groupWidth / (stimulus.series.length + 1);
      series.values.forEach((value, index) => {
        const barX = left + index * groupWidth + barWidth * (seriesIndex + 0.5);
        if (value === null) {
          parts.push(text(barX + barWidth / 2, bottom - 10, 'NR', 'middle'));
          return;
        }
        parts.push(
          `<rect x="${round2(barX)}" y="${round2(y(value))}" width="${round2(barWidth - 5)}" height="${round2(bottom - y(value))}" fill="${ink}"/>`,
        );
        parts.push(text(barX + (barWidth - 5) / 2, y(value) - 8, value, 'middle'));
      });
    }
    parts.push(`<rect x="${95 + seriesIndex * 250}" y="487" width="18" height="18" fill="${ink}"/>`);
    parts.push(text(122 + seriesIndex * 250, 503, series.label));
  });
  return parts.join('');
}

/** Pie input is validated by the bank integrity tests: nonnegative shares summing to 100. */
function pies(stimulus: ChartStimulus): string {
  const parts: string[] = [];
  stimulus.series.forEach((series, seriesIndex) => {
    const cx = 265 + seriesIndex * 430;
    const cy = 270;
    const radius = 125;
    let angle = -Math.PI / 2;
    parts.push(text(cx, 112, series.label, 'middle'));
    series.values.forEach((share, index) => {
      const value = share as number;
      const end = angle + (value / 100) * Math.PI * 2;
      const startX = cx + radius * Math.cos(angle);
      const startY = cy + radius * Math.sin(angle);
      const endX = cx + radius * Math.cos(end);
      const endY = cy + radius * Math.sin(end);
      if (value === 100) {
        parts.push(`<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${color(index)}"/>`);
      } else if (value > 0) {
        parts.push(
          `<path d="M${cx},${cy} L${round2(startX)},${round2(startY)} A${radius},${radius} 0 ${value > 50 ? 1 : 0},1 ${round2(endX)},${round2(endY)} Z" fill="${color(index)}" stroke="white" stroke-width="2"/>`,
        );
      }
      angle = end;
    });
    series.values.forEach((value, index) => parts.push(text(cx, 440 + index * 25, `${value}%`, 'middle')));
  });
  stimulus.categories.forEach((category, index) => {
    parts.push(`<rect x="385" y="${426 + index * 25}" width="15" height="15" fill="${color(index)}"/>`);
    parts.push(text(410, 440 + index * 25, category));
  });
  return parts.join('');
}

function table(stimulus: TableStimulus): string {
  const parts = [text(85, 151, 'Branch')];
  stimulus.columns.forEach((column, index) => {
    const x = 350 + index * 275;
    parts.push(text(x, 140, column.label));
    parts.push(wrappedText(x, 168, `(${column.unit})`, 24));
  });
  stimulus.rows.forEach((row, index) => {
    const y = 252 + index * 84;
    parts.push(`<path d="M80,${y - 38} H900" stroke="#cbd5e1"/>`);
    parts.push(text(85, y, row.label));
    row.values.forEach((value, column) => parts.push(text(350 + column * 275, y, value)));
  });
  return parts.join('');
}

function maps(stimulus: MapStimulus): string {
  const parts = [
    text(890, 135, 'N', 'middle'),
    '<path d="M890,170 V143" stroke="#334155" marker-end="url(#arrow)"/>',
  ];
  stimulus.periods.forEach((period, index) => {
    const left = 85 + index * 455;
    parts.push(text(left + 162, 135, period.label, 'middle'));
    period.cells.forEach((cell, cellIndex) => {
      const x = left + (cellIndex % 3) * 108;
      const y = 175 + Math.floor(cellIndex / 3) * 95;
      parts.push(`<rect x="${x}" y="${y}" width="108" height="95" fill="#f1f5f9" stroke="#64748b"/>`);
      parts.push(`<g font-size="16">${text(x + 54, y + 53, cell, 'middle')}</g>`);
    });
  });
  return parts.join('');
}

/** Six-stage snake layout; a cycle explicitly returns to the first stage. */
function process(stimulus: ProcessStimulus): string {
  const parts: string[] = [];
  const positions = stimulus.stages.map((_stage, index) => ({
    x: 90 + (index < 3 ? index : 5 - index) * 300,
    y: index < 3 ? 190 : 375,
  }));
  positions.forEach((position, index) => {
    const next = positions[index + 1];
    if (next === undefined) {
      if (stimulus.topology === 'cycle') {
        parts.push('<path d="M90,410 H45 V225 H84" class="arrow"/>');
      }
    } else if (position.y !== next.y) {
      parts.push(`<path d="M${position.x + 100},${position.y + 70} V${next.y - 6}" class="arrow"/>`);
    } else if (position.x < next.x) {
      parts.push(`<path d="M${position.x + 200},${position.y + 35} H${next.x - 6}" class="arrow"/>`);
    } else {
      parts.push(`<path d="M${position.x},${position.y + 35} H${next.x + 206}" class="arrow"/>`);
    }
    parts.push(
      `<rect x="${position.x}" y="${position.y}" width="200" height="70" rx="10" fill="#eff6ff" stroke="#1d4ed8"/>`,
    );
    parts.push(text(position.x, position.y - 13, `Stage ${index + 1}`));
    parts.push(text(position.x + 100, position.y + 42, stimulus.stages[index] as string, 'middle'));
  });
  parts.push(text(480, 495, stimulus.topology === 'cycle' ? 'Repeating cycle' : 'Linear sequence', 'middle'));
  return parts.join('');
}

/**
 * Render a canonical exercise as accessible SVG, with no scripts or external assets.
 *
 * The bank integrity tests enforce the supported layouts (two pies/maps,
 * six-stage processes, aligned numeric series). All text is XML-escaped.
 */
export function renderWritingFigure(exercise: WritingExercise): string {
  const stimulus = exercise.stimulus;
  let body: string;
  switch (stimulus.kind) {
    case 'line-graph':
    case 'bar-chart':
      body = cartesian(stimulus);
      break;
    case 'pie-chart':
      body = pies(stimulus);
      break;
    case 'table':
      body = table(stimulus);
      break;
    case 'map':
      body = maps(stimulus);
      break;
    case 'manufacturing-process':
    case 'natural-process':
      body = process(stimulus);
      break;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 650" role="img" aria-labelledby="figure-title figure-description">
<title id="figure-title">${escapeHtml(stimulus.title)}</title>
<desc id="figure-description">Original fictional practice. The full machine-readable figure follows: ${escapeHtml(JSON.stringify(stimulus))}</desc>
<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="#334155"/></marker></defs>
<style>text{font-family:Arial,sans-serif;fill:#0f172a;font-size:18px}.arrow{fill:none;stroke:#334155;stroke-width:2;marker-end:url(#arrow)}</style>
<rect width="960" height="650" fill="white"/>
<g>${text(45, 45, stimulus.title)}${text(45, 76, 'Original Academic Task 1 practice · fictional data')}${body}
${wrappedText(45, 563, stimulus.note, 95)}
${text(45, 630, `${exercise.id} · revision ${WRITING_EXERCISE_REVISION} · CC BY 4.0 · IELTS API contributors`)}</g>
</svg>\n`;
}
