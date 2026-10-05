import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

export interface TipContent {
  value: string;
  label: string;
}

interface TipApi {
  show: (el: Element, content: TipContent) => void;
  hide: () => void;
}

const Ctx = createContext<TipApi>({ show: () => {}, hide: () => {} });
export const useTooltip = () => useContext(Ctx);

/** One shared tooltip for every chart in the panel, positioned above the hovered/focused mark. */
export function TooltipProvider({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<(TipContent & { x: number; y: number }) | null>(null);

  const show = useCallback((el: Element, content: TipContent) => {
    const host = root.current?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (!host) return;
    // Keep the bubble inside the panel when the mark sits near an edge.
    const x = Math.min(Math.max(r.left + r.width / 2 - host.left, 80), host.width - 80);
    setTip({ ...content, x, y: r.top - host.top });
  }, []);
  const hide = useCallback(() => setTip(null), []);

  return (
    <Ctx.Provider value={{ show, hide }}>
      <div ref={root} className="charts-tip-host">
        {children}
        {tip && (
          <div className="charts-tip" style={{ left: tip.x, top: tip.y }} role="status">
            <strong>{tip.value}</strong>
            <span>{tip.label}</span>
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}

/** Props that wire a mark to the shared tooltip on hover and keyboard focus. */
export function useTipHandlers() {
  const { show, hide } = useTooltip();
  return (content: TipContent) => ({
    tabIndex: 0,
    "aria-label": `${content.label}: ${content.value}`,
    onPointerEnter: (e: React.PointerEvent<Element>) => show(e.currentTarget, content),
    onFocus: (e: React.FocusEvent<Element>) => show(e.currentTarget, content),
    onPointerLeave: hide,
    onBlur: hide,
  });
}
