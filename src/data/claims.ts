import { CLAIM_IDX, POLICIES, type Policy } from './policies';
import { gen, isoDay } from './seed';

/* ---------------- Death claims ---------------- */
export type ClaimStatus = 'Notified' | 'Registered' | 'Documents Pending' | 'Under Assessment' | 'Disputed' | 'Pending Approval' | 'Approved' | 'Paid';
export const CLAIM_STAGES = ['Notified', 'Registered', 'Documents', 'Assessment', 'Approval', 'Paid'];
export const claimStage = (s: ClaimStatus) => ({ Notified: 0, Registered: 1, 'Documents Pending': 2, 'Under Assessment': 3, Disputed: 3, 'Pending Approval': 4, Approved: 5, Paid: 6 }[s]);

export interface ClaimRequirement {
  name: string;
  received: boolean;
}

export interface DeathClaim {
  id: string;
  policyId: string;
  deceased: string;
  dateOfDeath: string;
  notified: string;
  notifiedBy: string;
  cause: 'Natural causes' | 'Accident' | 'Under investigation';
  status: ClaimStatus;
  requirements: ClaimRequirement[];
  disputed: boolean;
  legal?: string;
  payment: { method: string; status: 'Not started' | 'Scheduled' | 'Released' | 'Paid'; date?: string };
}

const g = gen(6203);
const CLAIM_STATUS: ClaimStatus[] = ['Documents Pending', 'Under Assessment', 'Disputed', 'Pending Approval', 'Registered', 'Under Assessment', 'Paid', 'Paid'];

export const DEATH_CLAIMS: DeathClaim[] = CLAIM_IDX.map((idx, k) => {
  const p = POLICIES[idx];
  const status = CLAIM_STATUS[k];
  const docsDone = !['Documents Pending', 'Registered'].includes(status);
  return {
    id: `CLM-${60400 + k * 12}`,
    policyId: p.id,
    deceased: p.insured,
    dateOfDeath: isoDay(-g.int(10, 40)),
    notified: isoDay(-g.int(3, 9)),
    notifiedBy: g.pick(['Spouse (phone)', 'Funeral home', 'Agent', 'Executor (letter)', 'Child (portal)']),
    cause: k === 2 ? 'Under investigation' : k === 5 ? 'Accident' : 'Natural causes',
    status,
    requirements: [
      { name: 'Claimant statement', received: true },
      { name: 'Certified death certificate (proof of death)', received: docsDone },
      { name: 'Beneficiary identification', received: docsDone || k === 4 },
      ...(k === 1 || k === 4 ? [{ name: 'Court-appointed guardian documents (minor)', received: k === 4 }] : []),
      ...(k === 2 ? [{ name: 'Letters testamentary (estate)', received: false }] : []),
    ],
    disputed: status === 'Disputed',
    legal: status === 'Disputed' ? 'Competing claim filed by former spouse alleging an earlier beneficiary designation; estate counsel engaged. Interpleader under consideration.' : k === 5 ? 'Accidental death benefit — police report requested.' : undefined,
    payment: status === 'Paid' ? { method: g.pick(['ACH', 'Check']), status: 'Paid', date: isoDay(-g.int(2, 10)) } : status === 'Pending Approval' ? { method: 'ACH', status: 'Scheduled' } : { method: '—', status: 'Not started' },
  };
});

/** Indicative death benefit. Synthetic arithmetic only. */
export function deathBenefit(p: Policy, accident: boolean) {
  const adb = accident ? p.coverages.filter((c) => c.name.startsWith('Accidental')).reduce((a, c) => a + c.amount, 0) : 0;
  const days = 21;
  const interest = Math.round((p.faceAmount + adb) * 0.035 * days / 365);
  const premiumRefund = p.premium ? Math.round(p.premium * 0.4) : 0;
  const total = p.faceAmount + adb - p.loanBalance + interest + premiumRefund;
  return {
    rows: [
      ['Base death benefit', p.faceAmount],
      ...(adb ? [['Accidental death rider', adb] as [string, number]] : []),
      ['Less outstanding loan', -p.loanBalance],
      ['Post-mortem interest', interest],
      ['Unearned premium refund', premiumRefund],
    ] as [string, number][],
    total,
  };
}

/* ---------------- Withdrawals ---------------- */
export type WithdrawalType = 'Full' | 'Partial' | 'Percentage';
export type WithdrawalStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Payment Processing' | 'Paid' | 'Rejected';

export interface Withdrawal {
  id: string;
  policyId: string;
  type: WithdrawalType;
  amount: number;
  percent?: number;
  requested: string;
  status: WithdrawalStatus;
  method: 'ACH' | 'Check' | 'Wire';
}

/** Indicative withdrawal quote. Synthetic arithmetic only. */
export function withdrawalQuote(p: Policy, type: WithdrawalType, input: number) {
  const available = Math.max(0, p.cashValue - p.loanBalance);
  const years = new Date().getFullYear() - Number(p.issueDate.slice(0, 4));
  const chargeRate = Math.max(0, 0.07 - years * 0.007);
  const gross = type === 'Full' ? available : type === 'Percentage' ? Math.round(available * Math.min(100, input) / 100) : Math.min(input, available);
  const freeAmount = type === 'Full' ? 0 : Math.round(available * 0.1);
  const penalty = Math.round(Math.max(0, gross - freeAmount) * chargeRate);
  const fee = type === 'Full' ? 0 : 25;
  const tax = Math.round(Math.max(0, gross - p.cashValue * 0.62) * 0.1);
  const net = Math.max(0, gross - penalty - fee - tax);
  const remaining = available - gross;
  return {
    available, gross, chargeRate, penalty, fee, tax, net, remaining,
    faceAfter: type === 'Full' ? 0 : Math.max(0, p.faceAmount - (p.product.includes('Universal') ? gross : 0)),
    eligible: available > 0 && ['In Force', 'Paid-Up'].includes(p.status),
  };
}

const wg = gen(4421);
const WD_STATUS: WithdrawalStatus[] = ['Pending Approval', 'Payment Processing', 'Paid', 'Approved', 'Pending Approval', 'Paid', 'Rejected', 'Payment Processing', 'Paid', 'Pending Approval'];
const cashPolicies = POLICIES.filter((p) => p.cashValue > 0 && ['In Force', 'Paid-Up'].includes(p.status));
export const SEED_WITHDRAWALS: Withdrawal[] = WD_STATUS.map((status, i) => {
  const p = cashPolicies[(i * 3) % cashPolicies.length];
  const type: WithdrawalType = i % 4 === 0 ? 'Full' : i % 3 === 0 ? 'Percentage' : 'Partial';
  const pct = type === 'Percentage' ? wg.pick([10, 20, 25]) : undefined;
  const avail = Math.max(0, p.cashValue - p.loanBalance);
  return {
    id: `WDR-${38120 + i * 9}`,
    policyId: p.id,
    type,
    amount: type === 'Full' ? avail : type === 'Percentage' ? Math.round(avail * (pct! / 100)) : Math.round(avail * wg.pick([0.05, 0.1, 0.15])),
    percent: pct,
    requested: isoDay(-wg.int(1, 25)),
    status,
    method: wg.pick(['ACH', 'Check', 'Wire'] as const),
  };
});
