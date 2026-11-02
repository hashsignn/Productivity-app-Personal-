import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";

/**
 * A frosted dialog over the app. Escape or a click outside closes it, focus
 * moves inside on open, Tab stays inside, and focus returns to the opener.
 */
export default function Sheet({
  title,
  wide,
  onClose,
  children,
}: {
  title: string;
  wide?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const el = ref.current;
    if (el && !el.contains(document.activeElement)) {
      (el.querySelector<HTMLElement>("[autofocus], textarea, input") ?? el).focus();
    }
    return () => opener?.focus?.();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !ref.current) return;
    const items = ref.current.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        ref={ref}
        className={`sheet glass ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-head">
          <h2 id={titleId}>{title}</h2>
          <button className="icon-btn" aria-label="Close" title="Close (Esc)" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
