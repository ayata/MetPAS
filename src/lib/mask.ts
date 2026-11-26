/* Masking for sensitive values. Synthetic only — full SSNs, passwords and card codes never exist in the data. */

export type MaskKind = 'ssn' | 'email' | 'phone' | 'address' | 'dob' | 'account' | 'name' | 'text' | 'amount';

const B = '•';

export function maskValue(kind: MaskKind, value: string): string {
  switch (kind) {
    case 'ssn':
      return `${B.repeat(3)}-${B.repeat(2)}-${value.slice(-4)}`;
    case 'email': {
      const [u, d] = value.split('@');
      return `${u?.[0] ?? ''}${B.repeat(3)}@${d ?? ''}`;
    }
    case 'phone':
      return `(${B.repeat(3)}) ${B.repeat(3)}-${value.slice(-4)}`;
    case 'address': {
      const parts = value.split(', ');
      return `${B.repeat(4)}, ${parts.slice(1).join(', ')}`;
    }
    case 'dob':
      return `${B.repeat(2)}/${B.repeat(2)}/${value.slice(0, 4)}`;
    case 'account':
      return `${B.repeat(4)}${value.slice(-4)}`;
    case 'name': {
      const [f, ...rest] = value.split(' ');
      return `${f} ${rest.map((x) => `${x[0]}.`).join(' ')}`;
    }
    case 'amount':
      return `$${B.repeat(3)},${B.repeat(3)}`;
    default:
      return `${B.repeat(8)}`;
  }
}

/** Synthetic full SSN for users with full PII access — always in the never-issued 9xx range. */
export const syntheticSsn = (last4: string) => `9${last4.slice(0, 2)}-${last4.slice(2)}-${last4}`;
