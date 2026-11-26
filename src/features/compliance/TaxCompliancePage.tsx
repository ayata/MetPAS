import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useStore, type Rec } from '../../store/AppStore';
import { COMPLIANCE_CHECKS, STATE_RULES, TAX_CLASSIFICATIONS, type ComplianceCheck } from '../../data/compliance';
import { POLICIES, policyById } from '../../data/policies';
import { date } from '../../lib/format';
import { Modal } from '../../components/ui';
import { AccessNote, DataTable, GatedButton, KV, ModulePage, PolicyLink, RestrictedSection, Sensitive, Status, TabPanel, Toolbar, useTabParam } from '../../components/module';

type Tab = 'checks' | 'tax' | 'jurisdictions' | 'missing' | 'aml';

export function TaxCompliancePage() {
  const store = useStore();
  const [tab, setTab] = useTabParam<Tab>('checks');
  const [status, setStatus] = useState('');
  const [initiate, setInitiate] = useState(false);
  const checks = [...store.recordsOf<ComplianceCheck & Rec>('compliance-checks'), ...COMPLIANCE_CHECKS].map((c) => ({ ...c, status: store.statusOf(c.id, c.status) as ComplianceCheck['status'] }));
  const rows = checks.filter((c) => !status || c.status === status);
  const missing = [...checks.filter((c) => c.status === 'Missing Information').map((c) => ({ id: c.id, policyId: c.policyId, item: c.check })), ...TAX_CLASSIFICATIONS.filter((t) => t.status === 'Missing Information').map((t) => ({ id: `TAX-${t.policyId}`, policyId: t.policyId, item: 'Tax certification (W-9)' }))];
  const set = (c: ComplianceCheck, s: ComplianceCheck['status'], m: string) => store.setRecordStatus(c.id, s, { target: `${c.check} · ${c.id}`, module: 'tax-compliance', message: m });

  return (
    <ModulePage
      module="tax-compliance"
      lead="Tax classification, AML, sanctions and PEP screening, jurisdiction rules and compliance checks."
      actions={<GatedButton module="tax-compliance" level="create" className="btn btn-primary" onClick={() => setInitiate(true)}><ShieldCheck size={15} />Initiate check</GatedButton>}
      kpis={[
        { label: 'Checks requiring action', value: checks.filter((c) => c.status !== 'Clear').length, tone: 'warning', onClick: () => setStatus('') },
        { label: 'Potential matches', value: checks.filter((c) => c.status === 'Potential match').length, tone: 'critical', onClick: () => setStatus('Potential match') },
        { label: 'Missing information', value: missing.length, onClick: () => setTab('missing') },
        { label: 'Cleared (30 days)', value: checks.filter((c) => c.status === 'Clear').length, tone: 'success', onClick: () => setStatus('Clear') },
      ]}
      notice={<AccessNote module="tax-compliance" />}
    >
      <TabPanel<Tab> label="Tax and compliance sections" value={tab} onChange={setTab} tabs={[{ id: 'checks', label: 'Compliance checks' }, { id: 'tax', label: 'Tax classification' }, { id: 'jurisdictions', label: 'State & federal rules' }, { id: 'missing', label: 'Missing information', count: missing.length }, { id: 'aml', label: 'AML & sanctions detail' }]}>
        {tab === 'checks' && (
          <>
            <Toolbar count={`${rows.length} checks`} filters={[{ label: 'All statuses', value: status, onChange: setStatus, options: ['Clear', 'Potential match', 'Under Review', 'Missing Information', 'Escalated'] }]} />
            <DataTable rows={rows} rowKey={(c) => c.id} label="Compliance checks"
              cols={[
                { key: 'c', label: 'Check', render: (c) => <><div className="primary-cell">{c.check}</div><div className="id-cell">{c.id} · {date(c.raised)}</div></> },
                { key: 'p', label: 'Party', render: (c) => <span className="small"><Sensitive cat="pii" kind="name" value={c.party} /><div className="id-cell"><PolicyLink id={c.policyId} /></div></span> },
                { key: 'j', label: 'Jurisdiction', className: 'hide-md', render: (c) => <span className="small">{c.jurisdiction}</span> },
                { key: 's', label: 'Status', render: (c) => <Status s={c.status} /> },
                { key: 'x', label: '', className: 'num', render: (c) => c.status === 'Clear' ? null : (
                  <span className="row" style={{ justifyContent: 'flex-end', gap: 4 }}>
                    {c.status !== 'Escalated' && <GatedButton module="tax-compliance" level="edit" className="btn btn-ghost btn-sm" onClick={() => { set(c, 'Escalated', 'Exception routed to compliance'); store.createTask({ typeId: 'aml-review', policyId: c.policyId, priority: 'High', description: `${c.check} on ${c.party}: ${c.status}.`, assignToMe: false }, { silent: true }); }}>Route exception</GatedButton>}
                    <GatedButton module="tax-compliance" level="approve" onClick={() => set(c, 'Clear', 'Check cleared')}>Clear</GatedButton>
                  </span>) },
            ]} />
          </>
        )}
        {tab === 'tax' && (
          <div className="stack gap-3">
            <DataTable rows={TAX_CLASSIFICATIONS} rowKey={(t) => t.policyId} label="Tax classification"
              cols={[
                { key: 'p', label: 'Policy', render: (t) => <><PolicyLink id={t.policyId} /><div className="id-cell">{policyById(t.policyId)?.product}</div></> },
                { key: 'q', label: 'Tax qualification', render: (t) => <span className="small">{t.qualification}</span> },
                { key: 'f', label: 'Federal status', className: 'hide-md', render: (t) => <span className="small">{t.federal}</span> },
                { key: 'st', label: 'State', render: (t) => <span className="small">{t.state}</span> },
                { key: 'w', label: 'Withholding', className: 'hide-md', render: (t) => <span className="small">{t.withholding}</span> },
                { key: 's', label: 'Status', render: (t) => <Status s={t.status} /> },
              ]} />
            <div style={{ padding: '0 var(--s5) var(--s5)' }}>
              <RestrictedSection cat="formulas" title="Tax calculation methodology" summary="Tax outcomes are shown; internal calculation methods are restricted.">
                <KV items={[['7702 test', 'Guideline premium test with CVAT fallback'], ['MEC 7-pay test', 'Σ premiums(1..7) ≤ 7-pay limit × years'], ['Taxable gain', 'gross distribution − cost basis (FIFO for non-MEC)']]} />
              </RestrictedSection>
            </div>
          </div>
        )}
        {tab === 'jurisdictions' && (
          <DataTable rows={STATE_RULES} rowKey={(r) => r.state} label="State rules"
            cols={[
              { key: 's', label: 'State', render: (r) => <span className="strong">{r.state}</span> },
              { key: 'r', label: 'State-specific rule', render: (r) => <span className="small">{r.rule}</span> },
              { key: 'o', label: 'Offset rule', render: (r) => <span className="small">{r.offset}</span> },
              { key: 'n', label: 'Required notice', className: 'hide-md', render: (r) => <span className="small muted">{r.notice}</span> },
            ]} />
        )}
        {tab === 'missing' && (
          <DataTable rows={missing} rowKey={(m) => m.id} empty="No missing information" label="Missing information"
            cols={[
              { key: 'i', label: 'Missing item', render: (m) => <><div className="primary-cell">{m.item}</div><div className="id-cell">{m.id}</div></> },
              { key: 'p', label: 'Policy', render: (m) => <PolicyLink id={m.policyId} /> },
              { key: 'x', label: '', className: 'num', render: (m) => <GatedButton module="tax-compliance" level="edit" onClick={() => store.toast(`Request for ${m.item.toLowerCase()} sent to policyholder (synthetic)`)}>Request from customer</GatedButton> },
            ]} />
        )}
        {tab === 'aml' && (
          <div className="stack gap-3" style={{ padding: 'var(--s5)' }}>
            <RestrictedSection cat="aml" title="AML investigation details" summary="Investigation outcomes are summarized on each check. Case details are restricted to compliance.">
              <KV items={[['Case AML-2291', 'Rapid funding and withdrawal pattern on annuity; source of funds documentation requested'], ['Case AML-2287', 'Third-party premium payments from unrelated business account — closed, explained']]} />
            </RestrictedSection>
            <RestrictedSection cat="aml" title="Sanctions & PEP screening details" summary="Screening results show as Clear or Potential match. Match details are restricted.">
              <KV items={[['CMP-73306', 'Name match 87% against consolidated sanctions list; DOB mismatch; pending secondary review'], ['CMP-73318', 'Domestic PEP — former municipal official; enhanced due diligence applied']]} />
            </RestrictedSection>
          </div>
        )}
      </TabPanel>
      {initiate && <InitiateCheck onClose={() => setInitiate(false)} />}
    </ModulePage>
  );
}

function InitiateCheck({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const [policyId, setPolicyId] = useState(POLICIES[0].id);
  const [check, setCheck] = useState<ComplianceCheck['check']>('Sanctions screening');
  return (
    <Modal title="Initiate compliance check" onClose={onClose} footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={() => {
      const p = policyById(policyId)!;
      const id = store.nextId('CMP', 74000);
      store.addRecord('compliance-checks', { id, policyId, party: p.owner.name, check, jurisdiction: `${p.state} · Federal`, raised: new Date().toISOString().slice(0, 10), status: 'Under Review' }, { action: 'Initiated compliance check', target: `${check} · ${id}`, link: '/compliance/tax', module: 'tax-compliance' }, `${id} initiated — screening in progress (simulated)`);
      onClose();
    }}>Initiate</button></>}>
      <div className="field"><label htmlFor="ic-p">Policy</label><select id="ic-p" className="select" value={policyId} onChange={(e) => setPolicyId(e.target.value)}>{POLICIES.map((p) => <option key={p.id} value={p.id}>{p.id} — {p.owner.name}</option>)}</select></div>
      <div className="field"><label htmlFor="ic-c">Check</label><select id="ic-c" className="select" value={check} onChange={(e) => setCheck(e.target.value as ComplianceCheck['check'])}>{['Sanctions screening', 'AML risk rating', 'PEP screening', 'Tax classification (W-9 / FATCA)', 'Source of funds'].map((c) => <option key={c}>{c}</option>)}</select></div>
    </Modal>
  );
}
