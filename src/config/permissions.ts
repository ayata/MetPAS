import type { GroupId } from './groups';
import type { Tier } from './tiers';
import { MODULE_CATALOG, type ModuleId } from './modules';

export type { ModuleId } from './modules';

export type Level = 'view' | 'create' | 'edit' | 'approve' | 'configure' | 'admin';
export const LEVELS: { id: Level; label: string; short: string }[] = [
  { id: 'view', label: 'View', short: 'V' },
  { id: 'create', label: 'Create', short: 'C' },
  { id: 'edit', label: 'Edit', short: 'E' },
  { id: 'approve', label: 'Approve / Reject', short: 'A' },
  { id: 'configure', label: 'Configure', short: 'Cf' },
  { id: 'admin', label: 'Administrative', short: 'Ad' },
];

export const MODULES = MODULE_CATALOG.map((m) => ({ id: m.id, name: m.name, description: m.description, area: m.area }));

export interface GroupGrant {
  modules: Record<ModuleId, Level[]>;
  /** Internal business-criticality grants. Retained for future configuration; never shown in the UI. */
  tiers: Record<Tier, Level[]>;
}
export type PermissionMatrix = Record<GroupId, GroupGrant>;

/** Compact grant codes: v view · c create · e edit · a approve · g configure · x administrative */
const CODE: Record<string, Level> = { v: 'view', c: 'create', e: 'edit', a: 'approve', g: 'configure', x: 'admin' };
const lv = (code: string): Level[] => code.split('').map((k) => CODE[k]).filter(Boolean);

function grants(spec: Partial<Record<ModuleId, string>>): Record<ModuleId, Level[]> {
  return Object.fromEntries(MODULE_CATALOG.map((m) => [m.id, lv(spec[m.id] ?? '')])) as Record<ModuleId, Level[]>;
}

const all: Level[] = ['view', 'create', 'edit', 'approve'];
const vce: Level[] = ['view', 'create', 'edit'];

export const DEFAULT_MATRIX: PermissionMatrix = {
  G1: {
    modules: grants({
      work: 'vcea', 'policy-master': 'vcea', 'policy-changes': 'vcea', riders: 'v',
      'death-claims': 'vc', withdrawals: 'vc', 'benefit-calcs': 'v',
      billing: 'v', 'calc-engines': 'v', underwriting: 'vc',
      'customer-service': 'vcea', statements: 'vce', 'self-service': 'v',
      'tax-compliance': 'v', workflow: 'v', 'data-extracts': 'vc', routing: 'v', permissions: 'v',
    }),
    tiers: { 1: all, 2: all, 3: vce },
  },
  G2: {
    modules: grants({
      work: 'vcea', 'policy-master': 'v', 'policy-changes': 'v', riders: 'v',
      'death-claims': 'vcea', withdrawals: 'vcea', 'benefit-calcs': 'vce',
      billing: 'vcea', 'finance-recon': 'vcea', reinsurance: 'v', commissions: 'vcea',
      'calc-engines': 'v', underwriting: 'v', 'customer-service': 'v', statements: 'v',
      'tax-compliance': 'v', regulatory: 'v', workflow: 'v', 'data-extracts': 'vc', 'data-feeds': 'v', routing: 'v', permissions: 'v',
    }),
    tiers: { 1: all, 2: all, 3: vce },
  },
  G3: {
    modules: grants({
      work: 'vcea', 'policy-master': 'v', 'policy-changes': 'v', riders: 'vceag',
      'death-claims': 'v', withdrawals: 'v', 'benefit-calcs': 'vceag',
      billing: 'v', 'finance-recon': 'vcea', reinsurance: 'vceag', commissions: 'v',
      'calc-engines': 'vceag', valuation: 'vceag', pricing: 'vceag', underwriting: 'vcea',
      'tax-compliance': 'vce', regulatory: 'vce', workflow: 'v', audit: 'v',
      'data-extracts': 'vce', 'data-feeds': 'v', permissions: 'v',
    }),
    tiers: { 1: all, 2: all, 3: all },
  },
  G4: {
    modules: grants({
      work: 'vcea', 'policy-master': 'va', 'policy-changes': 'va', riders: 'v',
      'death-claims': 'va', withdrawals: 'va', 'benefit-calcs': 'v',
      billing: 'va', 'finance-recon': 'va', reinsurance: 'va', commissions: 'va',
      'calc-engines': 'v', valuation: 'v', pricing: 'va', underwriting: 'va',
      'customer-service': 'va', statements: 'v', 'self-service': 'v',
      'tax-compliance': 'vcea', regulatory: 'vcea', workflow: 'vceag', audit: 'vcea',
      'data-extracts': 'vca', 'data-feeds': 'v', integrations: 'v', routing: 'v', monitoring: 'v', access: 'v', permissions: 'v',
    }),
    tiers: { 1: ['view', 'edit', 'approve'], 2: all, 3: all },
  },
  G5: {
    modules: grants({
      work: 'vcea', 'policy-master': 'v', riders: 'v', 'finance-recon': 'v', 'calc-engines': 'v',
      statements: 'vceag', 'self-service': 'vg', workflow: 'vceagx', audit: 'v',
      'data-extracts': 'vceagx', 'data-feeds': 'vceagx', integrations: 'vceagx', routing: 'vceagx', monitoring: 'vceagx',
      access: 'vceagx', permissions: 'vegx',
    }),
    tiers: { 1: ['view', 'edit', 'approve'], 2: all, 3: all },
  },
  G6: {
    modules: grants({ work: 'vc', 'policy-master': 'v', 'self-service': 'vc', statements: 'v', commissions: 'v' }),
    tiers: { 1: ['view', 'create'], 2: ['view', 'create'], 3: ['view'] },
  },
};
