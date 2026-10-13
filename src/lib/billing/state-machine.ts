/**
 * Server-side subscription state machine (spec §15). Pure: no I/O, no clock
 * except the `now` argument. Webhooks, checkout and cron reconciliation all
 * translate what happened into a BillingEvent and call `transition`. The
 * resulting state is the only input to access decisions (`accessFor`).
 *
 * States
 *   none            account exists, trial not started
 *   trialing        7-day trial, no card on file
 *   trial_expired   trial over, never paid → must buy explicitly
 *   pending_payment checkout created, awaiting first authorisation
 *   active          paid, inside the current period
 *   past_due        a renewal charge failed, provider is retrying (grace)
 *   halted          retries exhausted; access off until the user pays
 *   cancel_scheduled user cancelled; access until periodEnd
 *   cancelled       ended (immediately or at period end); no access
 */

export const STATES = [
  "none",
  "trialing",
  "trial_expired",
  "pending_payment",
  "active",
  "past_due",
  "halted",
  "cancel_scheduled",
  "cancelled",
] as const;
export type SubState = (typeof STATES)[number];

export type BillingEvent =
  | { type: "TRIAL_STARTED"; at: Date; days: number }
  | { type: "TRIAL_ENDED" }
  | { type: "CHECKOUT_STARTED" }
  | { type: "CHECKOUT_ABANDONED" }
  /** First payment captured or a renewal charged. periodEnd is the new paid-through time. */
  | { type: "PAYMENT_SUCCEEDED"; periodEnd: Date; paymentId: string }
  | { type: "PAYMENT_FAILED" }
  | { type: "RETRIES_EXHAUSTED" }
  | { type: "CANCEL_REQUESTED"; atPeriodEnd: boolean }
  | { type: "CANCEL_REVOKED" }
  | { type: "PERIOD_ENDED" };

export type Snapshot = {
  state: SubState;
  trialEndsAt: Date | null;
  /** Paid-through time. Access in active/past_due/cancel_scheduled never exceeds this plus grace. */
  periodEnd: Date | null;
  /** Payment ids already applied. Guarantees one period per payment (no double charge/credit). */
  appliedPayments: string[];
};

export type TransitionResult =
  | { ok: true; snapshot: Snapshot; changed: boolean }
  | { ok: false; error: string; snapshot: Snapshot };

export const PAST_DUE_GRACE_DAYS = 3;

export function initialSnapshot(): Snapshot {
  return { state: "none", trialEndsAt: null, periodEnd: null, appliedPayments: [] };
}

const PAID_STATES: ReadonlySet<SubState> = new Set(["active", "past_due", "cancel_scheduled"]);

function reject(s: Snapshot, e: BillingEvent): TransitionResult {
  return { ok: false, error: `Event ${e.type} is not allowed in state ${s.state}`, snapshot: s };
}
function to(s: Snapshot, patch: Partial<Snapshot>): TransitionResult {
  const next = { ...s, ...patch };
  const changed = JSON.stringify(next) !== JSON.stringify(s);
  return { ok: true, snapshot: next, changed };
}

export function transition(s: Snapshot, e: BillingEvent): TransitionResult {
  switch (e.type) {
    case "TRIAL_STARTED":
      // A trial is granted once per account, ever.
      if (s.state !== "none" || s.trialEndsAt) return reject(s, e);
      return to(s, { state: "trialing", trialEndsAt: new Date(e.at.getTime() + e.days * 86_400_000) });
    case "TRIAL_ENDED":
      if (s.state === "trialing") return to(s, { state: "trial_expired" });
      return { ok: true, snapshot: s, changed: false }; // idempotent no-op elsewhere
    case "CHECKOUT_STARTED":
      if (PAID_STATES.has(s.state)) return reject(s, e); // never sell a second concurrent period
      if (s.state === "trialing") return { ok: true, snapshot: s, changed: false }; // keep trial running until paid
      return to(s, { state: "pending_payment" });
    case "CHECKOUT_ABANDONED":
      if (s.state !== "pending_payment") return { ok: true, snapshot: s, changed: false };
      return to(s, { state: s.trialEndsAt ? "trial_expired" : "none" });
    case "PAYMENT_SUCCEEDED": {
      if (s.appliedPayments.includes(e.paymentId)) return { ok: true, snapshot: s, changed: false };
      if (s.periodEnd && e.periodEnd.getTime() <= s.periodEnd.getTime()) {
        // A charge that does not extend the paid period would be a duplicate charge for the same period.
        return { ok: false, error: "Payment does not extend the paid period (possible duplicate charge)", snapshot: s };
      }
      const keepCancel = s.state === "cancel_scheduled";
      return to(s, {
        state: keepCancel ? "cancel_scheduled" : "active",
        periodEnd: e.periodEnd,
        appliedPayments: [...s.appliedPayments, e.paymentId].slice(-50),
      });
    }
    case "PAYMENT_FAILED":
      if (s.state === "active") return to(s, { state: "past_due" });
      if (s.state === "pending_payment" || s.state === "past_due") return { ok: true, snapshot: s, changed: false };
      return reject(s, e);
    case "RETRIES_EXHAUSTED":
      if (s.state === "past_due" || s.state === "active") return to(s, { state: "halted" });
      if (s.state === "halted") return { ok: true, snapshot: s, changed: false };
      return reject(s, e);
    case "CANCEL_REQUESTED":
      if (s.state === "cancelled") return { ok: true, snapshot: s, changed: false };
      if (e.atPeriodEnd && (s.state === "active" || s.state === "cancel_scheduled")) return to(s, { state: "cancel_scheduled" });
      if (PAID_STATES.has(s.state) || s.state === "halted" || s.state === "pending_payment") return to(s, { state: "cancelled" });
      return reject(s, e);
    case "CANCEL_REVOKED":
      if (s.state === "cancel_scheduled") return to(s, { state: "active" });
      return reject(s, e);
    case "PERIOD_ENDED":
      if (s.state === "cancel_scheduled") return to(s, { state: "cancelled" });
      return { ok: true, snapshot: s, changed: false };
  }
}

export type Access = { paid: boolean; trial: boolean; allowed: boolean; reason: string; trialDaysLeft: number };

/** The one function that decides whether premium features are usable. Server-side only. */
export function accessFor(s: Snapshot, now = new Date()): Access {
  const t = now.getTime();
  const trialLeft = s.trialEndsAt ? s.trialEndsAt.getTime() - t : 0;
  const days = trialLeft > 0 ? Math.ceil(trialLeft / 86_400_000) : 0;
  const end = s.periodEnd?.getTime() ?? 0;
  switch (s.state) {
    case "trialing":
      return trialLeft > 0
        ? { paid: false, trial: true, allowed: true, reason: "trial", trialDaysLeft: days }
        : { paid: false, trial: false, allowed: false, reason: "trial_expired", trialDaysLeft: 0 };
    case "active":
    case "cancel_scheduled":
      return { paid: true, trial: false, allowed: end > t, reason: end > t ? s.state : "period_over", trialDaysLeft: 0 };
    case "past_due": {
      const ok = end + PAST_DUE_GRACE_DAYS * 86_400_000 > t;
      return { paid: true, trial: false, allowed: ok, reason: ok ? "grace" : "past_due", trialDaysLeft: 0 };
    }
    case "pending_payment":
      // A user who started checkout while still in trial keeps their trial days.
      return trialLeft > 0
        ? { paid: false, trial: true, allowed: true, reason: "trial", trialDaysLeft: days }
        : { paid: false, trial: false, allowed: false, reason: "pending_payment", trialDaysLeft: 0 };
    default:
      return { paid: false, trial: false, allowed: false, reason: s.state, trialDaysLeft: 0 };
  }
}

/** Map provider-native statuses (Razorpay / Stripe) to our state. Used for reconciliation. */
export function stateFromProvider(provider: "razorpay" | "stripe", status: string, cancelAtPeriodEnd = false): SubState {
  const st = status.toLowerCase();
  if (provider === "razorpay") {
    if (st === "active" || st === "authenticated") return cancelAtPeriodEnd ? "cancel_scheduled" : "active";
    if (st === "pending") return "past_due";
    if (st === "halted") return "halted";
    if (st === "cancelled" || st === "completed" || st === "expired") return "cancelled";
    return "pending_payment"; // created
  }
  if (st === "active" || st === "trialing") return cancelAtPeriodEnd ? "cancel_scheduled" : "active";
  if (st === "past_due") return "past_due";
  if (st === "unpaid" || st === "paused") return "halted";
  if (st === "canceled" || st === "incomplete_expired") return "cancelled";
  return "pending_payment";
}
