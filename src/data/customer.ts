import { POLICIES } from './policies';
import { gen, isoAgo, isoDay } from './seed';

export type Channel = 'Chat' | 'Telephone' | 'Email' | 'Letter' | 'Portal';

export interface Interaction {
  id: string;
  policyId: string;
  channel: Channel;
  subject: string;
  agent: string;
  at: string;
  outcome: 'Resolved' | 'Service request created' | 'Follow-up required' | 'Transferred';
  summary: string;
}
const g = gen(1207);
const SUBJECTS = ['Cash value inquiry', 'Beneficiary change question', 'Premium due date', 'Address update', 'Statement copy request', 'Loan availability', 'Death claim status', 'Withdrawal options', 'Tax form question', 'Portal login help'];
const OUTCOMES: Interaction['outcome'][] = ['Resolved', 'Resolved', 'Service request created', 'Follow-up required', 'Resolved', 'Transferred'];
const CSR = ['Aisha Coleman', 'Priya Raman', 'Daniel Brooks', 'Virtual assistant'];
export const INTERACTIONS: Interaction[] = Array.from({ length: 18 }, (_, i) => {
  const channel = (['Telephone', 'Chat', 'Email', 'Telephone', 'Portal', 'Letter'] as Channel[])[i % 6];
  const subject = SUBJECTS[i % SUBJECTS.length];
  return {
    id: `INT-${940100 + i * 3}`,
    policyId: POLICIES[(i * 3 + 4) % POLICIES.length].id,
    channel,
    subject,
    agent: channel === 'Chat' && i % 2 ? 'Virtual assistant' : g.pick(CSR.slice(0, 3)),
    at: isoAgo(i * 47 + g.int(5, 40)),
    outcome: OUTCOMES[i % OUTCOMES.length],
    summary: `Customer contacted us about ${subject.toLowerCase()}. Identity verified with two factors. ${OUTCOMES[i % OUTCOMES.length] === 'Resolved' ? 'Information provided and confirmed.' : 'Further action routed to the servicing queue.'}`,
  };
});

export interface ServiceCase {
  id: string;
  policyId: string;
  type: string;
  opened: string;
  channel: Channel;
  queue: string;
  status: 'Open' | 'In Progress' | 'Awaiting Customer' | 'Resolved';
}
export const SERVICE_CASES: ServiceCase[] = Array.from({ length: 12 }, (_, i) => ({
  id: `SRV-${31500 + i * 4}`,
  policyId: POLICIES[(i * 5 + 6) % POLICIES.length].id,
  type: ['Address change', 'Duplicate statement', 'Beneficiary inquiry', 'Payment method change', 'Complaint', 'Loan request'][i % 6],
  opened: isoDay(-g.int(0, 12)),
  channel: (['Telephone', 'Portal', 'Email', 'Chat'] as Channel[])[i % 4],
  queue: ['Policy Servicing', 'Billing', 'Policy Servicing', 'Billing', 'Complaints', 'Financial Transactions'][i % 6],
  status: (['Open', 'In Progress', 'Awaiting Customer', 'Resolved'] as ServiceCase['status'][])[i % 4],
}));

export const CHANNEL_VOLUME = [
  { channel: 'Telephone', today: 412, sla: 91 },
  { channel: 'Chat', today: 268, sla: 97 },
  { channel: 'Email', today: 184, sla: 88 },
  { channel: 'Portal', today: 351, sla: 99 },
  { channel: 'Letter', today: 46, sla: 94 },
];

/* ---------------- Statements & correspondence ---------------- */
export interface Statement {
  id: string;
  policyId: string;
  period: string;
  kind: 'Annual statement' | 'Quarterly statement' | 'Transaction confirmation' | 'Tax statement';
  delivery: 'Digital portal' | 'Print & mail' | 'Email';
  generated: string;
  status: 'Delivered' | 'Generating' | 'Queued' | 'Failed' | 'Returned';
}
export const STATEMENTS: Statement[] = POLICIES.slice(0, 22).map((p, i) => ({
  id: `STM-${66010 + i * 3}`,
  policyId: p.id,
  period: i % 3 === 0 ? 'Q3 2026' : '2025 annual',
  kind: i % 3 === 0 ? 'Quarterly statement' : i % 7 === 2 ? 'Tax statement' : i % 5 === 1 ? 'Transaction confirmation' : 'Annual statement',
  delivery: i % 3 === 0 ? 'Digital portal' : i % 2 ? 'Print & mail' : 'Email',
  generated: isoDay(-g.int(1, 40)),
  status: i === 4 ? 'Failed' : i === 9 ? 'Returned' : i === 13 ? 'Generating' : i === 17 ? 'Queued' : 'Delivered',
}));

export interface Letter {
  id: string;
  policyId: string;
  template: string;
  trigger: string;
  status: 'Queued' | 'Generated' | 'Sent to mailhouse' | 'Delivered' | 'Failed';
  created: string;
}
export const LETTERS: Letter[] = [
  { id: 'LTR-9021', policyId: POLICIES[3].id, template: 'Grace period notice', trigger: 'Premium unpaid 31 days', status: 'Queued', created: isoDay(0) },
  { id: 'LTR-9018', policyId: POLICIES[12].id, template: 'Beneficiary change confirmation', trigger: 'Change completed', status: 'Sent to mailhouse', created: isoDay(-1) },
  { id: 'LTR-9015', policyId: POLICIES[16].id, template: 'Claim requirements letter', trigger: 'Death claim registered', status: 'Delivered', created: isoDay(-3) },
  { id: 'LTR-9011', policyId: POLICIES[21].id, template: 'Withdrawal confirmation', trigger: 'Payment released', status: 'Failed', created: isoDay(-2) },
  { id: 'LTR-9007', policyId: POLICIES[29].id, template: 'Annual privacy notice', trigger: 'Scheduled', status: 'Generated', created: isoDay(-4) },
];

export const STATEMENT_CONFIG = [
  { product: 'Universal Life', frequency: 'Quarterly', channel: 'Portal first, print fallback', template: 'UL-STMT-v7' },
  { product: 'Whole Life', frequency: 'Annual', channel: 'Print & mail', template: 'WL-STMT-v5' },
  { product: 'Fixed Annuity', frequency: 'Quarterly', channel: 'Portal first', template: 'FA-STMT-v3' },
  { product: 'Term Life', frequency: 'Annual', channel: 'Email', template: 'TL-NOTICE-v2' },
];
