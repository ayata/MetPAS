import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ShieldCheck, AlertTriangle, ListChecks, Server } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { dateTime, relative } from '../../lib/format';
import { Empty } from '../../components/ui';
import { Crumbs } from '../../components/module';

const ICON = { task: ListChecks, approval: ShieldCheck, alert: AlertTriangle, system: Server };

export function NotificationsPage() {
  const store = useStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const all = store.myNotifications;
  const unread = all.filter((n) => !n.read);
  const items = filter === 'unread' ? unread : all;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <Crumbs items={['Administration', 'Notifications']} />
          <h1>Notifications</h1>
          <p className="lead">Assignments, approvals and alerts for your role and group.</p>
        </div>
        {unread.length > 0 && <button className="btn btn-secondary" onClick={() => store.markAllRead(unread.map((n) => n.id))}><CheckCheck size={15} />Mark all read</button>}
      </div>
      <section className="panel">
        <div className="filters">
          <div className="seg" role="group" aria-label="Filter notifications">
            <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All<span className="count">{all.length}</span></button>
            <button aria-pressed={filter === 'unread'} onClick={() => setFilter('unread')}>Unread<span className="count">{unread.length}</span></button>
          </div>
        </div>
        {items.length === 0 ? (
          <Empty title={filter === 'unread' ? "You're all caught up" : 'No notifications'} icon={<Bell size={18} />} />
        ) : (
          <div className="list">
            {items.map((n) => {
              const Icon = ICON[n.kind];
              return (
                <button key={n.id} className="list-row" style={{ alignItems: 'flex-start', padding: '14px var(--s5)' }} onClick={() => { store.markRead(n.id); if (n.link) navigate(n.link); }}>
                  <span className="empty-icon" style={{ width: 30, height: 30, borderRadius: 8, background: n.kind === 'alert' ? 'var(--critical-bg)' : 'var(--blue-50)', color: n.kind === 'alert' ? 'var(--critical)' : 'var(--blue-500)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon size={15} /></span>
                  <span className="grow">
                    <span className="row"><span className="title" style={{ fontWeight: n.read ? 500 : 650 }}>{n.title}</span>{!n.read && <span className="dot info" aria-label="Unread" />}</span>
                    <span className="meta" style={{ display: 'block' }}>{n.body}</span>
                  </span>
                  <span className="xs subtle nowrap" title={dateTime(n.at)}>{relative(n.at)}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
