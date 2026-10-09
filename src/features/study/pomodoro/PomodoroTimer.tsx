import { useRef, useState } from "react";
import type { Pomodoro } from "./usePomodoro";
import { formatClock, MAX_MINUTES, PHASE_LABEL, type Phase, type TimerSettings } from "./timer";
import { Icon } from "../icons";

const PHASES: Phase[] = ["focus", "short", "long"];
const MINUTES_KEY: Record<Phase, "focusMin" | "shortMin" | "longMin"> = { focus: "focusMin", short: "shortMin", long: "longMin" };
const R = 92;
const C = 2 * Math.PI * R;

export function PomodoroTimer({ p }: { p: Pomodoro }) {
  const [showSettings, setShowSettings] = useState(false);
  const [editingClock, setEditingClock] = useState(false);
  const phase = p.state?.phase ?? "focus";
  const running = p.state?.running ?? false;
  const progress = p.total > 0 ? 1 - p.left / p.total : 0;
  const cycle = p.state?.cycle ?? 0;

  return (
    <div className={`st-timer st-phase-${phase}`}>
      <div className="st-segment" role="tablist" aria-label="Timer mode">
        {PHASES.map((ph) => (
          <button
            key={ph}
            role="tab"
            aria-selected={phase === ph}
            className={phase === ph ? "is-active" : ""}
            onClick={() => p.setPhase(ph)}
          >
            {PHASE_LABEL[ph]}
          </button>
        ))}
      </div>

      <div className="st-ring-wrap">
        <svg className="st-ring" viewBox="0 0 220 220" aria-hidden="true">
          <circle className="st-ring-track" cx="110" cy="110" r={R} />
          <circle
            className="st-ring-fill"
            cx="110"
            cy="110"
            r={R}
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progress)}
          />
        </svg>
        <div className="st-ring-center">
          {editingClock ? (
            <MinutesInput
              className="st-clock st-clock-input"
              label={`${PHASE_LABEL[phase]} length (minutes)`}
              value={p.settings[MINUTES_KEY[phase]]}
              min={1}
              max={MAX_MINUTES}
              autoFocus
              onCommit={(v) => {
                p.setSettings({ [MINUTES_KEY[phase]]: v });
                setEditingClock(false);
              }}
              onCancel={() => setEditingClock(false)}
            />
          ) : (
            <button
              className="st-clock st-clock-btn"
              aria-live="off"
              title={`Set ${PHASE_LABEL[phase].toLowerCase()} length`}
              onClick={() => setEditingClock(true)}
            >
              {formatClock(p.left)}
            </button>
          )}
          <div className="st-ring-label">
            {editingClock ? "minutes · Enter to set" : running ? PHASE_LABEL[phase] : "Paused · tap time to change"}
          </div>
          <div className="st-dots" aria-label={`${cycle} of ${p.settings.longEvery} focus sessions done this set`}>
            {Array.from({ length: p.settings.longEvery }, (_, i) => (
              <span key={i} className={i < cycle ? "is-done" : ""} />
            ))}
          </div>
        </div>
      </div>

      <div className="st-controls">
        <button className="st-icon-btn" onClick={p.reset} title="Reset" aria-label="Reset">
          <Icon name="reset" />
        </button>
        <button className="st-primary" onClick={p.toggle} aria-label={running ? "Pause" : "Start"}>
          <Icon name={running ? "pause" : "play"} />
          <span>{running ? "Pause" : "Start"}</span>
        </button>
        <button className="st-icon-btn" onClick={p.skip} title="Skip to next" aria-label="Skip to next">
          <Icon name="skip" />
        </button>
      </div>

      <div className="st-card st-today">
        <div>
          <div className="st-stat">{p.today.sessions}</div>
          <div className="st-muted">sessions today</div>
        </div>
        <div>
          <div className="st-stat">{formatMinutes(p.today.minutes)}</div>
          <div className="st-muted">focused today</div>
        </div>
      </div>

      <button className="st-link" onClick={() => setShowSettings((v) => !v)} aria-expanded={showSettings}>
        <Icon name="gear" /> Timer settings
      </button>
      {showSettings && <Settings settings={p.settings} onChange={p.setSettings} />}
    </div>
  );
}

function formatMinutes(min: number) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function Settings({ settings, onChange }: { settings: TimerSettings; onChange: (p: Partial<TimerSettings>) => void }) {
  return (
    <div className="st-card st-settings">
      <Stepper label="Focus" unit="min" value={settings.focusMin} min={1} max={MAX_MINUTES} onChange={(v) => onChange({ focusMin: v })} />
      <Stepper label="Short break" unit="min" value={settings.shortMin} min={1} max={MAX_MINUTES} onChange={(v) => onChange({ shortMin: v })} />
      <Stepper label="Long break" unit="min" value={settings.longMin} min={1} max={MAX_MINUTES} onChange={(v) => onChange({ longMin: v })} />
      <Stepper label="Long break every" unit="sessions" value={settings.longEvery} min={2} max={12} onChange={(v) => onChange({ longEvery: v })} />
      <Toggle label="Auto-start next phase" checked={settings.autoStart} onChange={(v) => onChange({ autoStart: v })} />
      <Toggle label="Chime when a phase ends" checked={settings.sound} onChange={(v) => onChange({ sound: v })} />
    </div>
  );
}

function Stepper(props: { label: string; unit: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const { label, unit, value, min, max, onChange } = props;
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v)));
  return (
    <div className="st-row">
      <span>{label}</span>
      <div className="st-stepper">
        <button onClick={() => onChange(clamp(value - 1))} aria-label={`Less ${label}`} disabled={value <= min}>
          −
        </button>
        <MinutesInput label={`${label} (${unit})`} value={value} min={min} max={max} onCommit={onChange} />
        <button onClick={() => onChange(clamp(value + 1))} aria-label={`More ${label}`} disabled={value >= max}>
          +
        </button>
        <span className="st-muted st-unit">{unit}</span>
      </div>
    </div>
  );
}

/**
 * Number field that lets you clear it and type freely; the value is clamped
 * and saved on Enter or when the field loses focus.
 */
function MinutesInput(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  className?: string;
  autoFocus?: boolean;
  onCommit: (v: number) => void;
  onCancel?: () => void;
}) {
  const { label, value, min, max, className, autoFocus, onCommit, onCancel } = props;
  const [draft, setDraft] = useState(String(value));
  const [lastValue, setLastValue] = useState(value);
  const cancelled = useRef(false);
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(String(value));
  }
  const commit = () => {
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    const v = Math.round(Number(draft));
    if (draft.trim() === "" || !Number.isFinite(v)) {
      setDraft(String(value));
      onCancel?.();
      return;
    }
    const clamped = Math.min(max, Math.max(min, v));
    setDraft(String(clamped));
    onCommit(clamped);
  };
  return (
    <input
      type="text"
      inputMode="numeric"
      className={className}
      value={draft}
      aria-label={label}
      autoFocus={autoFocus}
      onFocus={(e) => e.target.select()}
      onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          cancelled.current = true;
          setDraft(String(value));
          e.currentTarget.blur();
          onCancel?.();
        }
      }}
    />
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="st-row st-toggle">
      <span>{label}</span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

/** One-line timer for the sidebar header, so it stays visible while reading. */
export function MiniTimer({ p, onOpen }: { p: Pomodoro; onOpen: () => void }) {
  const phase = p.state?.phase ?? "focus";
  const running = p.state?.running ?? false;
  return (
    <div className={`st-mini st-phase-${phase}`}>
      <button className="st-mini-time" onClick={onOpen} title="Open timer">
        <span className="st-mini-dot" />
        {formatClock(p.left)}
      </button>
      <button className="st-icon-btn st-sm" onClick={p.toggle} aria-label={running ? "Pause timer" : "Start timer"}>
        <Icon name={running ? "pause" : "play"} />
      </button>
    </div>
  );
}
