import { POLICIES, type Policy } from './policies';
import { PEOPLE_FIRST, PEOPLE_LAST, gen, isoDay } from './seed';

/* ---------------- Riders ---------------- */
export interface RiderDef {
  id: string;
  name: string;
  products: string[];
  duration: string;
  benefit: string;
  eligibility: string;
  timeframe: string;
  offset: string;
  premium: string;
}

export const RIDER_CATALOG: RiderDef[] = [
  { id: 'WOP', name: 'Waiver of Premium Rider', products: ['Term Life', 'Whole Life', 'Universal Life'], duration: 'To age 65', benefit: 'Premiums waived during total disability', eligibility: 'Issue ages 18–55; actively at work', timeframe: '6-month elimination period', offset: 'Offsets any disability premium credits', premium: '6–9% of base premium' },
  { id: 'ADB', name: 'Accidental Death Benefit Rider', products: ['Term Life', 'Whole Life', 'Universal Life', 'Variable Universal Life'], duration: 'To age 70', benefit: 'Additional death benefit if death is accidental', eligibility: 'Issue ages 18–60', timeframe: 'Death within 90 days of accident', offset: 'Not payable with other accidental benefits', premium: '$0.90 per $1,000' },
  { id: 'CTR', name: 'Child Term Rider', products: ['Term Life', 'Whole Life'], duration: 'Until child age 25', benefit: 'Term cover on each eligible child', eligibility: 'Children 15 days–18 years', timeframe: 'Convertible at age 25', offset: 'One rider covers all children', premium: '$6 per $1,000 flat' },
  { id: 'ABR', name: 'Accelerated Benefit Rider', products: ['Term Life', 'Whole Life', 'Universal Life'], duration: 'Life of policy', benefit: 'Advance of death benefit on terminal illness', eligibility: 'Life expectancy of 12 months or less', timeframe: 'One acceleration per policy', offset: 'Reduces death benefit by advanced amount plus fee', premium: 'No premium; fee on exercise' },
  { id: 'GIR', name: 'Guaranteed Insurability Rider', products: ['Whole Life', 'Universal Life'], duration: 'To age 40', benefit: 'Purchase additional cover without evidence', eligibility: 'Issue ages 0–37', timeframe: 'Option dates every 3 years and on life events', offset: 'Option amounts capped at original face', premium: 'Level, by issue age' },
  { id: 'LTC', name: 'Long-Term Care Rider', products: ['Universal Life'], duration: 'Life of policy', benefit: 'Monthly benefit for qualifying care', eligibility: 'Issue ages 40–75; underwriting required', timeframe: '90-day elimination period', offset: 'Benefits paid reduce death benefit dollar-for-dollar', premium: 'Charged monthly from policy value' },
];
export const riderByName = (n: string) => RIDER_CATALOG.find((r) => n.startsWith(r.name.replace(' Rider', '')));

export interface PolicyRider {
  id: string;
  policyId: string;
  rider: RiderDef;
  status: 'Active' | 'Pending' | 'Terminated' | 'Expiring';
  issued: string;
  expires: string;
  benefit: number;
  annualPremium: number;
}

export function buildPolicyRiders(): PolicyRider[] {
  const g = gen(5501);
  const out: PolicyRider[] = [];
  POLICIES.forEach((p) => {
    p.coverages.filter((c) => c.kind === 'Rider').forEach((c, k) => {
      const def = riderByName(c.name) ?? RIDER_CATALOG[0];
      const expiring = g.chance(0.12);
      out.push({
        id: `RDR-${p.id.slice(-5)}-${k + 1}`,
        policyId: p.id,
        rider: def,
        status: c.status === 'Terminated' ? 'Terminated' : expiring ? 'Expiring' : c.status === 'Pending' ? 'Pending' : 'Active',
        issued: p.issueDate,
        expires: expiring ? isoDay(g.int(10, 85)) : `${Number(p.issueDate.slice(0, 4)) + g.int(20, 40)}-${p.issueDate.slice(5)}`,
        benefit: c.amount,
        annualPremium: Math.round(p.premium * (p.mode === 'Monthly' ? 12 : p.mode === 'Quarterly' ? 4 : 1) * (0.05 + g.r() * 0.06)),
      });
    });
  });
  // A few riders on policies that only have a base coverage, so every catalog entry is in use.
  [3, 8, 21, 27].forEach((i, k) => {
    const p = POLICIES[i];
    out.push({ id: `RDR-${p.id.slice(-5)}-9`, policyId: p.id, rider: RIDER_CATALOG[3 + (k % 3)], status: k === 0 ? 'Pending' : 'Active', issued: isoDay(-g.int(30, 900)), expires: '—', benefit: Math.round(p.faceAmount * 0.5), annualPremium: g.int(120, 640) });
  });
  return out;
}
export const POLICY_RIDERS = buildPolicyRiders();

export const RIDER_RULE_CHANGES = [
  { id: 'RRC-118', rider: 'Waiver of Premium Rider', change: 'Elimination period reduced from 6 to 4 months for new issues', effective: isoDay(45), status: 'Pending Approval' },
  { id: 'RRC-112', rider: 'Long-Term Care Rider', change: 'Monthly benefit cap raised to 3% of face amount', effective: isoDay(-60), status: 'Approved' },
  { id: 'RRC-107', rider: 'Accidental Death Benefit Rider', change: 'Maximum issue age extended to 65', effective: isoDay(-210), status: 'Approved' },
];

/* ---------------- Calculation engines ---------------- */
export interface EngineDef {
  id: string;
  name: string;
  purpose: string;
  version: string;
  lastRun: string;
  status: 'Available' | 'Degraded' | 'Maintenance';
  scenarios: string[];
}
export const ENGINES: EngineDef[] = [
  { id: 'surrender', name: 'Surrender Cost Engine', purpose: 'Surrender values, surrender charges and market value adjustments', version: '7.4.2', lastRun: '12 min ago', status: 'Available', scenarios: ['Base', 'Interest +100bp', 'Interest −100bp'] },
  { id: 'lapse', name: 'Lapse Cost Engine', purpose: 'Lapse-related amounts and grace period projections', version: '3.1.0', lastRun: '1 h ago', status: 'Available', scenarios: ['Base', 'Lapse shock +50%', 'Lapse shock −50%'] },
  { id: 'guarantee', name: 'Guarantee Cost Engine', purpose: 'Guaranteed benefit costs and no-lapse guarantees', version: '5.0.6', lastRun: '3 h ago', status: 'Available', scenarios: ['Base', 'Equity −20%', 'Interest −100bp'] },
  { id: 'interest', name: 'Interest Engine', purpose: 'Credited interest, loan interest and interest charges', version: '4.2.1', lastRun: '8 min ago', status: 'Available', scenarios: ['Base', 'Rate reset'] },
  { id: 'dividend', name: 'Dividend Engine', purpose: 'Dividend scale and dividend options', version: '2.9.3', lastRun: 'Yesterday', status: 'Maintenance', scenarios: ['Current scale', 'Proposed scale'] },
  { id: 'pricing', name: 'Pricing Engine', purpose: 'Premium rates for new business quotations', version: '6.3.0', lastRun: '25 min ago', status: 'Available', scenarios: ['Current rates', 'Proposed rates'] },
  { id: 'valuation', name: 'Actuarial Valuation Engine', purpose: 'Statutory and GAAP reserves', version: '9.1.4', lastRun: 'Last night', status: 'Degraded', scenarios: ['Statutory', 'GAAP', 'Stress'] },
];

export function runEngine(engine: EngineDef, p: Policy, scenario: string) {
  const s = scenario.includes('+') ? 1.06 : scenario.includes('−') || scenario.includes('Equity') ? 0.93 : scenario.includes('Proposed') ? 1.03 : 1;
  const cash = p.cashValue || Math.round(p.faceAmount * 0.04);
  const out: [string, number][] = {
    surrender: [['Gross cash value', cash], ['Surrender charge', -Math.round(cash * 0.03 * s)], ['Outstanding loan', -p.loanBalance], ['Net surrender value', Math.round(cash * (1 - 0.03 * s)) - p.loanBalance]],
    lapse: [['Premium required to avoid lapse', Math.round(p.premium * 2 * s)], ['Lapse-related charge', Math.round(cash * 0.015 * s)], ['Projected lapse date (months)', Math.round(14 / s)]],
    guarantee: [['Guaranteed death benefit', p.faceAmount], ['Guaranteed cash value (yr 10)', Math.round(cash * 1.12 * s)], ['Guarantee cost (annual)', Math.round(p.faceAmount * 0.0007 / s)]],
    interest: [['Credited rate (%)', Number((4.1 * s).toFixed(2))], ['Interest credited YTD', Math.round(cash * 0.041 * s * 0.8)], ['Loan interest charge', Math.round(p.loanBalance * 0.06)]],
    dividend: [['Projected annual dividend', Math.round(p.faceAmount * 0.0021 * s)], ['Paid-up additions value', Math.round(p.faceAmount * 0.012 * s)]],
    pricing: [['Annual premium', Math.round((p.premium || 100) * 12 * s)], ['Premium per $1,000', Number(((p.premium || 100) * 12 * s / (p.faceAmount / 1000)).toFixed(2))]],
    valuation: [['Statutory reserve', Math.round(cash * 1.08 * s)], ['GAAP reserve', Math.round(cash * 0.97 * s)]],
  }[engine.id] as [string, number][];
  return out;
}

/* ---------------- Valuation ---------------- */
export const VALUATION_BY_LINE = [
  { line: 'Term Life', reserve: 412, policies: 182400, ae: 97 },
  { line: 'Whole Life', reserve: 1830, policies: 96200, ae: 101 },
  { line: 'Universal Life', reserve: 2410, policies: 74100, ae: 104 },
  { line: 'Variable Universal Life', reserve: 980, policies: 22800, ae: 99 },
  { line: 'Fixed Annuity', reserve: 3120, policies: 51300, ae: 96 },
  { line: 'Group Life', reserve: 205, policies: 1240, ae: 102 },
];
export const SCENARIOS = [
  { name: 'Interest rates +100bp', impact: -3.8, status: 'Completed' },
  { name: 'Interest rates −100bp', impact: 5.2, status: 'Completed' },
  { name: 'Mortality +10%', impact: 2.1, status: 'Completed' },
  { name: 'Lapse +50%', impact: -1.4, status: 'Completed' },
  { name: 'Equity −25%', impact: 3.3, status: 'Running' },
  { name: 'Combined adverse', impact: 7.9, status: 'Queued' },
];
export const PRODUCT_PERFORMANCE = [
  { product: 'Term 20 Select', newBusiness: 3120, lapse: 5.8, margin: 'On plan', trend: 'Stable' },
  { product: 'Whole Life Legacy 100', newBusiness: 1460, lapse: 3.1, margin: 'Above plan', trend: 'Improving' },
  { product: 'Guaranteed UL Plus', newBusiness: 980, lapse: 4.4, margin: 'Below plan', trend: 'Declining' },
  { product: 'VUL Accumulator', newBusiness: 410, lapse: 6.9, margin: 'On plan', trend: 'Stable' },
  { product: 'Fixed Deferred Annuity 7', newBusiness: 2240, lapse: 2.6, margin: 'Above plan', trend: 'Improving' },
];
export const VALUATION_REPORTS = ['Quarterly statutory reserve summary', 'GAAP roll-forward', 'Asset adequacy analysis', 'Experience study — mortality', 'Experience study — lapse', 'Embedded value summary'];

/* ---------------- Pricing ---------------- */
export interface PricingScenario {
  id: string;
  name: string;
  product: string;
  owner: string;
  status: 'Draft' | 'In Review' | 'Pending Approval' | 'Approved';
  change: number;
  updated: string;
}
export const PRICING_SCENARIOS: PricingScenario[] = [
  { id: 'PRS-2207', name: 'Term 20 — preferred plus repricing', product: 'Term 20 Select', owner: 'Sophie Laurent', status: 'Pending Approval', change: -4.5, updated: isoDay(-2) },
  { id: 'PRS-2203', name: 'GUL — secondary guarantee charge', product: 'Guaranteed UL Plus', owner: 'Sophie Laurent', status: 'In Review', change: 6.2, updated: isoDay(-5) },
  { id: 'PRS-2198', name: 'Whole Life — dividend scale 2027', product: 'Whole Life Legacy 100', owner: 'Nikhil Varma', status: 'Draft', change: 1.1, updated: isoDay(-9) },
  { id: 'PRS-2190', name: 'Annuity — credited rate refresh', product: 'Fixed Deferred Annuity 7', owner: 'Nikhil Varma', status: 'Approved', change: 0.25, updated: isoDay(-21) },
];
export const PRICING_COMPARISON = [
  { product: 'Term 20 Select', current: 1.12, proposed: 1.07, market: 1.10 },
  { product: 'Term 30 Preferred', current: 1.58, proposed: 1.58, market: 1.55 },
  { product: 'Whole Life Legacy 100', current: 14.2, proposed: 14.4, market: 14.9 },
  { product: 'Guaranteed UL Plus', current: 9.8, proposed: 10.4, market: 10.1 },
  { product: 'VUL Accumulator', current: 8.1, proposed: 8.1, market: 8.3 },
];
export const PRICING_OUTCOMES = [
  { product: 'Term 20 Select', irr: '11.8%', margin: '7.2%', breakeven: 'Year 9' },
  { product: 'Whole Life Legacy 100', irr: '10.4%', margin: '9.1%', breakeven: 'Year 12' },
  { product: 'Guaranteed UL Plus', irr: '8.9%', margin: '5.4%', breakeven: 'Year 14' },
];

/* ---------------- Underwriting ---------------- */
export type UwDecision = 'Pending' | 'Accepted' | 'Accepted with Conditions' | 'Rejected' | 'Referred';
export interface UwApplication {
  id: string;
  applicant: string;
  product: string;
  face: number;
  submitted: string;
  decision: UwDecision;
  riskClass: string;
  conditions: string[];
  outstanding: string[];
  documents: { name: string; received: boolean }[];
}
const ug = gen(7311);
const UW_DEC: UwDecision[] = ['Pending', 'Accepted', 'Accepted with Conditions', 'Pending', 'Referred', 'Rejected', 'Accepted', 'Accepted with Conditions'];
export const UW_APPLICATIONS: UwApplication[] = Array.from({ length: 14 }, (_, i) => {
  const decision = UW_DEC[i % UW_DEC.length];
  const pending = decision === 'Pending' || decision === 'Referred';
  return {
    id: `APP-${55210 + i * 17}`,
    applicant: `${PEOPLE_FIRST[(i * 3) % PEOPLE_FIRST.length]} ${PEOPLE_LAST[(i * 7) % PEOPLE_LAST.length]}`,
    product: ug.pick(['Term 20 Select', 'Term 30 Preferred', 'Whole Life Legacy 100', 'Guaranteed UL Plus']),
    face: ug.int(4, 40) * 25000,
    submitted: isoDay(-ug.int(1, 30)),
    decision,
    riskClass: decision === 'Rejected' ? 'Declined' : pending ? 'To be determined' : ug.pick(['Preferred Plus', 'Preferred', 'Standard Plus', 'Standard', 'Table 2']),
    conditions: decision === 'Accepted with Conditions' ? [ug.pick(['Rated Table 2 (+50% premium)', 'Aviation exclusion', 'Flat extra $2.50 per $1,000 for 3 years']), 'Face amount limited to $500,000'] : [],
    outstanding: pending ? ['Attending physician statement', ...(i % 2 ? ['Paramedical exam'] : [])] : [],
    documents: [
      { name: 'Application part A', received: true },
      { name: 'Health questionnaire', received: true },
      { name: 'Attending physician statement', received: !pending },
      { name: 'Financial supplement', received: i % 3 !== 0 || !pending },
    ],
  };
});
