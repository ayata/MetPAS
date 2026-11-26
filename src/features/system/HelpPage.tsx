import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Keyboard, LifeBuoy, Mail } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { Panel } from '../../components/ui';

const FAQ = [
  { q: 'How is my work prioritized?', a: 'My Priority Work lists your open tasks most urgent first: overdue work, then work due within 24 hours, then everything else. Within each group, higher priority comes first, then the earliest due time.' },
  { q: 'Why is some information shown as masked or restricted?', a: 'Sensitive information — such as personal identifiers, medical records, internal formulas, legal disputes or commercial agreements — is controlled separately from business modules. Access to a module never grants access to its restricted information. Passwords, authentication secrets and card security codes are never displayed.' },
  { q: 'Why can’t I approve a task?', a: 'Approval requires the Approve / Reject permission on that business module, granted through your permission profile and user group. You also cannot approve work you submitted yourself.' },
  { q: 'How do I switch roles for a demonstration?', a: 'Use the “Preview” control in the header. You can change the experience (Operator, Manager, Support), the permission profile and the user group independently, or pick a sample persona. This is a demonstration tool, not production sign-in.' },
  { q: 'Will my changes be saved?', a: 'Changes persist for this browser session. Use Settings → Reset demonstration data to start over.' },
];

export function HelpPage() {
  const { toast } = useStore();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="page" style={{ maxWidth: 960 }}>
      <div className="page-head">
        <div>
          <h1>Help &amp; Support</h1>
          <p className="lead">Answers to common questions and ways to get help.</p>
        </div>
      </div>
      <Panel title="Frequently asked questions" flush>
        <div className="list">
          {FAQ.map((f, i) => (
            <div key={f.q} style={{ borderTop: i ? '1px solid var(--border-subtle)' : 0 }}>
              <button className="tier-head" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
                <ChevronDown size={15} className="chev" />
                <span className="tname">{f.q}</span>
              </button>
              {open === i && <p className="muted" style={{ padding: '0 var(--s5) 14px calc(var(--s5) + 27px)', fontSize: 'var(--fs-md)' }}>{f.a}</p>}
            </div>
          ))}
        </div>
      </Panel>
      <div className="cols-2">
        <Panel title="Keyboard shortcuts">
          <div className="stack gap-3 small">
            <div className="row between"><span className="row"><Keyboard size={14} className="subtle" />Focus global search</span><span className="kbd">/</span></div>
            <div className="row between"><span>Close dialog or panel</span><span className="kbd">Esc</span></div>
            <div className="row between"><span>Move between tabs</span><span className="kbd">← →</span></div>
            <div className="row between"><span>Open selected row</span><span className="kbd">Enter</span></div>
          </div>
        </Panel>
        <Panel title="Contact support">
          <div className="stack gap-3">
            <p className="small muted">Service desk hours: Monday–Friday, 07:00–19:00 ET.</p>
            <div className="row wrap">
              <button className="btn btn-primary" onClick={() => toast('Support ticket SR-10482 raised (demonstration)')}><LifeBuoy size={15} />Raise a support ticket</button>
              <button className="btn btn-secondary" onClick={() => toast('Email draft opened (demonstration)', 'info')}><Mail size={15} />Email service desk</button>
            </div>
            <p className="xs subtle">See your <Link to="/admin/permissions?tab=preview">effective access</Link> for the current profile and group.</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
