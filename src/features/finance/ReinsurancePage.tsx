import { useState } from 'react';
import { Search, Send } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { CESSIONS, TREATIES, type Cession } from '../../data/finance';
import { policyById } from '../../data/policies';
import { money } from '../../lib/format';
import { Drawer } from '../../components/ui';
import { AccessNote, DataTable, GatedButton, Indicative, KV, ModulePage, PolicyLink, RestrictedSection, Status, TabPanel, useTabParam } from '../../components/module';

type Tab = 'cessions' | 'treaties' | 'calculations' | 'approvals' | 'audit';

export function ReinsurancePage() {
  const store = useStore();
  const [tab, setTab] = useTabParam<Tab>('cessions');
  const [sel, setSel] = useState<string | null>(null);
  const cessions = CESSIONS.map((c) => ({ ...c, status: store.statusOf(c.id, c.status) as Cession['status'] }));
  const selected = cessions.find((c) => c.id === sel);
  const pending = cessions.filter((c) => c.status === 'Pending Approval' || c.status === 'Facultative Review');
  const audit = store.state.activity.filter((a) => a.module === 'reinsurance');

  return (
    <ModulePage
      module="reinsurance"
      lead="Reinsured percentages and amounts, treaty terms, cession calculations, approvals and audit."
      kpis={[
        { label: 'Ceded face amount', value: money(cessions.reduce((a, c) => a + c.ceded, 0)), sub: `${cessions.length} policies`, onClick: () => setTab('cessions') },
        { label: 'Annual ceded premium', value: money(cessions.reduce((a, c) => a + c.premium, 0)), onClick: () => setTab('calculations') },
        { label: 'Pending approvals', value: pending.length, tone: pending.length ? 'warning' : 'success', onClick: () => setTab('approvals') },
        { label: 'Treaties in force', value: TREATIES.filter((t) => t.status === 'In force').length, onClick: () => setTab('treaties') },
      ]}
      notice={<AccessNote module="reinsurance" />}
    >
      <TabPanel<Tab> label="Reinsurance sections" value={tab} onChange={setTab} tabs={[{ id: 'cessions', label: 'Cessions' }, { id: 'treaties', label: 'Treaties' }, { id: 'calculations', label: 'Calculations' }, { id: 'approvals', label: 'Approvals', count: pending.length }, { id: 'audit', label: 'Audit & investigations' }]}>
        {tab === 'cessions' && (
          <DataTable rows={cessions} rowKey={(c) => c.id} onRow={(c) => setSel(c.id)} selected={sel} label="Cessions"
            cols={[
              { key: 'i', label: 'Cession', render: (c) => <><div className="primary-cell">{c.id}</div><div className="id-cell">{c.treatyId}</div></> },
              { key: 'p', label: 'Policy', render: (c) => <PolicyLink id={c.policyId} /> },
              { key: 'f', label: 'Face amount', className: 'num hide-md', render: (c) => money(c.face) },
              { key: 'pc', label: 'Reinsured %', className: 'num', render: (c) => `${c.percent}%` },
              { key: 'c', label: 'Reinsured amount', className: 'num', render: (c) => money(c.ceded) },
              { key: 's', label: 'Status', render: (c) => <Status s={c.status} /> },
            ]} />
        )}
        {tab === 'treaties' && (
          <div className="stack gap-3">
            <DataTable rows={TREATIES} rowKey={(t) => t.id} label="Treaties"
              cols={[
                { key: 'n', label: 'Treaty', render: (t) => <><div className="primary-cell">{t.name}</div><div className="id-cell">{t.id} · {t.reinsurer}</div></> },
                { key: 't', label: 'Type', render: (t) => <span className="small">{t.type}</span> },
                { key: 'r', label: 'Retention', className: 'num', render: (t) => (t.retention ? money(t.retention) : '—') },
                { key: 'q', label: 'Quota share', className: 'num', render: (t) => `${t.quotaShare}%` },
                { key: 's', label: 'Status', render: (t) => <Status s={t.status} /> },
              ]} />
            <div style={{ padding: '0 var(--s5) var(--s5)' }} className="stack gap-3">
              <RestrictedSection cat="commercial" title="Commercial agreement terms" summary="Treaty names, types and retention limits are visible. Commercial terms and rates are confidential.">
                <KV items={[['TRT-A12 YRT rates', '68% of 2015 VBT select & ultimate, 20-year rate guarantee'], ['TRT-B07 allowance', 'First-year 100%, renewal 12.5%'], ['TRT-C03 experience refund', '85% of profits above 4% margin'], ['Recapture', 'Allowed after year 15 with 90 days notice']]} />
              </RestrictedSection>
            </div>
          </div>
        )}
        {tab === 'calculations' && (
          <div className="stack gap-3" style={{ padding: 'var(--s5)' }}>
            <div className="row between"><h3>Cession calculation results</h3><Indicative /></div>
            <div style={{ margin: '0 calc(-1 * var(--s5))' }}>
              <DataTable rows={cessions} rowKey={(c) => c.id}
                cols={[
                  { key: 'i', label: 'Cession', render: (c) => <span className="mono">{c.id}</span> },
                  { key: 'r', label: 'Retained', className: 'num', render: (c) => money(c.retained) },
                  { key: 'c', label: 'Ceded', className: 'num', render: (c) => money(c.ceded) },
                  { key: 'p', label: 'Ceded premium (annual)', className: 'num', render: (c) => money(c.premium) },
                ]} />
            </div>
            <RestrictedSection cat="formulas" title="Reinsurance calculation methodology" summary="Calculation outputs are visible. Methodology is restricted to actuarial and reinsurance specialists.">
              <p className="small mono">ceded = max(face − retention, face × quotaShare) · premium = ceded / 1000 × YRTrate(age, class, duration) × 12</p>
            </RestrictedSection>
          </div>
        )}
        {tab === 'approvals' && (
          <DataTable rows={pending} rowKey={(c) => c.id} empty="No cessions awaiting approval" onRow={(c) => setSel(c.id)} label="Cession approvals"
            cols={[
              { key: 'i', label: 'Cession', render: (c) => <><div className="primary-cell">{c.id}</div><div className="id-cell">{c.status === 'Facultative Review' ? 'Over automatic binding limit' : 'Ceded amount change'}</div></> },
              { key: 'p', label: 'Policy', render: (c) => <PolicyLink id={c.policyId} /> },
              { key: 'c', label: 'Ceded', className: 'num', render: (c) => money(c.ceded) },
              { key: 'x', label: '', className: 'num', render: (c) => <GatedButton module="reinsurance" level="approve" onClick={() => store.setRecordStatus(c.id, 'Ceded', { target: `Cession ${c.id}`, module: 'reinsurance', message: 'Cession approved' })}>Approve</GatedButton> },
            ]} />
        )}
        {tab === 'audit' && (
          <div className="stack gap-3" style={{ padding: 'var(--s5)' }}>
            <div className="row between wrap"><p className="small muted">Every reinsurance decision is recorded. Authorized users can open an investigation for review by compliance.</p>
              <GatedButton module="reinsurance" level="create" onClick={() => store.createTask({ typeId: 'reinsurance', policyId: cessions[0].policyId, priority: 'Medium', description: 'Investigation: verify cession amounts against treaty limits for Q3.', assignToMe: true })}><Search size={13} />Open investigation</GatedButton>
            </div>
            <div className="timeline">
              {[...audit.map((a) => ({ t: `${a.action} ${a.target}`, m: a.at })), { t: 'Quarterly bordereau sent to Northbridge Re', m: '' }, { t: 'Facultative offer received for CES-20422', m: '' }].map((e, i) => (
                <div key={i} className="tl-item"><span className="tl-dot" /><div><div className="tl-text">{e.t}</div><div className="tl-meta">{e.m ? new Date(e.m).toLocaleString() : 'Earlier this quarter'}</div></div></div>
              ))}
            </div>
          </div>
        )}
      </TabPanel>

      {selected && (
        <Drawer label={`Cession ${selected.id}`} onClose={() => setSel(null)} header={<div className="stack gap-1"><div className="xs subtle mono">{selected.id} · Reinsurance</div><h2 style={{ fontSize: 18 }}>{policyById(selected.policyId)?.owner.name}</h2></div>}
          footer={selected.status === 'Ceded' ? <GatedButton module="reinsurance" level="create" className="btn btn-secondary btn-sm" onClick={() => store.setRecordStatus(selected.id, 'Pending Approval', { target: `Cession ${selected.id}`, module: 'reinsurance', message: 'Approval request submitted' })}><Send size={14} />Request approval for change</GatedButton> : undefined}>
          <KV two items={[['Policy', <PolicyLink id={selected.policyId} />], ['Treaty', TREATIES.find((t) => t.id === selected.treatyId)?.name], ['Face amount', money(selected.face)], ['Retained', money(selected.retained)], ['Reinsured amount', money(selected.ceded)], ['Reinsured %', `${selected.percent}%`], ['Ceded premium', money(selected.premium)], ['Status', <Status s={selected.status} />]]} />
          <RestrictedSection cat="commercial" title="Treaty terms applied" target={selected.id} summary="Commercial terms are confidential."><p className="small">YRT rate 68% of VBT table, select period 25 years, automatic binding up to $10M.</p></RestrictedSection>
        </Drawer>
      )}
    </ModulePage>
  );
}
