import { Icon } from "./icons";
import { PdfReader } from "./pdf/PdfReader";
import { MiniTimer, PomodoroTimer } from "./pomodoro/PomodoroTimer";
import { usePomodoro } from "./pomodoro/usePomodoro";
import { useStudyStore } from "./studyStore";
import "./study.css";

/**
 * Study sidebar: a Pomodoro timer and a PDF reader in one glass panel.
 * It fills whatever box the app shell gives it.
 */
export default function StudySidebar({ className = "" }: { className?: string }) {
  const { data, update } = useStudyStore();
  const pomodoro = usePomodoro(data, update);

  if (!data) return <aside className={`st-root ${className}`} aria-busy="true" />;

  const setTab = (tab: "timer" | "reader") => update((d) => (d.tab === tab ? d : { ...d, tab }));

  return (
    <aside className={`st-root ${className}`} aria-label="Study">
      <header className="st-header">
        <div className="st-segment st-tabs" role="tablist" aria-label="Study tools">
          <button role="tab" aria-selected={data.tab === "timer"} className={data.tab === "timer" ? "is-active" : ""} onClick={() => setTab("timer")}>
            <Icon name="timer" size={16} /> Focus
          </button>
          <button role="tab" aria-selected={data.tab === "reader"} className={data.tab === "reader" ? "is-active" : ""} onClick={() => setTab("reader")}>
            <Icon name="book" size={16} /> Reader
          </button>
        </div>
        {data.tab === "reader" && <MiniTimer p={pomodoro} onOpen={() => setTab("timer")} />}
      </header>

      <div className="st-body">
        {/* The reader stays mounted so switching tabs keeps your place. */}
        <div className="st-pane" data-hidden={data.tab !== "timer" || undefined}>
          <PomodoroTimer p={pomodoro} />
        </div>
        <div className="st-pane st-pane-reader" data-hidden={data.tab !== "reader" || undefined}>
          <PdfReader data={data} update={update} />
        </div>
      </div>
    </aside>
  );
}
