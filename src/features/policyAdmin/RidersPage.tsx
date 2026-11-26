import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Minus, Pencil } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { RIDER_CATALOG, RIDER_RULE_CHANGES, type PolicyRider } from '../../data/product';
import { allEffectiveRiders, riderHasAmount } from '../../data/policyChanges';
import { useChangeRequests } from './PolicyChangesPage';
import { policyById } from '../../data/policies';
import { date, money } from '../../lib/format';
import { Drawer } from '../../components/ui';
import { DataTable, GatedButton, KV, ModulePage, PolicyLink, RestrictedSection, Status, TabPanel, Toolbar, useTabParam } from '../../components/module';

type Tab = 'policy-riders' | 'catalog' | 'rules' | 'reference';

export function RidersPage() {
  const store = useStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [tab, setTab] = useTabParam<Tab>('policy-riders');
  const [q, setQ] = useState(params.get('policy') ?? '');
  const [status, setStatus] = useState('');
  const [rider, setRider] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const requests = useChangeRequests();
  const POLICY_RIDERS = useMemo(() => allEffectiveRiders(requests), [requests]);
  const rows = useMemo(() => POLICY_RIDERS.filter((r) => {
    const t = q.toLowerCase();
    return (!t || `${r.policyId} ${r.rider.name} ${policyById(r.policyId)?.owner.name}`.toLowerCase().includes(t)) && (!status || r.status === status) && (!rider || r.rider.id === rider);
  }), [POLICY_RIDERS, q, status, rider]);
  const selected = POLICY_RIDERS.find((r) => r.id === sel);
  const count = (s: PolicyRider['status']) => POLICY_RIDERS.filter((r) => r.status === s).length;

  return (
    <ModulePage
      module="riders"
      lead="Rider details, eligibility, conditions and status across the policy book. Internal product rules are restricted."
      kpis={[
        { label: 'Active riders', value: count('Active'), onClick: () => setStatus('Active') },
        { label: 'Pending', value: count('Pending'), onClick: () => setStatus('Pending') },
        { label: 'Expiring in 90 days', value: count('Expiring'), tone: 'warning', onClick: () => setStatus('Expiring') },
        { label: 'Rider products', value: RIDER_CATALOG.length, sub: 'In the catalog', onClick: () => setTab('catalog') },
      ]}
    >
      <TabPanel<Tab> label="Rider sections" value={tab} onChange={setTab} tabs={[{ id: 'policy-riders', label: 'Riders on policies', count: POLICY_RIDERS.length }, { id: 'catalog', label: 'Rider catalog' }, { id: 'rules', label: 'Product rules & changes' }, { id: 'reference', label: 'Research & reference tables' }]}>
        {tab === 'policy-riders' && (
          <>
            <Toolbar search={q} onSearch={setQ} placeholder="Search policy, owner or rider" count={`${rows.length} riders`}
              filters={[
                { label: 'All statuses', value: status, onChange: setStatus, options: ['Active', 'Pending', 'Expiring', 'Terminated'] },
                { label: 'All riders', value: rider, onChange: setRider, options: RIDER_CATALOG.map((r) => ({ value: r.id, label: r.name })) },
              ]} />
            <DataTable rows={rows} rowKey={(r) => r.id} onRow={(r) => setSel(r.id)} selected={sel} label="Policy riders"
              cols={[
                { key: 'r', label: 'Rider', render: (r) => <><div className="primary-cell">{r.rider.name}</div><div className="id-cell">{r.id}</div></> },
                { key: 'p', label: 'Policy', render: (r) => <><PolicyLink id={r.policyId} /><div className="id-cell">{policyById(r.policyId)?.owner.name}</div></> },
                { key: 'd', label: 'Duration', className: 'hide-md', render: (r) => <span className="small">{r.rider.duration}<div className="id-cell">Expires {r.expires === '—' ? '—' : date(r.expires)}</div></span> },
                { key: 'b', label: 'Benefit', className: 'num hide-md', render: (r) => (riderHasAmount(r.rider) ? money(r.benefit) : 'Included') },
                { key: 'pr', label: 'Annual premium', className: 'num hide-md', render: (r) => money(r.annualPremium) },
                { key: 's', label: 'Status', render: (r) => r.pending ? <Status s={r.pending.kind === 'add' ? 'Addition pending' : r.pending.kind === 'delete' ? 'Removal pending' : 'Change pending'} /> : <Status s={r.status === 'Terminated' ? 'Removed' : r.status} /> },
              ]} />
          </>
        )}
        {tab === 'catalog' && (
          <DataTable rows={RIDER_CATALOG} rowKey={(r) => r.id} label="Rider catalog"
            cols={[
              { key: 'n', label: 'Rider', render: (r) => <><div className="primary-cell">{r.name}</div><div className="small muted">{r.benefit}</div></> },
              { key: 'e', label: 'Eligibility', className: 'hide-md', render: (r) => <span className="small">{r.eligibility}</span> },
              { key: 't', label: 'Duration & timeframe', render: (r) => <span className="small">{r.duration}<div className="id-cell">{r.timeframe}</div></span> },
              { key: 'o', label: 'Offset rule', className: 'hide-md', render: (r) => <span className="small muted">{r.offset}</span> },
              { key: 'p', label: 'Premium condition', render: (r) => <span className="small">{r.premium}</span> },
            ]} />
        )}
        {tab === 'rules' && (
          <div className="stack gap-3" style={{ padding: 'var(--s5)' }}>
            <h3>Rule change history</h3>
            <div style={{ margin: '0 calc(-1 * var(--s5))' }}>
              <DataTable rows={RIDER_RULE_CHANGES} rowKey={(r) => r.id}
                cols={[
                  { key: 'i', label: 'Change', render: (r) => <><div className="primary-cell">{r.change}</div><div className="id-cell">{r.id} · {r.rider}</div></> },
                  { key: 'e', label: 'Effective', render: (r) => <span className="small">{date(r.effective)}</span> },
                  { key: 's', label: 'Status', render: (r) => <Status s={store.statusOf(r.id, r.status)} /> },
                  { key: 'a', label: '', className: 'num', render: (r) => store.statusOf(r.id, r.status) === 'Pending Approval' ? <GatedButton module="riders" level="approve" onClick={() => store.setRecordStatus(r.id, 'Approved', { target: `Rider rule ${r.id}`, module: 'riders', message: 'Rider rule change approved' })}>Approve</GatedButton> : null },
                ]} />
            </div>
            <RestrictedSection cat="formulas" title="Internal rider product rules" summary="Operators see rider eligibility, conditions and status. Underlying product rules and calculation methods are restricted.">
              <KV items={[['WOP disability definition', 'Own occupation 24 months, then any occupation'], ['ADB benefit formula', 'min(face, 1,000,000) × 1.0 if death ≤ 90 days'], ['LTC monthly benefit', 'min(2% × face, HIPAA per-diem × 30)'], ['ABR discount', 'advance × (1 − 0.06)^(LE in years) − $250 fee']]} />
            </RestrictedSection>
          </div>
        )}
        {tab === 'reference' && (
          <div className="stack gap-3" style={{ padding: 'var(--s5)' }}>
            <RestrictedSection cat="formulas" title="Rider premium reference table (per $1,000)" summary="Rate tables and supporting research are maintained by Product & Actuarial.">
              <DataTable rows={[['18–29', 0.42, 0.55, 0.06], ['30–39', 0.58, 0.71, 0.07], ['40–49', 0.94, 1.12, 0.09], ['50–59', 1.71, 2.04, 0.12], ['60–65', 2.95, 3.40, 0.15]] as [string, number, number, number][]} rowKey={(r) => r[0]}
                cols={[{ key: 'a', label: 'Issue age band', render: (r) => r[0] }, { key: 'w', label: 'WOP', className: 'num', render: (r) => r[1].toFixed(2) }, { key: 'd', label: 'ADB', className: 'num', render: (r) => r[2].toFixed(2) }, { key: 'c', label: 'Child term', className: 'num', render: (r) => r[3].toFixed(2) }]} />
            </RestrictedSection>
            <RestrictedSection cat="formulas" title="Supporting research" summary="Experience studies supporting rider pricing.">
              <ul className="small" style={{ margin: 0, paddingLeft: 18 }}><li>Disability incidence study 2021–2025 (synthetic)</li><li>Accidental death experience by age band</li><li>LTC claim cost curves, industry benchmark</li></ul>
            </RestrictedSection>
          </div>
        )}
      </TabPanel>

      {selected && (
        <Drawer label={`Rider ${selected.id}`} onClose={() => setSel(null)}
          header={<div className="stack gap-1"><div className="xs subtle mono">{selected.id} · Policy Riders</div><h2 style={{ fontSize: 18 }}>{selected.rider.name}</h2></div>}
          footer={selected.status === 'Terminated' || selected.pending ? <span className="small muted">{selected.pending ? `Change ${selected.pending.requestId} is in progress for this rider.` : 'This rider has been removed from the policy.'}</span> : <div className="row wrap">
            <GatedButton module="policy-changes" level="create" className="btn btn-primary btn-sm" disabled={!riderHasAmount(selected.rider)} onClick={() => navigate(`/policy-changes?new=1&policy=${selected.policyId}&type=rider-modify`)}><Pencil size={13} />Modify rider</GatedButton>
            <GatedButton module="policy-changes" level="create" className="btn btn-danger btn-sm" onClick={() => navigate(`/policy-changes?new=1&policy=${selected.policyId}&type=rider-delete`)}><Minus size={14} />Delete rider</GatedButton>
          </div>}>
          <KV two items={[['Policy', <PolicyLink id={selected.policyId} />], ['Status', <Status s={selected.status} />], ['Benefit', riderHasAmount(selected.rider) ? money(selected.benefit) : 'Included'], ['Annual premium', money(selected.annualPremium)], ['Issued', date(selected.issued)], ['Expires', selected.expires === '—' ? '—' : date(selected.expires)]]} />
          <section className="stack"><h3>Eligibility</h3><p className="small">{selected.rider.eligibility}</p></section>
          <KV items={[['Benefit conditions', selected.rider.benefit], ['Duration', selected.rider.duration], ['Timeframe', selected.rider.timeframe], ['Offset rule', selected.rider.offset], ['Premium condition', selected.rider.premium]]} />
          <RestrictedSection cat="formulas" title="Rider calculation methodology" target={selected.id} summary="Rider charges shown are outputs only.">
            <p className="small mono">riderCharge = benefit / 1000 × rate(issueAgeBand) × modalFactor</p>
          </RestrictedSection>
        </Drawer>
      )}
    </ModulePage>
  );
}
