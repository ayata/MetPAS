import { POLICIES, type Policy } from './policies';
import { gen, isoDay } from './seed';
import { POLICY_RIDERS, RIDER_CATALOG, type PolicyRider, type RiderDef } from './product';

export type ChangeTypeId =
  | 'contribution' | 'add-person' | 'address' | 'beneficiary' | 'beneficiary-verification' | 'coverage'
  | 'income' | 'value' | 'rider-add' | 'rider-delete' | 'rider-modify' | 'conditional' | 'unemployment' | 'promotional';

export interface ChangeTypeDef {
  id: ChangeTypeId;
  name: string;
  description: string;
  /** Operator-facing eligibility summary (the underlying rules are restricted). */
  eligibility: string;
  documents: string[];
  affectsValues: boolean;
  requiresApproval: boolean;
  /** Input the operator provides for the indicative comparison. */
  input?: { label: string; kind: 'amount' | 'percent' | 'text'; default: number | string };
  taskType: string;
  /** Dropdown group heading (rider actions are listed together under "Rider"). */
  group?: 'Rider';
}

export const CHANGE_TYPES: ChangeTypeDef[] = [
  { id: 'contribution', name: 'Additional contribution', description: 'Unscheduled premium or contribution into the policy value.', eligibility: 'Policy in force; product accepts flexible premiums; within annual contribution limit.', documents: ['Contribution request form', 'Source of funds declaration'], affectsValues: true, requiresApproval: false, input: { label: 'Contribution amount', kind: 'amount', default: 5000 }, taskType: 'coverage-change' },
  { id: 'add-person', name: 'Add eligible person', description: 'Add a spouse or dependent to the policy coverage.', eligibility: 'Person meets relationship and age criteria; evidence of insurability may be required.', documents: ['Enrollment form', 'Proof of relationship', 'Health questionnaire'], affectsValues: true, requiresApproval: true, input: { label: 'Additional coverage amount', kind: 'amount', default: 50000 }, taskType: 'coverage-change' },
  { id: 'address', name: 'Address change', description: 'Update mailing address and correspondence preferences.', eligibility: 'Request from owner or authorized representative with verified identity.', documents: ['Signed change request or verified call recording'], affectsValues: false, requiresApproval: false, input: { label: 'New address', kind: 'text', default: '410 Harbor View Rd, Tampa, FL' }, taskType: 'address-change' },
  { id: 'beneficiary', name: 'Beneficiary change', description: 'Replace or reallocate primary and contingent beneficiaries.', eligibility: 'Owner signature; irrevocable beneficiaries must consent; shares must total 100%.', documents: ['Beneficiary designation form', 'Owner ID verification'], affectsValues: false, requiresApproval: true, input: { label: 'New primary beneficiary', kind: 'text', default: 'Jordan Ellison (Spouse) — 100%' }, taskType: 'beneficiary-change' },
  { id: 'beneficiary-verification', name: 'Beneficiary verification', description: 'Verify identity and details of existing beneficiaries.', eligibility: 'Triggered by change request, claim, or periodic review.', documents: ['Beneficiary ID', 'Relationship evidence'], affectsValues: false, requiresApproval: false, taskType: 'beneficiary-change' },
  { id: 'coverage', name: 'Coverage change', description: 'Increase or decrease the face amount.', eligibility: 'Decreases allowed after year 1; increases need evidence of insurability.', documents: ['Policy change request', 'Evidence of insurability (increases)'], affectsValues: true, requiresApproval: true, input: { label: 'New face amount', kind: 'amount', default: 0 }, taskType: 'coverage-change' },
  { id: 'income', name: 'Income-related change', description: 'Adjust income-linked benefits or premiums after an income change.', eligibility: 'Income-indexed product; documentation of new income.', documents: ['Income verification', 'Employer letter'], affectsValues: true, requiresApproval: true, input: { label: 'Income change', kind: 'percent', default: 10 }, taskType: 'coverage-change' },
  { id: 'value', name: 'Policy value change', description: 'Reallocation or adjustment of the policy value.', eligibility: 'Product supports reallocation; within transfer frequency limits.', documents: ['Allocation change form'], affectsValues: true, requiresApproval: true, input: { label: 'Value adjustment', kind: 'percent', default: -5 }, taskType: 'coverage-change' },
  { id: 'rider-add', group: 'Rider', name: 'Add rider', description: 'Add one or more new riders to the policy.', eligibility: 'Rider available on the product and not already on the policy; attained-age and underwriting limits apply.', documents: ['Rider application', 'Health questionnaire'], affectsValues: true, requiresApproval: true, taskType: 'rider-change' },
  { id: 'rider-delete', group: 'Rider', name: 'Delete rider', description: 'Remove one or more existing riders from the policy.', eligibility: 'Owner request; rider is active on the policy and not in a benefit claim.', documents: ['Rider removal request (owner signed)'], affectsValues: true, requiresApproval: true, taskType: 'rider-change' },
  { id: 'rider-modify', group: 'Rider', name: 'Modify rider', description: 'Change the benefit amount of an existing rider.', eligibility: 'Rider is active; increases need evidence of insurability and stay within product limits.', documents: ['Rider change request', 'Evidence of insurability (increases)'], affectsValues: true, requiresApproval: true, taskType: 'rider-change' },
  { id: 'conditional', name: 'Conditional benefit', description: 'Activate a benefit that applies when stated conditions are met.', eligibility: 'Condition evidence received and within benefit period.', documents: ['Condition evidence', 'Physician statement'], affectsValues: true, requiresApproval: true, input: { label: 'Monthly benefit', kind: 'amount', default: 1500 }, taskType: 'coverage-change' },
  { id: 'unemployment', name: 'Unemployment benefit', description: 'Premium relief while the owner is involuntarily unemployed.', eligibility: 'Involuntary unemployment; waiting period met; benefit cap applies.', documents: ['Termination letter', 'Unemployment registration'], affectsValues: true, requiresApproval: true, input: { label: 'Relief period (months)', kind: 'percent', default: 6 }, taskType: 'coverage-change' },
  { id: 'promotional', name: 'Special promotional condition', description: 'Apply a promotional premium or bonus condition.', eligibility: 'Promotion active for product and issue state; one promotion per policy.', documents: ['Promotion acknowledgement'], affectsValues: true, requiresApproval: true, input: { label: 'Premium discount', kind: 'percent', default: 5 }, taskType: 'coverage-change' },
];
/** Older saved requests used a single 'rider' type; they read as a rider modification. */
export const changeTypeById = (id: string) => CHANGE_TYPES.find((c) => c.id === (id === 'rider' ? 'rider-modify' : id));
export const isRiderChange = (id: string) => id === 'rider' || id.startsWith('rider-');

export interface ImpactRow {
  label: string;
  before: string;
  after: string;
  changed: boolean;
}

const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const annual = (p: Policy) => p.premium * (p.mode === 'Monthly' ? 12 : p.mode === 'Quarterly' ? 4 : 1);

/** Indicative before-and-after comparison. Synthetic arithmetic only — not the product's methodology. */
export function changeImpact(p: Policy, type: ChangeTypeDef, raw: number | string, riders: RiderChangeItem[] = [], currentRiders?: PolicyRider[]): ImpactRow[] {
  if (isRiderChange(type.id)) return riderImpact(p, type, riders, currentRiders);
  const v = typeof raw === 'number' ? raw : Number(raw) || 0;
  const face = p.faceAmount;
  const prem = annual(p);
  const cash = p.cashValue;
  let nFace = face, nPrem = prem, nCash = cash;
  switch (type.id) {
    case 'contribution': nCash = cash + v; nFace = p.product.includes('Universal') ? face + Math.round(v * 0.4) : face; break;
    case 'add-person': nFace = face + v; nPrem = prem + Math.round(v / 1000 * 2.1); break;
    case 'coverage': { const target = v || Math.round(face * 0.75); nFace = target; nPrem = Math.round(prem * (target / face)); break; }
    case 'income': nFace = Math.round(face * (1 + v / 100)); nPrem = Math.round(prem * (1 + v / 100)); break;
    case 'value': nCash = Math.round(cash * (1 + v / 100)); break;
    case 'conditional': nPrem = prem; nCash = cash; break;
    case 'unemployment': nPrem = Math.round(prem * (1 - Math.min(12, v) / 12)); break;
    case 'promotional': nPrem = Math.round(prem * (1 - v / 100)); break;
    default: break;
  }
  const rows: ImpactRow[] = [
    { label: p.product === 'Fixed Annuity' ? 'Contract value' : 'Face amount', before: usd(face), after: usd(nFace), changed: nFace !== face },
    { label: 'Annual premium', before: prem ? usd(prem) : '—', after: nPrem ? usd(nPrem) : '—', changed: nPrem !== prem },
    { label: 'Cash value', before: usd(cash), after: usd(nCash), changed: nCash !== cash },
  ];
  if (type.id === 'conditional') rows.push({ label: 'Monthly conditional benefit', before: usd(0), after: usd(v), changed: true });
  if (type.id === 'unemployment') rows.push({ label: 'Premium relief period', before: 'None', after: `${v} months`, changed: true });
  return rows;
}

/* ---------------- Rider changes ---------------- */

/** One rider line inside an add / delete / modify request. */
export interface RiderChangeItem {
  catalogId: string;
  /** Existing policy rider (delete / modify). */
  riderId?: string;
  benefit: number;
  previousBenefit?: number;
}

/** Synthetic annual rider charge (illustration only). */
export function riderPremium(def: RiderDef, benefit: number, p: Policy) {
  if (def.id === 'WOP') return Math.round(annual(p) * 0.07);
  if (def.id === 'ABR') return 0;
  const rate: Record<string, number> = { ADB: 0.9, CTR: 6, GIR: 1.4, LTC: 2.2 };
  return Math.round((benefit / 1000) * (rate[def.id] ?? 1));
}
/** Riders without a benefit amount (shown as "Included"). */
export const riderHasAmount = (def: RiderDef) => def.id !== 'WOP' && def.id !== 'ABR';
export const riderDefault = (def: RiderDef, p: Policy) => (def.id === 'CTR' ? 25000 : riderHasAmount(def) ? Math.round((p.faceAmount * 0.25) / 1000) * 1000 : 0);
/** Riders the product can carry. */
export const ridersForProduct = (p: Policy) => RIDER_CATALOG.filter((r) => r.products.includes(p.product));
const activeBase = (policyId: string) => POLICY_RIDERS.filter((r) => r.policyId === policyId && r.status !== 'Terminated');

export type RiderPending = { kind: 'add' | 'delete' | 'modify'; requestId: string; benefit?: number };
export interface EffectiveRider extends PolicyRider {
  /** Set while a change request for this rider is still in progress. */
  pending?: RiderPending;
  /** Request that last changed this rider. */
  changedBy?: string;
}

const APPLIED: ChangeStatus[] = ['Approved', 'Completed'];
const IN_FLIGHT: ChangeStatus[] = ['Eligibility Review', 'Awaiting Documents', 'Pending Approval'];
type RiderReq = Pick<ChangeRequest, 'id' | 'policyId' | 'type' | 'status' | 'requested' | 'riders'>;

/**
 * Riders on a policy after applying approved/completed rider requests, with in-flight requests flagged.
 * Base data stays untouched; the effect is derived from the change requests.
 */
export function effectiveRiders(policyId: string, requests: RiderReq[]): EffectiveRider[] {
  const p = POLICIES.find((x) => x.id === policyId);
  let list: EffectiveRider[] = POLICY_RIDERS.filter((r) => r.policyId === policyId).map((r) => ({ ...r }));
  if (!p) return list;
  const mine = requests.filter((r) => r.policyId === policyId && isRiderChange(r.type) && r.riders?.length).slice().sort((a, b) => a.requested.localeCompare(b.requested));
  for (const req of mine) {
    const kind = req.type === 'rider-add' ? 'add' : req.type === 'rider-delete' ? 'delete' : 'modify';
    const applied = APPLIED.includes(req.status);
    if (!applied && !IN_FLIGHT.includes(req.status)) continue;
    req.riders!.forEach((item, k) => {
      const def = RIDER_CATALOG.find((d) => d.id === item.catalogId);
      if (!def) return;
      if (kind === 'add') {
        list.push({ id: `RDR-${req.id.slice(4)}-${k + 1}`, policyId, rider: def, status: applied ? 'Active' : 'Pending', issued: req.requested, expires: '—', benefit: item.benefit, annualPremium: riderPremium(def, item.benefit, p), changedBy: applied ? req.id : undefined, pending: applied ? undefined : { kind, requestId: req.id } });
        return;
      }
      list = list.map((r) => {
        if (r.id !== item.riderId || r.status === 'Terminated') return r;
        if (!applied) return { ...r, pending: { kind, requestId: req.id, benefit: item.benefit } };
        return kind === 'delete'
          ? { ...r, status: 'Terminated', expires: req.requested, changedBy: req.id, pending: undefined }
          : { ...r, benefit: item.benefit, annualPremium: riderPremium(def, item.benefit, p), changedBy: req.id, pending: undefined };
      });
    });
  }
  return list;
}

/** Rider currently on the policy (not removed, not a pending addition). */
export const isLiveRider = (r: EffectiveRider) => r.status !== 'Terminated' && r.pending?.kind !== 'add';

/** Riders across the whole book, after rider change requests. */
export function allEffectiveRiders(requests: RiderReq[]): EffectiveRider[] {
  const ids = new Set([...POLICY_RIDERS.map((r) => r.policyId), ...requests.filter((r) => isRiderChange(r.type)).map((r) => r.policyId)]);
  return [...ids].flatMap((id) => effectiveRiders(id, requests));
}

function riderImpact(p: Policy, type: ChangeTypeDef, items: RiderChangeItem[], currentRiders?: PolicyRider[]): ImpactRow[] {
  const current = currentRiders ?? activeBase(p.id);
  const prem = annual(p);
  let delta = 0;
  const lines: ImpactRow[] = [];
  for (const it of items) {
    const def = RIDER_CATALOG.find((d) => d.id === it.catalogId);
    if (!def) continue;
    const amt = (n: number) => (riderHasAmount(def) ? usd(n) : 'Included');
    const existing = current.find((r) => r.id === it.riderId);
    if (type.id === 'rider-add') {
      delta += riderPremium(def, it.benefit, p);
      lines.push({ label: def.name, before: 'Not on policy', after: amt(it.benefit), changed: true });
    } else if (type.id === 'rider-delete') {
      delta -= existing?.annualPremium ?? riderPremium(def, it.benefit, p);
      lines.push({ label: def.name, before: amt(it.benefit), after: 'Removed', changed: true });
    } else {
      const prev = it.previousBenefit ?? it.benefit;
      delta += riderPremium(def, it.benefit, p) - riderPremium(def, prev, p);
      lines.push({ label: def.name, before: amt(prev), after: amt(it.benefit), changed: it.benefit !== prev });
    }
  }
  const n = current.length;
  const nAfter = type.id === 'rider-add' ? n + items.length : type.id === 'rider-delete' ? n - items.length : n;
  return [
    ...lines,
    { label: 'Riders on policy', before: String(n), after: String(nAfter), changed: n !== nAfter },
    { label: 'Annual premium (incl. riders)', before: prem ? usd(prem) : '—', after: usd(Math.max(0, prem + delta)), changed: delta !== 0 },
    { label: 'Base face amount', before: usd(p.faceAmount), after: usd(p.faceAmount), changed: false },
  ];
}

/** Operator-visible eligibility checks (outcomes only). */
export function eligibilityChecks(p: Policy, type: ChangeTypeDef) {
  const years = new Date().getFullYear() - Number(p.issueDate.slice(0, 4));
  const inForce = p.status === 'In Force' || p.status === 'Paid-Up';
  return [
    { label: 'Policy status allows changes', ok: inForce, note: p.status },
    { label: 'Owner identity verified', ok: true, note: 'Verified on file' },
    { label: 'Product supports this change', ok: !(type.id === 'contribution' && p.product === 'Term Life'), note: p.product },
    ...(isRiderChange(type.id) ? [type.id === 'rider-add'
      ? { label: 'Product offers additional riders', ok: ridersForProduct(p).some((d) => !activeBase(p.id).some((r) => r.rider.id === d.id)), note: `${ridersForProduct(p).length} riders for ${p.product}` }
      : { label: 'Policy has active riders', ok: activeBase(p.id).length > 0, note: `${activeBase(p.id).length} on policy` }] : []),
    { label: 'Minimum policy duration met', ok: type.id !== 'coverage' || years >= 1, note: `${years} years in force` },
    { label: 'No conflicting change in progress', ok: true, note: 'None found' },
  ];
}

export type ChangeStatus = 'Eligibility Review' | 'Awaiting Documents' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Completed';

export interface ChangeRequest {
  id: string;
  policyId: string;
  type: ChangeTypeId;
  requested: string;
  requestedBy: string;
  status: ChangeStatus;
  value: number | string;
  documents: { name: string; received: boolean }[];
  taskId?: string;
  /** Rider lines for add / delete / modify requests. */
  riders?: RiderChangeItem[];
}

const g = gen(9127);
const STATUSES: ChangeStatus[] = ['Eligibility Review', 'Awaiting Documents', 'Pending Approval', 'Pending Approval', 'Approved', 'Completed', 'Rejected'];
const REQUESTERS = ['Priya Raman', 'Daniel Brooks', 'Aisha Coleman', 'Digital portal'];

export const SEED_CHANGE_REQUESTS: ChangeRequest[] = Array.from({ length: 16 }, (_, i) => {
  const type = CHANGE_TYPES[i % CHANGE_TYPES.length];
  let p = POLICIES[(i * 7 + 2) % POLICIES.length];
  const status = STATUSES[i % STATUSES.length];
  let riders: RiderChangeItem[] | undefined;
  if (isRiderChange(type.id)) {
    // Pick a policy where the rider action makes sense.
    if (type.id === 'rider-add') {
      const free = (x: Policy) => ridersForProduct(x).find((d) => riderHasAmount(d) && !activeBase(x.id).some((r) => r.rider.id === d.id));
      p = POLICIES.slice(i).find((x) => x.status === 'In Force' && free(x)) ?? p;
      const def = free(p);
      riders = def ? [{ catalogId: def.id, benefit: riderDefault(def, p) }] : [];
    } else {
      const withRiders = POLICIES.filter((x) => x.status === 'In Force' && activeBase(x.id).some((r) => riderHasAmount(r.rider)));
      p = withRiders[(i * 3) % withRiders.length] ?? p;
      const r = activeBase(p.id).find((x) => riderHasAmount(x.rider));
      riders = !r ? [] : type.id === 'rider-delete'
        ? [{ catalogId: r.rider.id, riderId: r.id, benefit: r.benefit }]
        : [{ catalogId: r.rider.id, riderId: r.id, previousBenefit: r.benefit, benefit: Math.round((r.benefit * 1.5) / 1000) * 1000 }];
    }
  }
  return {
    riders,
    id: `PCR-${71040 + i * 13}`,
    policyId: p.id,
    type: type.id,
    requested: isoDay(-g.int(1, 21)),
    requestedBy: g.pick(REQUESTERS),
    status,
    value: type.input?.default || (type.id === 'coverage' ? Math.round(p.faceAmount * 0.75) : 0),
    documents: type.documents.map((d, k) => ({ name: d, received: status !== 'Awaiting Documents' || k === 0 })),
  };
});

/** Synthetic policy history (status and value changes). */
export function policyHistory(p: Policy) {
  const g2 = gen(Number(p.id.slice(3)) % 100000);
  const issueYear = Number(p.issueDate.slice(0, 4));
  const events = [
    { date: p.issueDate, text: `Policy issued — ${p.plan}, ${usd(p.faceAmount)}`, meta: 'New business' },
    { date: `${issueYear + 1}-${p.issueDate.slice(5)}`, text: 'First policy anniversary — values credited', meta: 'Anniversary processing' },
  ];
  if (g2.chance(0.6)) events.push({ date: isoDay(-g2.int(300, 900)), text: 'Beneficiary designation updated', meta: 'Policy change' });
  if (g2.chance(0.5)) events.push({ date: isoDay(-g2.int(200, 700)), text: `Billing mode changed to ${p.mode}`, meta: 'Policy change' });
  if (p.loanBalance > 0) events.push({ date: isoDay(-g2.int(60, 400)), text: `Policy loan issued — ${usd(p.loanBalance)}`, meta: 'Financial transaction' });
  if (p.status === 'Grace Period') events.push({ date: isoDay(-18), text: 'Entered grace period — premium unpaid', meta: 'Status change' });
  if (p.status === 'Claim Pending') events.push({ date: isoDay(-9), text: 'Death notification registered — status Claim Pending', meta: 'Status change' });
  if (p.status === 'Claim Paid') events.push({ date: isoDay(-12), text: 'Death benefit paid — policy terminated by claim', meta: 'Status change' });
  if (p.status === 'Lapsed') events.push({ date: isoDay(-40), text: 'Policy lapsed after grace period', meta: 'Status change' });
  if (p.status === 'Surrendered') events.push({ date: isoDay(-60), text: 'Full surrender processed', meta: 'Status change' });
  if (p.status === 'Paid-Up') events.push({ date: isoDay(-120), text: 'Converted to reduced paid-up', meta: 'Status change' });
  return events;
}
