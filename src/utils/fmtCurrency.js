const CURRENCY_FORMATS = {
  AED: { prefix: 'AED ',  locale: 'en-AE' },
  USD: { prefix: '$',     locale: 'en-US' },
  GBP: { prefix: '£',     locale: 'en-GB' },
  EUR: { prefix: '€',     locale: 'de-DE' },
  SAR: { prefix: 'SAR ',  locale: 'ar-SA' },
  QAR: { prefix: 'QAR ',  locale: 'ar-QA' },
};

/**
 * Format a numeric amount with the user's selected currency.
 * @param {number} amount
 * @param {string} [currency='AED']
 * @param {{ compact?: boolean }} [opts]
 */
export function fmtCurrency(amount, currency = 'AED', { compact = false } = {}) {
  const fmt  = CURRENCY_FORMATS[currency] ?? CURRENCY_FORMATS.AED;
  const abs  = Math.abs(amount ?? 0);
  const sign = (amount ?? 0) < 0 ? '-' : '';

  let formatted;
  if (compact && abs >= 1_000_000) {
    formatted = `${(abs / 1_000_000).toFixed(1)}M`;
  } else if (compact && abs >= 1_000) {
    formatted = `${(abs / 1_000).toFixed(1)}K`;
  } else {
    formatted = abs.toLocaleString(fmt.locale, { maximumFractionDigits: 0 });
  }

  return `${sign}${fmt.prefix}${formatted}`;
}
