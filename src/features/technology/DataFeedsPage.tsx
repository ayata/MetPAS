import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pause, Play, Radio } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { EVENT_TEMPLATES, FEEDS, samplePolicy, type Feed } from '../../data/technology';
import { DataTable, GatedButton, ModulePage, SimTag, Status, TabPanel, useTabParam } from '../../components/module';
import { Notice } from '../../components/ui';

type Tab = 'feeds' | 'events' | 'transactions';
interface Ev { id: number; at: string; feed: string; text: string }

/** Simulated real-time monitoring — values tick in the browser; there is no production connectivity. */
export function DataFeedsPage() {
  const store = useStore();
  const [tab, setTab] = useTabParam<Tab>('feeds');
  const [events, setEvents] = useState<Ev[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>(() => Object.fromEntries(FEEDS.map((f) => [f.id, f.rate * 60])));
  const [live, setLive] = useState(true);
  const seq = useRef(0);
  const feeds: Feed[] = FEEDS.map((f) => ({ ...f, status: store.statusOf(f.id, f.status) as Feed['status'] }));

  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => {
      const n = seq.current++;
      const ev = EVENT_TEMPLATES[n % EVENT_TEMPLATES.length](samplePolicy(n * 7));
      if (feeds.find((f) => f.id === ev.feed)?.status === 'Paused') return;
      setEvents((e) => [{ id: n, at: new Date().toLocaleTimeString(), ...ev }, ...e].slice(0, 14));
      setCounts((c) => ({ ...c, [ev.feed]: c[ev.feed] + 1 + (n % 3) }));
    }, 1600);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, store.state.recordStatus]);

  return (
    <ModulePage
      module="data-feeds"
      lead="API-based and event-driven feeds, external connectivity and synchronization status. Scheduled batch processing is monitored separately in System Monitoring."
      actions={<><SimTag /><button className="btn btn-secondary" onClick={() => setLive(!live)}>{live ? <><Pause size={14} />Pause view</> : <><Play size={14} />Resume view</>}</button></>}
      kpis={[
        { label: 'Feeds streaming', value: `${feeds.filter((f) => f.status === 'Streaming').length} of ${feeds.length}`, tone: feeds.some((f) => f.status !== 'Streaming') ? 'warning' : 'success' },
        { label: 'Events (last hour)', value: Object.values(counts).reduce((a, b) => a + b, 0).toLocaleString() },
        { label: 'Max sync lag', value: `${Math.max(...feeds.map((f) => f.lagMs)).toLocaleString()} ms`, tone: 'warning' },
        { label: 'External connections', value: new Set(feeds.map((f) => f.counterpart)).size },
      ]}
    >
      <Notice>Real-time feeds are shown here. Scheduled batch jobs (premium posting, billing, valuation extracts) are in <Link to="/operations?tab=batch">System Monitoring → Batch jobs</Link>.</Notice>
      <TabPanel<Tab> label="Data feed sections" value={tab} onChange={setTab} tabs={[{ id: 'feeds', label: 'Live feeds' }, { id: 'events', label: 'Event stream' }, { id: 'transactions', label: 'Real-time transaction status' }]}>
        {tab === 'feeds' && (
          <DataTable rows={feeds} rowKey={(f) => f.id} label="Live feeds"
            cols={[
              { key: 'n', label: 'Feed', render: (f) => <><div className="primary-cell row" style={{ gap: 6 }}>{f.status === 'Streaming' && live && <span className="live-dot" aria-hidden />}{f.name}</div><div className="id-cell">{f.id} · {f.counterpart}</div></> },
              { key: 'p', label: 'Protocol', className: 'hide-md', render: (f) => <span className="small">{f.protocol}<div className="id-cell">{f.direction}</div></span> },
              { key: 'c', label: 'Events (1h)', className: 'num', render: (f) => counts[f.id].toLocaleString() },
              { key: 'l', label: 'Sync lag', className: 'num', render: (f) => <span className={f.lagMs > 1500 ? 'strong' : ''} style={{ color: f.lagMs > 1500 ? 'var(--critical)' : undefined }}>{f.lagMs} ms</span> },
              { key: 's', label: 'Status', render: (f) => <Status s={f.status} /> },
              { key: 'x', label: '', className: 'num', render: (f) => <GatedButton module="data-feeds" level="edit" onClick={() => store.setRecordStatus(f.id, f.status === 'Paused' ? 'Streaming' : 'Paused', { target: `Feed ${f.id}`, module: 'data-feeds', message: f.status === 'Paused' ? 'Feed resumed (simulated)' : 'Feed paused (simulated)' })}>{f.status === 'Paused' ? 'Resume' : 'Pause'}</GatedButton> },
            ]} />
        )}
        {tab === 'events' && (
          <div className="event-stream" aria-live="polite">
            {events.length === 0 && <p className="small muted" style={{ padding: 'var(--s5)' }}><Radio size={14} /> Waiting for events…</p>}
            {events.map((e) => <div key={e.id} className="event-row"><span className="mono xs subtle">{e.at}</span><span className="chip">{e.feed}</span><span className="mono small">{e.text}</span></div>)}
          </div>
        )}
        {tab === 'transactions' && (
          <DataTable rows={events.filter((e) => e.feed === 'FD-PAY' || e.feed === 'FD-GL' || e.feed === 'FD-POL').slice(0, 10)} rowKey={(e) => String(e.id)} empty="Transactions appear here as events arrive" label="Real-time transactions"
            cols={[
              { key: 't', label: 'Time', render: (e) => <span className="mono small">{e.at}</span> },
              { key: 'e', label: 'Transaction', render: (e) => <span className="mono small">{e.text}</span> },
              { key: 's', label: 'Status', render: (e) => <Status s={e.feed === 'FD-PAY' ? 'Received' : e.feed === 'FD-GL' ? 'Posted' : 'Synchronized — complete'} /> },
            ]} />
        )}
      </TabPanel>
    </ModulePage>
  );
}
