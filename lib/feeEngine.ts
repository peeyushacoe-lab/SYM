// Shared arrears-billing logic: a fee item (Monthly / Quarterly) accrues one
// period's worth of fee every time a period boundary is crossed, starting
// from the fee item's own "From" date — which is typically the BATCH's start
// date, not the student's join date. A student who joins mid-batch still
// owes for the months that already elapsed before they joined, because the
// batch fee covers the whole course/session, not just time-since-enrollment.
//
// This module computes, for a given fee item, how many billing periods have
// elapsed and what's still outstanding after payments already made.

export const PERIOD_MONTHS: Record<string, number> = { Monthly: 1, Quarterly: 3 };

export interface FeeItem {
  id: number;
  fee_type: string;
  from_date: string;
  amount: number;
  partial_supported: boolean | number;
}

export interface FeeRow {
  amount_paid: number;
  discount: number;
  period_from: string | null;
  period_to: string | null;
  remaining_due: number;
}

// All date math here is done in UTC explicitly (Date.UTC + getUTC*/toISOString,
// which is always UTC) rather than local-midnight Date parsing. Mixing local
// time with toISOString() shifts the date backward by a day whenever the
// server's timezone is ahead of UTC (e.g. IST, UTC+5:30) — exactly the
// timezone this app is likely to run in.
function parseYMD(dateStr: string): { y: number; m: number; d: number } {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { y, m: m - 1, d };
}

function ymIndex(dateStr: string): number {
  const { y, m } = parseYMD(dateStr);
  return y * 12 + m;
}

function toISO(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function endOfPeriod(startDateStr: string, periodMonths: number): string {
  const { y, m, d } = parseYMD(startDateStr);
  // First day of (start month + periodMonths), then step back one day.
  const ms = Date.UTC(y, m + periodMonths, d) - 86400000;
  return toISO(ms);
}

function addDays(dateStr: string, days: number): string {
  const { y, m, d } = parseYMD(dateStr);
  return toISO(Date.UTC(y, m, d) + days * 86400000);
}

export interface DueStatus {
  isRecurring: boolean;
  periodsElapsed: number; // total periods elapsed since from_date, up to and including today
  periodFrom: string | null; // start of the range still to be collected
  periodTo: string | null; // end of the range still to be collected (today's elapsed period)
  totalDueForRange: number; // amount owed for [periodFrom, periodTo]
  outstandingAcrossAllTime: number; // full unpaid balance including this item's history
  totalDueEver: number; // total ever billed for this item, up to today
  totalPaidEver: number; // total ever paid (incl. discounts) for this item
}

/**
 * `payments` should be every fees row already recorded against this fee item,
 * newest last (order doesn't matter, we scan all of them).
 */
export function computeFeeItemDue(item: FeeItem, payments: FeeRow[], today = new Date().toISOString().slice(0, 10)): DueStatus {
  const periodMonths = PERIOD_MONTHS[item.fee_type] || 0;

  const totals = totalOutstanding(item, payments, today);

  if (periodMonths === 0) {
    // CourseWise / OneTime / Installment: a single lump sum, no recurring periods.
    return {
      isRecurring: false,
      periodsElapsed: totals.outstanding > 0 ? 1 : 0,
      periodFrom: item.from_date,
      periodTo: null,
      totalDueForRange: totals.outstanding,
      outstandingAcrossAllTime: totals.outstanding,
      totalDueEver: totals.totalDueEver,
      totalPaidEver: totals.totalPaidEver,
    };
  }

  // The amount actually owed right now is always totalDueEver so far minus
  // everything ever paid against this item (totals.outstanding) — that nets
  // correctly no matter HOW a past payment was recorded, including a payment
  // made through the old flat "Record payment" form before this structured
  // fee item existed (those rows have no period_to, so they can't be matched
  // to a specific period below, but they unambiguously reduced what's owed).
  // Using the period-boundary math alone for the amount would silently
  // ignore any such untracked payment and double-bill for it.
  //
  // periodFrom/periodTo/periodsElapsed below are only a *label* for which
  // range is presently open — based on the last period a period-tracked
  // payment (via the wizard) fully or partially closed — they don't affect
  // the amount returned.
  if (totals.outstanding <= 0) {
    return {
      isRecurring: true,
      periodsElapsed: 0,
      periodFrom: null,
      periodTo: null,
      totalDueForRange: 0,
      outstandingAcrossAllTime: totals.outstanding,
      totalDueEver: totals.totalDueEver,
      totalPaidEver: totals.totalPaidEver,
    };
  }

  // Is there an existing period that was only partially paid? Keep the label
  // pointed at that same range until it's cleared, rather than skipping ahead.
  const openRow = payments
    .filter((p) => p.period_to && Number(p.remaining_due) > 0)
    .sort((a, b) => (a.period_to! < b.period_to! ? 1 : -1))[0];

  if (openRow) {
    return {
      isRecurring: true,
      periodsElapsed: 1,
      periodFrom: openRow.period_from,
      periodTo: openRow.period_to,
      totalDueForRange: totals.outstanding,
      outstandingAcrossAllTime: totals.outstanding,
      totalDueEver: totals.totalDueEver,
      totalPaidEver: totals.totalPaidEver,
    };
  }

  // Otherwise, label the range as starting right after the latest
  // period-tracked fully-settled period (or from the fee item's own start
  // date if no period-tracked payment exists yet at all).
  const lastClosed = payments
    .filter((p) => p.period_to && Number(p.remaining_due) === 0)
    .sort((a, b) => (a.period_to! < b.period_to! ? 1 : -1))[0];

  const rangeStart = lastClosed ? addDays(lastClosed.period_to!, 1) : item.from_date;
  const startIdx = ymIndex(rangeStart);
  const todayIdx = ymIndex(today);
  const periodsElapsed = Math.max(Math.floor((todayIdx - startIdx) / periodMonths) + 1, 0);
  const rangeEnd = periodsElapsed > 0 ? endOfPeriod(rangeStart, periodsElapsed * periodMonths) : null;

  return {
    isRecurring: true,
    periodsElapsed,
    periodFrom: periodsElapsed > 0 ? rangeStart : null,
    periodTo: rangeEnd,
    totalDueForRange: totals.outstanding,
    outstandingAcrossAllTime: totals.outstanding,
    totalDueEver: totals.totalDueEver,
    totalPaidEver: totals.totalPaidEver,
  };
}

function totalOutstanding(
  item: FeeItem,
  payments: FeeRow[],
  today: string
): { totalDueEver: number; totalPaidEver: number; outstanding: number } {
  const periodMonths = PERIOD_MONTHS[item.fee_type] || 0;
  const totalPaidEver = payments.reduce((s, p) => s + Number(p.amount_paid) + Number(p.discount || 0), 0);
  if (periodMonths === 0) {
    const totalDueEver = Number(item.amount);
    return { totalDueEver, totalPaidEver, outstanding: Math.max(totalDueEver - totalPaidEver, 0) };
  }
  const startIdx = ymIndex(item.from_date);
  const todayIdx = ymIndex(today);
  const periodsElapsed = Math.max(Math.floor((todayIdx - startIdx) / periodMonths) + 1, 0);
  const totalDueEver = periodsElapsed * Number(item.amount);
  return { totalDueEver, totalPaidEver, outstanding: Math.max(totalDueEver - totalPaidEver, 0) };
}

/** How many whole periods does [periodFrom, periodTo] span, for a given fee type. */
export function monthsSpanned(periodFrom: string, periodTo: string, feeType: string): number {
  const periodMonths = PERIOD_MONTHS[feeType] || 1;
  const span = ymIndex(periodTo) - ymIndex(periodFrom) + 1;
  return Math.max(Math.ceil(span / periodMonths), 1);
}

// A fee item tied to a batch should stop accruing new periods once the batch
// has ended — otherwise a closed batch would keep billing students forever
// just because nobody collected the last fee item. Callers pass the batch's
// end_date (if any); this clamps "today" to that date so computeFeeItemDue
// never counts periods past it. A batch with no end_date, or one that hasn't
// ended yet, is unaffected (returns `today` unchanged).
export function effectiveAsOf(today: string, batchEndDate?: string | null): string {
  if (!batchEndDate) return today;
  return batchEndDate < today ? batchEndDate : today;
}
