// Mirrors Android util/Format.kt.

const minutesSince = (at: Date) => Math.floor((Date.now() - at.getTime()) / 60_000);

/** "Very close by", "< 1 km away", "3.2 km away", "12 km away". */
export const formatDistance = (km: number | null | undefined): string | null => {
  if (km == null) return null;
  if (km < 0.5) return 'Very close by';
  if (km < 1) return '< 1 km away';
  if (km < 10) return `${km.toFixed(1)} km away`.replace('.0 km', ' km');
  return `${Math.round(km)} km away`;
};

export const formatLastActive = (online: boolean, lastActive: Date | null): string => {
  if (online) return 'Online now';
  if (!lastActive) return 'Recently active';
  const minutes = minutesSince(lastActive);
  if (minutes < 60) return `Active ${Math.max(minutes, 1)}m ago`;
  if (minutes < 60 * 24) return `Active ${Math.floor(minutes / 60)}h ago`;
  if (minutes < 60 * 24 * 7) return `Active ${Math.floor(minutes / (60 * 24))}d ago`;
  return 'Active a while ago';
};

const dayMonth = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** Conversation list timestamps: "now", "5m", "3h", "2d", or a date. */
export const formatShortAgo = (at: Date): string => {
  const minutes = minutesSince(at);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h`;
  if (minutes < 60 * 24 * 7) return `${Math.floor(minutes / (60 * 24))}d`;
  return dayMonth(at);
};

export const formatAgo = (at: Date | null): string => {
  if (!at) return '';
  const minutes = minutesSince(at);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / (60 * 24))}d ago`;
};

/** "9:05" */
export const formatClock = (at: Date): string => `${at.getHours()}:${String(at.getMinutes()).padStart(2, '0')}`;

/** "Sat 12 Oct · 11:00" */
export const formatWhen = (at: Date): string => {
  const wd = at.toLocaleDateString(undefined, { weekday: 'short' });
  return `${wd} ${dayMonth(at)} · ${formatClock(at)}`;
};

/** Day separators in chat: "Today", "Yesterday", "Monday", "12 Oct". */
export const formatDay = (at: Date): string => {
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((start(new Date()) - start(at)) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return at.toLocaleDateString(undefined, { weekday: 'long' });
  return dayMonth(at);
};

export const formatHeight = (cm: number | null | undefined): string | null => {
  if (cm == null) return null;
  if (cm < 3) {
    // Stored in feet by some older clients.
    const inches = Math.round(cm * 12);
    return `${Math.floor(inches / 12)}'${inches % 12}"`;
  }
  return `${Math.round(cm)} cm`;
};

export const formatCoins = (n: number): string => n.toLocaleString();

/** Paystack price in minor units, e.g. 750000 NGN → "₦7,500". */
export const formatMoney = (minor: number, currency: string): string => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: minor % 100 === 0 ? 0 : 2,
    }).format(minor / 100);
  } catch {
    return `${currency} ${(minor / 100).toLocaleString()}`;
  }
};
