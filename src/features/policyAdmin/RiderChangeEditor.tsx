import { Minus, Pencil, Plus } from 'lucide-react';
import type { Policy } from '../../data/policies';
import { RIDER_CATALOG } from '../../data/product';
import { riderDefault, riderHasAmount, ridersForProduct, isLiveRider, type EffectiveRider, type RiderChangeItem } from '../../data/policyChanges';
import { money } from '../../lib/format';
import { Notice } from '../../components/ui';

type Mode = 'rider-add' | 'rider-delete' | 'rider-modify';

const toNum = (v: string) => Number(v.replace(/[^0-9]/g, '')) || 0;

/** Lets the operator pick which riders to add, delete or modify on the selected policy. */
export function RiderChangeEditor({ mode, policy, riders, items, onChange }: {
  mode: Mode;
  policy: Policy;
  /** Current riders on the policy (after earlier approved changes). */
  riders: EffectiveRider[];
  items: RiderChangeItem[];
  onChange: (items: RiderChangeItem[]) => void;
}) {
  const live = riders.filter(isLiveRider);
  const busy = (r: EffectiveRider) => !!r.pending;
  const picked = (key: string) => items.find((i) => (mode === 'rider-add' ? i.catalogId === key : i.riderId === key));
  const toggle = (item: RiderChangeItem, key: string) => onChange(picked(key) ? items.filter((i) => i !== picked(key)) : [...items, item]);
  const setBenefit = (key: string, benefit: number) => onChange(items.map((i) => (i === picked(key) ? { ...i, benefit } : i)));

  const current = (
    <div className="rider-current">
      <span className="field-label">Current riders on {policy.id}</span>
      {live.length ? (
        <div className="row wrap" style={{ gap: 6 }}>
          {live.map((r) => <span key={r.id} className="chip">{r.rider.name}{riderHasAmount(r.rider) ? ` · ${money(r.benefit)}` : ''}</span>)}
        </div>
      ) : <span className="small muted">No riders on this policy yet.</span>}
    </div>
  );

  if (mode === 'rider-add') {
    const options = ridersForProduct(policy);
    const onPolicy = new Set(riders.filter((r) => r.status !== 'Terminated').map((r) => r.rider.id));
    return (
      <div className="stack gap-3">
        {current}
        <span className="field-label">Select the riders to add</span>
        {!options.length && <Notice tone="warning">{policy.product} does not offer riders.</Notice>}
        <div className="rider-pick">
          {options.map((d) => {
            const sel = picked(d.id);
            const taken = onPolicy.has(d.id);
            return (
              <div key={d.id} className={`rider-opt ${sel ? 'on add' : ''} ${taken ? 'disabled' : ''}`}>
                <label className="check grow">
                  <input type="checkbox" disabled={taken} checked={!!sel} onChange={() => toggle({ catalogId: d.id, benefit: riderDefault(d, policy) }, d.id)} />
                  <span>
                    <span className="strong" style={{ display: 'block' }}>{d.name}</span>
                    <span className="xs subtle">{taken ? 'Already on this policy' : `${d.benefit} · ${d.premium}`}</span>
                  </span>
                </label>
                {sel && (riderHasAmount(d)
                  ? <BenefitInput value={sel.benefit} onChange={(n) => setBenefit(d.id, n)} label={`${d.name} benefit amount`} />
                  : <span className="chip blue">Included</span>)}
                {sel && <span className="rider-tag add"><Plus size={12} />Add</span>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="stack gap-3">
      <span className="field-label">{mode === 'rider-delete' ? 'Select the riders to delete' : 'Select the riders to modify and enter the new benefit amount'}</span>
      {!live.length && <Notice tone="warning">This policy has no active riders to {mode === 'rider-delete' ? 'delete' : 'modify'}.</Notice>}
      <div className="rider-pick">
        {live.map((r) => {
          const sel = picked(r.id);
          const fixed = mode === 'rider-modify' && !riderHasAmount(r.rider);
          const disabled = busy(r) || fixed;
          return (
            <div key={r.id} className={`rider-opt ${sel ? `on ${mode === 'rider-delete' ? 'del' : 'mod'}` : ''} ${disabled ? 'disabled' : ''}`}>
              <label className="check grow">
                <input type="checkbox" disabled={disabled} checked={!!sel}
                  onChange={() => toggle(mode === 'rider-delete'
                    ? { catalogId: r.rider.id, riderId: r.id, benefit: r.benefit }
                    : { catalogId: r.rider.id, riderId: r.id, previousBenefit: r.benefit, benefit: r.benefit }, r.id)} />
                <span>
                  <span className="strong" style={{ display: 'block' }}>{r.rider.name}</span>
                  <span className="xs subtle">
                    {busy(r) ? `Change already in progress (${r.pending!.requestId})`
                      : fixed ? 'No benefit amount to modify'
                      : `${riderHasAmount(r.rider) ? money(r.benefit) : 'Included'} · ${money(r.annualPremium)}/yr · ${r.id}`}
                  </span>
                </span>
              </label>
              {sel && mode === 'rider-modify' && <BenefitInput value={sel.benefit} onChange={(n) => setBenefit(r.id, n)} label={`New ${r.rider.name} benefit amount`} />}
              {sel && (mode === 'rider-delete' ? <span className="rider-tag del"><Minus size={12} />Delete</span> : <span className="rider-tag mod"><Pencil size={11} />Modify</span>)}
            </div>
          );
        })}
      </div>
      {mode === 'rider-delete' && items.length > 0 && items.length === live.length && <Notice tone="warning">All riders will be removed. The base coverage stays in force.</Notice>}
    </div>
  );
}

function BenefitInput({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="input-icon rider-amount">
      <span className="rider-cur" aria-hidden>$</span>
      <input className="input" aria-label={label} inputMode="numeric" value={value ? value.toLocaleString('en-US') : ''} placeholder="0" onChange={(e) => onChange(toNum(e.target.value))} />
    </div>
  );
}

/** Short summary used in task descriptions and lists. */
export function riderSummary(mode: string, items: RiderChangeItem[]) {
  const name = (id: string) => RIDER_CATALOG.find((d) => d.id === id)?.name.replace(' Rider', '') ?? id;
  const verb = mode === 'rider-add' ? 'Add' : mode === 'rider-delete' ? 'Delete' : 'Modify';
  return `${verb}: ${items.map((i) => name(i.catalogId)).join(', ')}`;
}

/** Validation for the wizard's first step. */
export function riderItemsValid(mode: string, items: RiderChangeItem[]) {
  if (!items.length) return false;
  if (mode === 'rider-delete') return true;
  return items.every((i) => {
    const d = RIDER_CATALOG.find((x) => x.id === i.catalogId);
    if (!d || !riderHasAmount(d)) return mode === 'rider-add';
    return i.benefit > 0 && (mode === 'rider-add' || i.benefit !== i.previousBenefit);
  });
}
