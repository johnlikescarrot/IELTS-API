/**
 * Mock exam centre logic: the test-day timeline and the score report.
 *
 * Both builders are pure functions of validated inputs — no clocks, no
 * randomness — so a countdown viewer and a score report can be reproduced
 * byte-for-byte years later, the same guarantee the rest of the API gives
 * research clients. The shapes follow the test-centre conventions of the open
 * `wanli4473/yysd-testcenter` site (a timed exam viewer fed by an exam
 * manifest, and a results page that renders captured marks as bands), but the
 * implementation reads this repository's own rulebook and conversion tables.
 */

import { cefrForBand } from '../data/bands.js';
import { examTestDayConfig } from '../data/examFormat.js';
import { minRawForBand, rawScoreResult, scaleForSkill } from '../data/rawScores.js';
import { calculateOverall, SKILLS } from './band.js';
import { badRequest } from './errors.js';

import type {
  ExamDelivery,
  ExamModule,
  ExamReport,
  ExamReportComponent,
  ExamReportTargetRow,
  ExamSchedule,
  ExamScheduleSegment,
  RawScoreScale,
  Skill,
} from '../types.js';

/** Validated start of a sitting. */
export interface ExamStart {
  /** ISO date anchor, when the caller supplied one. */
  date: string | null;
  /** Minutes since midnight of the (given or implied) start day. */
  minutes: number;
  /** The original label. */
  label: string;
}

const DATE_TIME = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d)$/;
const TIME_ONLY = /^([01]\d|2[0-3]):([0-5]\d)$/;

function parseClock(hour: string, minute: string): number {
  return Number.parseInt(hour, 10) * 60 + Number.parseInt(minute, 10);
}

/**
 * Parse the `start` parameter of `/v1/exam/schedule`.
 *
 * Accepts `HH:MM` (time only, 24-hour) or `YYYY-MM-DDTHH:MM`. No timezone is
 * accepted: wall-clock arithmetic on the supplied label is all the timeline
 * needs, which keeps the response reproducible across replicas.
 *
 * @param value - Raw parameter value.
 */
export function parseExamStart(value: string): ExamStart {
  const dateTime = DATE_TIME.exec(value);
  if (dateTime !== null) {
    const anchor = new Date(`${dateTime[1] as string}T00:00:00Z`);
    if (Number.isNaN(anchor.getTime()) || anchor.toISOString().slice(0, 10) !== dateTime[1]) {
      throw badRequest('Parameter "start" is not a valid calendar date.', {
        parameter: 'start',
        received: value,
      });
    }
    return {
      date: dateTime[1] as string,
      minutes: parseClock(dateTime[2] as string, dateTime[3] as string),
      label: value,
    };
  }
  const time = TIME_ONLY.exec(value);
  if (time !== null) {
    return { date: null, minutes: parseClock(time[1] as string, time[2] as string), label: value };
  }
  throw badRequest('Parameter "start" must be HH:MM or YYYY-MM-DDTHH:MM (24-hour clock).', {
    parameter: 'start',
    received: value,
  });
}

/** Render minutes-since-midnight-of-day-0 as `HH:MM` plus a day offset. */
function formatClock(totalMinutes: number): { time: string; day: number } {
  const day = Math.floor(totalMinutes / 1440);
  const inDay = totalMinutes - day * 1440;
  const hours = String(Math.floor(inDay / 60)).padStart(2, '0');
  const minutes = String(inDay % 60).padStart(2, '0');
  return { time: `${hours}:${minutes}`, day };
}

/** Options accepted by {@link buildExamSchedule}; all pre-validated. */
export interface ExamScheduleOptions {
  /** Examination paper. */
  module: ExamModule;
  /** Delivery mode. */
  delivery: ExamDelivery;
  /** Validated sitting start. */
  start: ExamStart;
  /** Break minutes inserted between sections (0-60). */
  breakMinutes: number;
}

/**
 * Build the invigilated timeline for one sitting.
 *
 * The Speaking test is deliberately absent: it is held separately, up to
 * seven days around the written papers (see the rulebook), so a countdown
 * clock only covers the continuous Listening → Reading → Writing sitting.
 *
 * @param options - Validated schedule inputs.
 */
export function buildExamSchedule(options: ExamScheduleOptions): ExamSchedule {
  const { module, delivery, start, breakMinutes } = options;
  const config = examTestDayConfig(module, delivery);
  const sections = config.sections.filter((section) => section.id !== 'speaking');

  const segments: ExamScheduleSegment[] = [];
  let elapsed = 0;
  const push = (id: string, name: string, minutes: number): void => {
    const startClock = formatClock(start.minutes + elapsed);
    const startAt = elapsed;
    elapsed += minutes;
    const endClock = formatClock(start.minutes + elapsed);
    segments.push({
      id,
      name,
      startMinutes: startAt,
      endMinutes: elapsed,
      start: startClock.time,
      end: endClock.time,
      day: endClock.day,
      minutes,
    });
  };
  for (const section of sections) {
    if (segments.length > 0 && breakMinutes > 0) {
      push('break', 'Scheduled break', breakMinutes);
    }
    push(section.id, section.name, section.durationMinutes);
    if (section.afterMinutes > 0) {
      const label = section.afterLabel as string;
      const phaseId = label.startsWith('transfer') ? 'transfer' : 'check';
      push(phaseId, `${section.name} — ${label}`, section.afterMinutes);
    }
  }

  const end = formatClock(start.minutes + elapsed);
  return {
    start: start.label,
    date: start.date,
    module,
    delivery,
    breakMinutes,
    segments,
    totalMinutes: elapsed,
    countdownSeconds: elapsed * 60,
    end: { time: end.time, day: end.day },
  };
}

/** Inputs accepted by {@link buildExamReport}; marks are 0-40, bands are validated half-steps. */
export interface ExamReportInput {
  /** Examination paper the Reading marks are read against. */
  module: ExamModule;
  /** Correct answers on Listening. */
  listeningRaw?: number | undefined;
  /** Correct answers on Reading. */
  readingRaw?: number | undefined;
  /** Examiner band for Writing. */
  writing?: number | undefined;
  /** Examiner band for Speaking. */
  speaking?: number | undefined;
  /** Optional target overall band for the gap analysis. */
  target?: number | undefined;
}

function rawComponent(skill: Skill, scale: RawScoreScale, raw: number): ExamReportComponent {
  const result = rawScoreResult(scale, raw);
  return {
    skill,
    source: 'raw',
    raw,
    band: result.band,
    range: result.range,
    next: result.next,
  };
}

function bandComponent(skill: Skill, band: number): ExamReportComponent {
  return {
    skill,
    source: 'band',
    raw: null,
    band,
    range: null,
    next: null,
  };
}

const MISSING_COMPONENT: Record<Skill, ExamReportComponent> = {
  listening: { skill: 'listening', source: 'missing', raw: null, band: null, range: null, next: null },
  reading: { skill: 'reading', source: 'missing', raw: null, band: null, range: null, next: null },
  writing: { skill: 'writing', source: 'missing', raw: null, band: null, range: null, next: null },
  speaking: { skill: 'speaking', source: 'missing', raw: null, band: null, range: null, next: null },
};

/**
 * Compose a mock score report from raw marks and examiner bands.
 *
 * @param input - Validated report inputs; at least one component must be present.
 */
export function buildExamReport(input: ExamReportInput): ExamReport {
  const components: ExamReportComponent[] = SKILLS.map((skill) => {
    if (skill === 'listening' && input.listeningRaw !== undefined) {
      return rawComponent(skill, scaleForSkill(input.module, 'listening'), input.listeningRaw);
    }
    if (skill === 'reading' && input.readingRaw !== undefined) {
      return rawComponent(skill, scaleForSkill(input.module, 'reading'), input.readingRaw);
    }
    if (skill === 'writing' && input.writing !== undefined) {
      return bandComponent(skill, input.writing);
    }
    if (skill === 'speaking' && input.speaking !== undefined) {
      return bandComponent(skill, input.speaking);
    }
    return { ...MISSING_COMPONENT[skill] };
  });

  const bands = components.map((component) => component.band);
  const complete = bands.every((band) => band !== null);
  const overall = complete
    ? calculateOverall(
        Object.fromEntries(SKILLS.map((skill, index) => [skill, bands[index] as number])) as Record<
          Skill,
          number
        >,
        cefrForBand,
      )
    : null;

  let target: ExamReport['target'] = null;
  const requestedTarget = input.target;
  if (requestedTarget !== undefined) {
    const rows: ExamReportTargetRow[] = components.map((component): ExamReportTargetRow => {
      if (component.band !== null) {
        return {
          skill: component.skill,
          status: component.band >= requestedTarget ? 'met' : 'behind',
          itemsNeeded: null,
          bandGap: Math.round((requestedTarget - component.band) * 2) / 2,
        };
      }
      if (component.source === 'raw') {
        const scale = scaleForSkill(input.module, component.skill as 'listening' | 'reading');
        const needed = minRawForBand(scale, requestedTarget);
        if (needed === undefined) {
          // The target lies below every published row: any mark, 0 included, reaches it.
          return { skill: component.skill, status: 'met', itemsNeeded: 0, bandGap: null };
        }
        const raw = component.raw as number;
        // A raw row without a band sits below the lowest row of the table, so the
        // target is always out of reach from there and the gap is positive.
        return { skill: component.skill, status: 'behind', itemsNeeded: needed - raw, bandGap: null };
      }
      return { skill: component.skill, status: 'unknown', itemsNeeded: null, bandGap: null };
    });
    target = {
      band: requestedTarget,
      overallStatus: overall === null ? 'unknown' : overall.overall >= requestedTarget ? 'met' : 'behind',
      rows,
    };
  }

  return {
    module: input.module,
    components,
    overall,
    target,
    convention:
      'Test-report-form layout: four component rows in report order and one overall row. Candidate ' +
      'details (name, ID, photo, venue) are deliberately absent — this API never stores personal data.',
  };
}
