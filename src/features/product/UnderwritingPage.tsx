import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { UW_APPLICATIONS, type UwApplication, type UwDecision } from '../../data/product';
import { date, money } from '../../lib/format';
import { Drawer, Modal } from '../../components/ui';
import { AccessNote, DataTable, GatedButton, KV, ModulePage, RestrictedSection, Status, TabPanel, Toolbar, useSearch, useTabParam } from '../../components/module';

type Tab = 'decisions' | 'requirements' | 'rules';

export function UnderwritingPage() {
  const store = useStore();
  const [tab, setTab] = useTabParam<Tab>('decisions');
  const [decision, setDecision] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const apps = UW_APPLICATIONS.map((a) => ({ ...a, decision: store.statusOf(a.id, a.decision) as UwDecision }));
  const { q, setQ, filtered } = useSearch(apps.filter((a) => !decision || a.decision === decision), (a) => `${a.id} ${a.applicant} ${a.product}`);
  const selected = apps.find((a) => a.id === sel);
  const n = (d: UwDecision) => apps.filter((a) => a.decision === d).length;
  const outstanding = apps.flatMap((a) => a.outstanding.map((o) => ({ app: a, item: o, key: `${a.id}:${o}` }))).filter((x) => store.statusOf(x.key, 'Outstanding') === 'Outstanding' && (x.app.decision === 'Pending' || x.app.decision === 'Referred'));

  return (
    <ModulePage
      module="underwriting"
      lead="Underwriting decisions, conditions and outstanding requirements. Medical, financial and tax records are restricted."
      kpis={[
        { label: 'Pending decisions', value: n('Pending') + n('Referred'), tone: 'warning', onClick: () => setDecision('Pending') },
        { label: 'Accepted', value: n('Accepted'), tone: 'success', onClick: () => setDecision('Accepted') },
        { label: 'Accepted with conditions', value: n('Accepted with Conditions'), onClick: () => setDecision('Accepted with Conditions') },
        { label: 'Rejected', value: n('Rejected'), onClick: () => setDecision('Rejected') },
      ]}
      notice={<AccessNote module="underwriting" />}
    >
      <TabPanel<Tab> label="Underwriting sections" value={tab} onChange={setTab} tabs={[{ id: 'decisions', label: 'Applications & decisions' }, { id: 'requirements', label: 'Outstanding requirements', count: outstanding.length }, { id: 'rules', label: 'Underwriting rules' }]}>
        {tab === 'decisions' && (
          <>
            <Toolbar search={q} onSearch={setQ} placeholder="Search application, applicant or product" count={`${filtered.length} applications`} filters={[{ label: 'All decisions', value: decision, onChange: setDecision, options: ['Pending', 'Referred', 'Accepted', 'Accepted with Conditions', 'Rejected'] }]} />
            <DataTable rows={filtered} rowKey={(a) => a.id} onRow={(a) => setSel(a.id)} selected={sel} label="Underwriting applications"
              cols={[
                { key: 'a', label: 'Applicant', render: (a) => <><div className="primary-cell">{a.applicant}</div><div className="id-cell">{a.id} · {date(a.submitted)}</div></> },
                { key: 'p', label: 'Product', className: 'hide-md', render: (a) => <span className="small">{a.product}<div className="id-cell">{money(a.face)}</div></span> },
                { key: 'r', label: 'Risk class', className: 'hide-md', render: (a) => <span className="small">{a.riskClass}</span> },
                { key: 'o', label: 'Outstanding', render: (a) => <span className="small">{a.outstanding.length || '—'}</span> },
                { key: 'd', label: 'Decision', render: (a) => <Status s={a.decision} /> },
              ]} />
          </>
        )}
        {tab === 'requirements' && (
          <DataTable rows={outstanding} rowKey={(x) => x.key} empty="No outstanding requirements" label="Outstanding requirements"
            cols={[
              { key: 'i', label: 'Requirement', render: (x) => <><div className="primary-cell">{x.item}</div><div className="id-cell">{x.app.id} · {x.app.applicant}</div></> },
              { key: 'p', label: 'Product', render: (x) => <span className="small">{x.app.product}</span> },
              { key: 'x', label: '', className: 'num', render: (x) => <GatedButton module="underwriting" level="edit" onClick={() => store.setRecordStatus(x.key, 'Received', { target: `${x.item} · ${x.app.id}`, module: 'underwriting', message: 'Requirement marked received' })}>Mark received</GatedButton> },
            ]} />
        )}
        {tab === 'rules' && (
          <div className="stack gap-3" style={{ padding: 'var(--s5)' }}>
            <RestrictedSection cat="formulas" title="Underwriting rules and methodology" summary="Decision outcomes are visible; rules, debits/credits and methodology are restricted.">
              <KV items={[['Build chart', 'BMI 18.5–29.9 standard; 30–34.9 Table 2'], ['Blood pressure', '≤ 140/90 preferred; ≤ 150/95 standard'], ['Financial justification', 'Face ≤ 20× income (age < 40)'], ['Auto-accept (STP)', 'Face ≤ $500K, age ≤ 50, no disclosures']]} />
            </RestrictedSection>
          </div>
        )}
      </TabPanel>

      {selected && <UwDrawer app={selected} onClose={() => setSel(null)} />}
    </ModulePage>
  );
}

function UwDrawer({ app, onClose }: { app: UwApplication; onClose: () => void }) {
  const store = useStore();
  const [decide, setDecide] = useState(false);
  const [choice, setChoice] = useState<UwDecision>('Accepted');
  const pending = app.decision === 'Pending' || app.decision === 'Referred';
  return (
    <Drawer label={`Application ${app.id}`} onClose={onClose} header={<div className="stack gap-1"><div className="xs subtle mono">{app.id} · Underwriting</div><h2 style={{ fontSize: 18 }}>{app.applicant}</h2></div>}
      footer={pending ? <div className="row"><GatedButton module="underwriting" level="approve" className="btn btn-primary btn-sm" onClick={() => setDecide(true)}>Record decision</GatedButton><GatedButton module="underwriting" level="edit" className="btn btn-ghost btn-sm" onClick={() => store.setRecordStatus(app.id, 'Referred', { target: `Application ${app.id}`, module: 'underwriting', message: 'Referred to senior underwriter' })}>Refer</GatedButton></div> : undefined}>
      <KV two items={[['Underwriting outcome', <Status s={app.decision} />], ['Risk class', app.riskClass], ['Product', app.product], ['Face amount', money(app.face)], ['Submitted', date(app.submitted)], ['Decision status', pending ? 'Awaiting decision' : 'Final']]} />
      {app.conditions.length > 0 && <section className="stack"><h3>Conditions</h3><ul className="small" style={{ margin: 0, paddingLeft: 18 }}>{app.conditions.map((c) => <li key={c}>{c}</li>)}</ul></section>}
      <section className="stack"><h3>Required documents</h3>
        <ul className="checklist">{app.documents.map((d) => <li key={d.name} className={d.received ? 'ok' : 'warn'}>{d.received ? <CheckCircle2 size={14} /> : <XCircle size={14} />}<span className="grow">{d.name}</span><span className="xs subtle">{d.received ? 'Received' : 'Outstanding'}</span></li>)}</ul>
      </section>
      <RestrictedSection cat="medical" title="Medical history" target={app.id} summary="Medical evidence is on file. Details are restricted to underwriters and authorized reviewers.">
        <KV items={[['Paramedical exam', 'BP 142/88; BMI 31.2; cholesterol 228'], ['Disclosed conditions', 'Controlled hypertension (2019)'], ['APS', 'Requested from primary care physician']]} />
      </RestrictedSection>
      <RestrictedSection cat="medical" title="Financial and tax records" target={app.id} summary="Financial justification documents are on file.">
        <KV items={[['Declared income', '$148,000'], ['Net worth', '$1.2M'], ['Tax return (2025)', 'Received — AGI consistent with declaration']]} />
      </RestrictedSection>
      {decide && (
        <Modal title="Record underwriting decision" desc={`${app.applicant} · ${app.id}`} onClose={() => setDecide(false)}
          footer={<><button className="btn btn-secondary" onClick={() => setDecide(false)}>Cancel</button><button className="btn btn-primary" onClick={() => { store.setRecordStatus(app.id, choice, { target: `Application ${app.id}`, module: 'underwriting', message: `Decision recorded: ${choice}` }); setDecide(false); onClose(); }}>Record decision</button></>}>
          <div className="seg" role="group" aria-label="Decision">{(['Accepted', 'Accepted with Conditions', 'Rejected'] as UwDecision[]).map((d) => <button key={d} aria-pressed={choice === d} onClick={() => setChoice(d)}>{d}</button>)}</div>
        </Modal>
      )}
    </Drawer>
  );
}
