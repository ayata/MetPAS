import type { GroupId } from './groups';

/**
 * Restricted-information categories. Access to a business module never implies access to these:
 * each category is granted separately per user group (Hidden / Masked / Full) and is capped by the
 * user's permission profile.
 */
export type DataCat =
  | 'pii' | 'minor' | 'legal' | 'medical' | 'aml' | 'formulas' | 'commercial' | 'regulatory' | 'financial' | 'config' | 'security';

export type DataLevel = 'hidden' | 'masked' | 'full';

export interface DataCategoryDef {
  id: DataCat;
  name: string;
  description: string;
  fields: string[];
}

export const DATA_CATEGORIES: DataCategoryDef[] = [
  { id: 'pii', name: 'Sensitive PII', description: 'Tax IDs, dates of birth, contact and bank details', fields: ['Tax ID / SSN', 'Date of birth', 'Email address', 'Phone number', 'Mailing address', 'Bank account number', 'Beneficiary contact details'] },
  { id: 'minor', name: 'Minor beneficiary information', description: 'Identity and guardianship details of underage beneficiaries', fields: ['Minor beneficiary name', 'Minor date of birth', 'Guardian / custodian details', 'UTMA account details'] },
  { id: 'legal', name: 'Legal disputes & investigations', description: 'Beneficiary disputes, estate matters and legal records', fields: ['Dispute notes', 'Legal counsel correspondence', 'Investigation records', 'Disputed estate details', 'Sensitive family disputes'] },
  { id: 'medical', name: 'Medical, financial & tax records', description: 'Underwriting evidence and personal financial records', fields: ['Medical history', 'Attending physician statements', 'Personal financial statements', 'Tax returns'] },
  { id: 'aml', name: 'AML & sanctions details', description: 'AML investigations, sanctions and PEP screening detail', fields: ['AML case notes', 'Sanctions match details', 'PEP screening results', 'Suspicious activity references'] },
  { id: 'formulas', name: 'Formulas, assumptions & methodologies', description: 'Internal calculations, actuarial assumptions and pricing methods', fields: ['Calculation formulas', 'Actuarial assumptions', 'Pricing methodologies', 'Pricing sensitivities', 'Rate and reference tables', 'Internal product rules', 'Underwriting methodology'] },
  { id: 'commercial', name: 'Commercial agreements', description: 'Reinsurance treaties, agent and dealer agreements', fields: ['Reinsurance treaty terms', 'Reinsurance rates', 'Agent commission agreements', 'Dealer group contracts'] },
  { id: 'regulatory', name: 'Regulatory assessments', description: 'Regulator examinations and internal assessments', fields: ['Regulatory assessments', 'Examination findings', 'Remediation plans'] },
  { id: 'financial', name: 'Detailed financial calculations & controls', description: 'Financial workings, collection rules and control testing detail', fields: ['GL reconciliation workings', 'Collection calculations', 'Waiver & discount rules', 'Control test workpapers'] },
  { id: 'config', name: 'Workflow, routing & system configuration', description: 'Workflow, routing, statement and integration settings', fields: ['Workflow configuration', 'Routing & assignment rules', 'Statement configuration', 'Integration settings', 'Calculation model configuration'] },
  { id: 'security', name: 'Sensitive security & monitoring information', description: 'Security logs and administrative monitoring controls', fields: ['Security event logs', 'Administrative monitoring controls', 'Session identifiers'] },
];

/** Never displayed to anyone, under any profile. These values do not exist in the synthetic data. */
export const NEVER_DISPLAYED = ['Passwords', 'Authentication secrets & tokens', 'Payment card security codes (CVV)'];

export const dataCategoryById = (id: DataCat) => DATA_CATEGORIES.find((d) => d.id === id)!;

export type DataMatrix = Record<GroupId, Record<DataCat, DataLevel>>;

const row = (full: DataCat[], masked: DataCat[]): Record<DataCat, DataLevel> =>
  Object.fromEntries(DATA_CATEGORIES.map((d) => [d.id, full.includes(d.id) ? 'full' : masked.includes(d.id) ? 'masked' : 'hidden'])) as Record<DataCat, DataLevel>;

export const DEFAULT_DATA_MATRIX: DataMatrix = {
  G1: row([], ['pii']),
  G2: row(['pii', 'minor', 'financial'], ['legal', 'medical', 'formulas', 'commercial']),
  G3: row(['formulas', 'commercial', 'financial'], ['pii', 'medical', 'regulatory', 'config']),
  G4: row(['pii', 'minor', 'legal', 'medical', 'aml', 'commercial', 'regulatory', 'financial'], ['formulas', 'config', 'security']),
  G5: row(['config', 'security'], ['pii']),
  G6: row([], ['pii']),
};

export const DATA_LEVELS: { id: DataLevel; label: string }[] = [
  { id: 'hidden', label: 'Hidden' },
  { id: 'masked', label: 'Masked' },
  { id: 'full', label: 'Full' },
];
