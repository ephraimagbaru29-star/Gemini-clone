/**
 * Returns a human-readable relative date label for conversation grouping.
 */
export function relativeLabel(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minute = 60_000;
  const hour = 3_600_000;
  const day = 86_400_000;

  if (diff < minute) return 'Just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 2 * day) return 'Yesterday';
  if (diff < 7 * day) return `${Math.floor(diff / day)} days ago`;

  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Groups conversations by time bucket label.
 */
export function groupByDate<T extends { updatedAt: number }>(
  items: T[],
): { label: string; items: T[] }[] {
  const now = Date.now();
  const day = 86_400_000;
  const buckets: { label: string; test: (t: number) => boolean }[] = [
    { label: 'Today', test: (t) => now - t < day },
    { label: 'Yesterday', test: (t) => now - t < 2 * day },
    { label: 'Previous 7 days', test: (t) => now - t < 7 * day },
    { label: 'Previous 30 days', test: (t) => now - t < 30 * day },
    { label: 'Older', test: () => true },
  ];

  const groups: { label: string; items: T[] }[] = [];
  const remaining = [...items].sort((a, b) => b.updatedAt - a.updatedAt);

  for (const bucket of buckets) {
    const matched = remaining.filter((item) => bucket.test(item.updatedAt));
    remaining.splice(
      0,
      remaining.length,
      ...remaining.filter((item) => !bucket.test(item.updatedAt)),
    );
    if (matched.length > 0) {
      groups.push({ label: bucket.label, items: matched });
    }
    if (remaining.length === 0) break;
  }

  return groups;
}
