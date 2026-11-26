/* Synthetic policy book — entirely fictional. Deterministic so every demo looks the same. */

export type PolicyStatus = 'In Force' | 'Pending Issue' | 'Grace Period' | 'Lapsed' | 'Claim Pending' | 'Claim Paid' | 'Paid-Up' | 'Surrendered';
export type ProductType = 'Term Life' | 'Whole Life' | 'Universal Life' | 'Variable Universal Life' | 'Fixed Annuity' | 'Group Life';

export interface Customer {
  id: string;
  name: string;
  dob: string;
  ssnLast4: string;
  email: string;
  phone: string;
  address: string;
  segment: 'Individual' | 'Business';
  since: string;
}

export interface Beneficiary {
  name: string;
  relationship: string;
  type: 'Primary' | 'Contingent';
  share: number;
  /** Underage beneficiary — identity details fall under the minor-information category. */
  minor?: boolean;
}

export interface Coverage {
  name: string;
  kind: 'Base' | 'Rider';
  amount: number;
  status: 'Active' | 'Pending' | 'Terminated';
}

export interface Transaction {
  id: string;
  date: string;
  type: string;
  amount: number;
  status: 'Posted' | 'Pending' | 'Reversed';
}

export interface PolicyDocument {
  name: string;
  type: string;
  date: string;
  size: string;
}

export interface Policy {
  id: string;
  product: ProductType;
  plan: string;
  status: PolicyStatus;
  owner: Customer;
  insured: string;
  issueDate: string;
  faceAmount: number;
  premium: number;
  mode: 'Monthly' | 'Quarterly' | 'Annual';
  nextDue: string;
  paidTo: string;
  cashValue: number;
  loanBalance: number;
  agent: string;
  state: string;
  beneficiaries: Beneficiary[];
  coverages: Coverage[];
  transactions: Transaction[];
  documents: PolicyDocument[];
}

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
const r = rng(4207);
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(r() * arr.length)];
const int = (min: number, max: number) => Math.floor(min + r() * (max - min + 1));

const FIRST = ['Michael', 'Sarah', 'David', 'Jennifer', 'Anthony', 'Rebecca', 'Christopher', 'Natalie', 'Jonathan', 'Megan', 'Andrew', 'Lauren', 'Victor', 'Sofia', 'Ethan', 'Chloe', 'Benjamin', 'Isabel', 'Raymond', 'Teresa', 'Gregory', 'Monica', 'Patrick', 'Diane'];
const LAST = ['Thompson', 'Alvarez', 'Bennett', 'Okafor', 'Sullivan', 'Nakamura', 'Fitzgerald', 'Delgado', 'Harrington', 'Lindqvist', 'Moreau', 'Patel', 'Whitaker', 'Castillo', 'Donovan', 'Reinhardt', 'Abernathy', 'Kowalski', 'Ashford', 'Romano', 'Hollis', 'Vance', 'Mercer', 'Calloway'];
const CITIES = ['Hartford, CT', 'Charlotte, NC', 'Tampa, FL', 'Cary, NC', 'Bloomfield, CT', 'Austin, TX', 'Columbus, OH', 'Denver, CO', 'Raleigh, NC', 'Phoenix, AZ'];
const STREETS = ['Maple Ave', 'Oak Ridge Dr', 'Harbor View Rd', 'Elm St', 'Lakeside Blvd', 'Willow Ln', 'Cedar Ct', 'Park Pl'];
const RELS = ['Spouse', 'Son', 'Daughter', 'Trust', 'Sibling', 'Parent'];
const AGENTS = ['Olivia Grant', 'Benson Advisory Group', 'Northpoint Brokerage', 'Olivia Grant', 'Crestline Partners'];

const PRODUCTS: { type: ProductType; plans: string[] }[] = [
  { type: 'Term Life', plans: ['Term 20 Select', 'Term 30 Preferred', 'Term 10 Standard'] },
  { type: 'Whole Life', plans: ['Whole Life Legacy 100', 'Whole Life Paid-Up 65'] },
  { type: 'Universal Life', plans: ['Guaranteed UL Plus', 'Flexible UL'] },
  { type: 'Variable Universal Life', plans: ['VUL Accumulator'] },
  { type: 'Fixed Annuity', plans: ['Fixed Deferred Annuity 7', 'Single Premium Immediate'] },
  { type: 'Group Life', plans: ['Group Term Basic', 'Group Supplemental'] },
];
const STATUS_POOL: PolicyStatus[] = ['In Force', 'In Force', 'In Force', 'In Force', 'In Force', 'Grace Period', 'Pending Issue', 'Claim Pending', 'Lapsed', 'Paid-Up', 'Surrendered'];

const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
const today = new Date();
const addDays = (n: number) => fmtDate(new Date(today.getTime() + n * 86400000));

function makePolicy(i: number): Policy {
  const first = FIRST[i % FIRST.length];
  const last = LAST[(i * 7) % LAST.length];
  const name = `${first} ${last}`;
  const prod = PRODUCTS[i % PRODUCTS.length];
  const status = i < 3 ? 'In Force' : pick(STATUS_POOL);
  const isAnnuity = prod.type === 'Fixed Annuity';
  const face = isAnnuity ? int(8, 60) * 5000 : int(5, 60) * 25000;
  const issueYear = int(2004, 2024);
  const mode = pick(['Monthly', 'Quarterly', 'Annual'] as const);
  const premium = isAnnuity ? 0 : Math.round(face / int(260, 900) / (mode === 'Monthly' ? 12 : mode === 'Quarterly' ? 4 : 1) * 100) / 100;
  const cash = prod.type === 'Term Life' || prod.type === 'Group Life' ? 0 : Math.round(face * (0.05 + r() * 0.35));
  const loan = cash > 0 && r() > 0.65 ? Math.round(cash * r() * 0.3) : 0;
  const spouse = `${pick(FIRST)} ${last}`;
  const child = `${pick(FIRST)} ${last}`;
  const ben: Beneficiary[] = r() > 0.4
    ? [{ name: spouse, relationship: 'Spouse', type: 'Primary', share: 100 }, { name: child, relationship: pick(['Son', 'Daughter']), type: 'Contingent', share: 100 }]
    : [{ name: spouse, relationship: pick(RELS), type: 'Primary', share: 60 }, { name: child, relationship: pick(RELS), type: 'Primary', share: 40 }];

  const coverages: Coverage[] = [{ name: prod.plans[0] + ' — Base', kind: 'Base', amount: face, status: status === 'Surrendered' || status === 'Lapsed' ? 'Terminated' : status === 'Pending Issue' ? 'Pending' : 'Active' }];
  if (!isAnnuity && r() > 0.3) coverages.push({ name: 'Waiver of Premium Rider', kind: 'Rider', amount: 0, status: 'Active' });
  if (!isAnnuity && r() > 0.5) coverages.push({ name: 'Accidental Death Benefit Rider', kind: 'Rider', amount: Math.round(face / 2), status: 'Active' });
  if (!isAnnuity && r() > 0.7) coverages.push({ name: 'Child Term Rider', kind: 'Rider', amount: 25000, status: 'Active' });

  const txTypes = isAnnuity ? ['Interest Credit', 'Contribution', 'Partial Withdrawal'] : ['Premium Payment', 'Premium Payment', 'Premium Payment', 'Loan Repayment', 'Dividend Credit', 'Policy Fee'];
  const transactions: Transaction[] = Array.from({ length: 6 }, (_, k) => {
    const type = k === 0 && status === 'Claim Pending' ? 'Death Claim Reserve' : pick(txTypes);
    const amt = type.includes('Premium') ? premium || 250 : type === 'Death Claim Reserve' ? face : int(40, 2400);
    return {
      id: `TXN-${(780000 + i * 37 + k * 5).toString()}`,
      date: addDays(-(k * 31 + int(1, 9))),
      type,
      amount: type.includes('Withdrawal') || type.includes('Fee') ? -amt : amt,
      status: k === 0 && (status === 'Claim Pending' || status === 'Grace Period') ? 'Pending' : r() > 0.95 ? 'Reversed' : 'Posted',
    };
  });

  const documents: PolicyDocument[] = [
    { name: 'Policy contract', type: 'Contract', date: `${issueYear}-0${int(1, 9)}-1${int(0, 9)}`, size: `${int(380, 920)} KB` },
    { name: 'Annual statement 2025', type: 'Statement', date: '2026-01-15', size: `${int(120, 260)} KB` },
    { name: 'Beneficiary designation form', type: 'Form', date: addDays(-int(40, 900)), size: `${int(80, 180)} KB` },
  ];
  if (status === 'Claim Pending') documents.push({ name: 'Certified death certificate', type: 'Claim evidence', date: addDays(-4), size: '1.2 MB' });
  if (status === 'Grace Period') documents.push({ name: 'Grace period notice', type: 'Correspondence', date: addDays(-12), size: '96 KB' });

  return {
    id: `ML-${40218376 + i * 7919}`,
    product: prod.type,
    plan: pick(prod.plans),
    status,
    owner: {
      id: `CUS-${104230 + i * 113}`,
      name: prod.type === 'Group Life' ? `${last} Manufacturing LLC` : name,
      dob: `${int(1952, 1994)}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`,
      ssnLast4: String(int(1000, 9999)),
      email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
      phone: `(555) ${int(200, 899)}-${int(1000, 9999)}`,
      address: `${int(12, 9800)} ${pick(STREETS)}, ${pick(CITIES)}`,
      segment: prod.type === 'Group Life' ? 'Business' : 'Individual',
      since: String(issueYear),
    },
    insured: name,
    issueDate: `${issueYear}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`,
    faceAmount: face,
    premium,
    mode,
    nextDue: status === 'Grace Period' ? addDays(-18) : addDays(int(3, 80)),
    paidTo: status === 'Grace Period' ? addDays(-18) : addDays(int(1, 60)),
    cashValue: cash,
    loanBalance: loan,
    agent: pick(AGENTS),
    state: pick(CITIES).split(', ')[1],
    beneficiaries: ben,
    coverages,
    transactions,
    documents,
  };
}

const BOOK: Policy[] = Array.from({ length: 48 }, (_, i) => makePolicy(i));

/** Deterministic overrides so cross-module stories line up (claims, the policyholder persona, minors). */
export const HOLDER_IDX = [7, 14];
for (const i of HOLDER_IDX) {
  const p = BOOK[i];
  p.status = 'In Force';
  p.owner = { ...p.owner, name: 'Hannah Wright', email: 'hannah.wright@example.com' };
  p.insured = 'Hannah Wright';
  p.coverages = p.coverages.map((c) => ({ ...c, status: 'Active' }));
}
export const CLAIM_IDX = [9, 16, 23, 30, 37, 44, 19, 33];
CLAIM_IDX.forEach((i, k) => {
  const p = BOOK[i];
  p.status = k < 6 ? 'Claim Pending' : 'Claim Paid';
  if (p.owner.segment === 'Business') p.owner = { ...p.owner, name: p.insured, segment: 'Individual' };
  if (k === 1 || k === 4) {
    const last = p.insured.split(' ')[1];
    p.beneficiaries = [
      { name: `${p.beneficiaries[0].name}`, relationship: 'Spouse', type: 'Primary', share: 50 },
      { name: `Lily ${last}`, relationship: 'Daughter', type: 'Primary', share: 25, minor: true },
      { name: `Owen ${last}`, relationship: 'Son', type: 'Primary', share: 25, minor: true },
    ];
  }
});

export const POLICIES: Policy[] = BOOK;
export const policyById = (id: string | null | undefined) => POLICIES.find((p) => p.id === id);
export const PRODUCT_TYPES = PRODUCTS.map((p) => p.type);
export const POLICY_STATUSES: PolicyStatus[] = ['In Force', 'Pending Issue', 'Grace Period', 'Claim Pending', 'Claim Paid', 'Lapsed', 'Paid-Up', 'Surrendered'];
