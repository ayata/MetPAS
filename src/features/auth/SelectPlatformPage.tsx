import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Database, Layers } from 'lucide-react';
import { useStore, type Platform } from '../../store/AppStore';
import { Avatar, Toasts } from '../../components/ui';
import { LoginBrand } from './LoginPage';

const OPTIONS: { id: Platform; icon: typeof Database; text: string }[] = [
  { id: 'LCFS', icon: Database, text: 'Work with policies administered on LCFS.' },
  { id: 'ULS', icon: Layers, text: 'Work with policies administered on ULS.' },
];

/** Step shown right after sign-in: choose the administration system for this session. */
export function SelectPlatformPage() {
  const store = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  const [choice, setChoice] = useState<Platform | null>(store.state.platform);

  if (!store.state.signedIn) return <Navigate to="/login" replace />;

  const proceed = () => {
    if (!choice) return;
    store.setPlatform(choice);
    store.toast(`You are working in ${choice}`, 'info');
    navigate(from === '/select-system' ? '/' : from, { replace: true });
  };

  return (
    <div className="login">
      <LoginBrand />
      <main className="login-main">
        <div className="login-card">
          <div className="row" style={{ gap: 10, marginBottom: 18 }}>
            <Avatar name={store.me.name} />
            <div className="grow">
              <div className="strong">{store.me.name}</div>
              <div className="xs subtle">{store.me.email}</div>
            </div>
            <button type="button" className="link-btn small" style={{ color: 'var(--link)' }} onClick={() => store.signOut()}>Not you?</button>
          </div>
          <div className="login-head">
            <h2>Select a system</h2>
            <p className="subtle">Choose the administration system you want to work in for this session.</p>
          </div>

          <div className="platform-options" role="radiogroup" aria-label="Administration system">
            {OPTIONS.map(({ id, icon: Icon, text }) => {
              const on = choice === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={`platform-option ${on ? 'on' : ''}`}
                  onClick={() => setChoice(id)}
                >
                  <span className="po-icon"><Icon size={20} /></span>
                  <span className="grow">
                    <span className="po-name">{id}</span>
                    <span className="po-text">{text}</span>
                  </span>
                  <span className="po-check" aria-hidden>{on && <Check size={14} strokeWidth={3} />}</span>
                </button>
              );
            })}
          </div>

          <button type="button" className="btn btn-primary login-submit" style={{ marginTop: 20 }} disabled={!choice} onClick={proceed}>
            Continue{choice ? ` to ${choice}` : ''} <ArrowRight size={16} />
          </button>
          <p className="xs subtle" style={{ margin: '12px 0 0', textAlign: 'center' }}>You can switch systems later from the top bar.</p>
        </div>
      </main>
      <Toasts />
    </div>
  );
}
