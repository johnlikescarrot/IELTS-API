/**
 * IELTS reports overall scores at whole and half bands. Component scores arrive
 * in half-band steps, so the average may fall on an eighth-band boundary.
 */
export function calculateOverallBand(components: readonly number[]): number {
  const total = components.reduce((sum, score) => sum + score, 0);
  const average = total / components.length;

  return Math.floor(average * 2 + 0.5) / 2;
}
