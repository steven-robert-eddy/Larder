/**
 * Parses an ISO 8601 duration ("PT1H15M", "PT45M", "P1DT2H") into whole
 * minutes. Recipe sites only ever use the time-of-day fields plus
 * occasionally days, so that's all this handles — returns null for
 * anything that doesn't match rather than guessing.
 */
export function parseIsoDurationToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(value.trim());
  if (!match) return null;

  const [, days, hours, minutes, seconds] = match;
  if (!days && !hours && !minutes && !seconds) return null;

  const totalMinutes =
    (Number(days ?? 0) * 24 * 60) +
    (Number(hours ?? 0) * 60) +
    Number(minutes ?? 0) +
    Number(seconds ?? 0) / 60;

  return totalMinutes > 0 ? Math.round(totalMinutes) : null;
}
