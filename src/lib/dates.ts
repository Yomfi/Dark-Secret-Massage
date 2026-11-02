/** Date-only formatter for booking rows.
 *
 * `scheduled_at` is stored as a date at midnight (`YYYY-MM-DDT00:00:00.000000Z`),
 * so rendering the raw string or passing it through a timezone-aware clock both
 * mislead. Format the calendar date exactly as booked.
 */
export function formatScheduledDate(value: string | null | undefined): string {
  if (!value) return 'Awaiting confirmation';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
