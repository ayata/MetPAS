import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronDown, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useStore } from '../../store/AppStore';
import { DEMO_PERSONAS } from '../../data/users';
import { profileById } from '../../config/profiles';
import { groupById } from '../../config/groups';
import { Avatar, Toasts } from '../../components/ui';
import { Logo } from '../../layout/Sidebar';

/** Demonstration sign-in. Any password is accepted for a known demo user; nothing is sent anywhere. */
export function LoginPage() {
  const store = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (store.state.signedIn) return <Navigate to={from} replace />;

  const enter = (userId: string) => {
    setBusy(true);
    setTimeout(() => {
      store.signIn(userId);
      navigate(from, { replace: true });
    }, 450);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your email address and password.');
      return;
    }
    const u = store.state.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u) {
      setError('We could not find an account with that email address.');
      return;
    }
    if (u.status !== 'Active') {
      setError('This account is inactive. Contact your administrator.');
      return;
    }
    enter(u.id);
  };

  const personas = DEMO_PERSONAS.map((id) => store.state.users.find((x) => x.id === id)!).filter(Boolean);

  return (
    <div className="login">
      <LoginBrand />

      <main className="login-main">
        <div className="login-card">
          <div className="login-head">
            <h2>Sign in</h2>
            <p className="subtle">Use your work email to access MetPAS.</p>
          </div>

          <form onSubmit={submit} noValidate className="login-form">
            <div className="field">
              <label htmlFor="login-email">Email address</label>
              <div className="input-icon">
                <Mail size={16} />
                <input id="login-email" className={`input ${error && !email ? 'invalid' : ''}`} type="email" autoComplete="username" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
              </div>
            </div>
            <div className="field">
              <div className="row between">
                <label htmlFor="login-pw" className="field-label">Password</label>
                <button type="button" className="link-btn" onClick={() => store.toast('Password reset is not available in the demonstration', 'info')}>Forgot password?</button>
              </div>
              <div className="input-icon">
                <Lock size={16} />
                <input id="login-pw" className={`input ${error && !password ? 'invalid' : ''}`} type={showPw ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" className="pw-toggle" aria-label={showPw ? 'Hide password' : 'Show password'} onClick={() => setShowPw((v) => !v)}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <label className="check">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Keep me signed in on this device
            </label>
            {error && <div className="login-error" role="alert">{error}</div>}
            <button type="submit" className="btn btn-primary login-submit" disabled={busy}>
              {busy ? 'Signing in…' : <>Sign in <ArrowRight size={16} /></>}
            </button>
          </form>

          <div className="login-divider"><span>or continue as a sample persona</span></div>

          <PersonaList>
            {personas.map((u) => (
              <button key={u.id} type="button" className="login-persona" disabled={busy} onClick={() => enter(u.id)} title={u.email}>
                <Avatar name={u.name} size="sm" />
                <span className="grow">
                  <span className="strong">{u.name}</span>
                  <span className="xs subtle">{profileById(u.profileId).name} · {groupById(u.groupId).short}</span>
                </span>
              </button>
            ))}
          </PersonaList>
        </div>
      </main>
      <Toasts />
    </div>
  );
}

/** Brand panel shared by the sign-in steps. */
export function LoginBrand() {
  return (
    <section className="login-brand">
      <div className="login-brand-top">
        <Logo />
        <span className="brand-name"><span className="brand-title">MetPAS</span><span className="brand-sub">powered by AYATA</span></span>
      </div>
      <div className="login-brand-copy">
        <h1>Policy administration,<br />in one place.</h1>
        <p>Service policies, process claims and payments, and manage finance, compliance and operations from a single workspace.</p>
        <ul>
          <li><ShieldCheck size={16} />Role-based access for every team</li>
          <li><ShieldCheck size={16} />Sensitive data masked by default</li>
          <li><ShieldCheck size={16} />Full audit trail of every action</li>
        </ul>
      </div>
      <LoginArt />
      <p className="login-brand-foot">© {new Date().getFullYear()} MetPAS · Demonstration environment</p>
    </section>
  );
}

/** Scrollable persona list with a bottom fade and a "Scroll for N more" hint while rows are hidden. */
function PersonaList({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(0);
  const measure = () => {
    const el = ref.current;
    if (!el) return;
    const rows = Array.from(el.children) as HTMLElement[];
    const bottom = el.scrollTop + el.clientHeight;
    setHidden(rows.filter((r) => r.offsetTop + r.offsetHeight / 2 > bottom).length);
  };
  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  return (
    <div className={`login-personas-wrap ${hidden > 0 ? 'more' : ''}`}>
      <div className="login-personas" ref={ref} onScroll={measure}>{children}</div>
      {hidden > 0 && (
        <button type="button" className="login-more" onClick={() => ref.current?.scrollBy({ top: ref.current.clientHeight * 0.8, behavior: 'smooth' })}>
          Scroll for {hidden} more <ChevronDown size={14} />
        </button>
      )}
    </div>
  );
}

/** Subtle decorative artwork for the brand panel: soft circles, arcs and a connected-node path. */
function LoginArt() {
  return (
    <div className="login-art" aria-hidden>
      <svg viewBox="0 0 480 300" preserveAspectRatio="xMidYMid meet">
        <circle cx="330" cy="150" r="120" fill="rgba(255,255,255,.05)" />
        <circle cx="330" cy="150" r="78" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="1.5" />
        <circle cx="130" cy="200" r="64" fill="rgba(0,144,218,.28)" />
        <circle cx="130" cy="200" r="96" fill="none" stroke="rgba(255,255,255,.10)" strokeWidth="1" />
        <path d="M20 250 A 210 210 0 0 1 300 40" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="1.5" strokeDasharray="2 7" strokeLinecap="round" />
        <path d="M250 290 A 150 150 0 0 1 460 120" fill="none" stroke="rgba(164,206,78,.45)" strokeWidth="2" strokeLinecap="round" />
        <polyline points="70,120 160,90 250,140 330,150 410,80" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="1.5" />
        <circle cx="70" cy="120" r="5" fill="rgba(255,255,255,.55)" />
        <circle cx="160" cy="90" r="5" fill="rgba(255,255,255,.55)" />
        <circle cx="250" cy="140" r="5" fill="rgba(255,255,255,.55)" />
        <circle cx="330" cy="150" r="9" fill="#fff" />
        <circle cx="330" cy="150" r="16" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="1.5" />
        <circle cx="410" cy="80" r="7" fill="#a4ce4e" />
      </svg>
    </div>
  );
}
