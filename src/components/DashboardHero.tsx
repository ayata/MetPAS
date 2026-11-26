import { useStore } from '../store/AppStore';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

export interface HeroStat {
  label: string;
  value: ReactNode;
  tone?: 'critical' | 'warning' | 'success' | 'info';
  hint?: string;
  icon?: ReactNode;
  onClick?: () => void;
}

export interface HeroAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  primary?: boolean;
}

/** One-line "what to do first" message inside the hero, with an optional call to action. */
export interface HeroFocus {
  tone?: 'critical' | 'warning' | 'calm';
  icon?: ReactNode;
  text: ReactNode;
  action?: { label: string; onClick: () => void };
}

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Counts a number up from 0 on first render (skipped when the user prefers reduced motion). */
export function CountUp({ value, duration = 650 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? value : 0));
  useEffect(() => {
    if (prefersReducedMotion() || value === 0) { setShown(value); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{shown}</>;
}

/** Shared dashboard header: hero card (greeting + focus message) and four indicator cards. */
export function DashboardHero({ title, subtitle, actions, stats, focus }: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions: HeroAction[];
  stats: HeroStat[];
  focus?: HeroFocus;
}) {
  const platform = useStore().state.platform;
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  return (
    <>
      <section className="hero-card dash-enter" aria-label="Welcome" style={{ '--i': 0 } as CSSProperties}>
        <div className="hero-main">
          <div className="hero-text">
            <span className="hero-date">
              {today}
              {platform && <span className="hero-platform">Working in {platform}</span>}
            </span>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="hero-actions">
            {actions.map((a) => (
              <button key={a.label} className={a.primary ? 'hero-btn primary' : 'hero-btn'} onClick={a.onClick}>
                {a.icon}
                {a.label}
              </button>
            ))}
          </div>
        </div>
        {focus && (
          <div className={`hero-focus ${focus.tone ?? 'calm'}`} role="status">
            {focus.icon && <span className="hf-icon" aria-hidden>{focus.icon}</span>}
            <span className="hf-text">{focus.text}</span>
            {focus.action && (
              <button className="hf-btn" onClick={focus.action.onClick}>
                {focus.action.label}
                <ArrowRight size={15} aria-hidden />
              </button>
            )}
          </div>
        )}
      </section>

      <div className="stat-cards" role="list" aria-label="Summary indicators">
        {stats.slice(0, 4).map((s, i) => (
          <button
            key={s.label}
            role="listitem"
            className={`stat-card sc2 ${s.tone ?? ''} dash-enter`}
            style={{ '--i': i + 1 } as CSSProperties}
            onClick={s.onClick}
            disabled={!s.onClick}
            aria-label={`${s.label}: ${typeof s.value === 'string' || typeof s.value === 'number' ? s.value : ''}${s.hint ? `. ${s.hint}` : ''}`}
          >
            <span className="sc2-top">
              <span className="sc2-label">{s.label}</span>
              {s.icon && <span className="sc2-icon" aria-hidden>{s.icon}</span>}
            </span>
            <span className="sc2-value">{typeof s.value === 'number' ? <CountUp value={s.value} /> : s.value}</span>
            <span className="sc2-foot">
              {s.hint && <span className="sc2-hint">{s.hint}</span>}
              {s.onClick && <span className="sc2-go" aria-hidden>View <ArrowRight size={13} /></span>}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
