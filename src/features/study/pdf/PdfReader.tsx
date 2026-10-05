import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../icons";
import { MAX_RECENT_PDFS, type RecentPdf, type StudyData, type Zoom } from "../studyStore";
import { deletePdf, getPdf, putPdf } from "./pdfCache";
import { PdfPage, type PageSize } from "./PdfPage";
import { pdfjs, type PDFDocumentProxy } from "./pdfjs";

type Update = (fn: (d: StudyData) => StudyData) => void;

// pdf.js scale 1 is 72 dpi; 100% should look like the printed page at 96 dpi.
const CSS_UNITS = 96 / 72;
const ZOOM_STEPS = [0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 5;
const PAGE_GAP = 12;
const SIDE_PAD = 12;

const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

interface Anchor {
  page: number;
  /** Position inside the page, 0..1 of its height, at the top of the view. */
  frac: number;
  /** Horizontal centre of the view as a fraction of the content width. */
  x?: number;
}

export function PdfReader({ data, update }: { data: StudyData; update: Update }) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [docKey, setDocKey] = useState<string | null>(null);
  const [sizes, setSizes] = useState<PageSize[]>([]);
  const [zoom, setZoom] = useState<Zoom>("fit");
  const [renderScale, setRenderScale] = useState(1);
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [active, setActive] = useState<Set<number>>(new Set());
  const [viewWidth, setViewWidth] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRecent, setShowRecent] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pageEls = useRef(new Map<number, HTMLDivElement>());
  const anchor = useRef<Anchor | null>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const loadSeq = useRef(0);

  const meta = useMemo(() => data.pdfs.find((p) => p.key === docKey) ?? null, [data.pdfs, docKey]);
  const pageCount = doc?.numPages ?? 0;
  const firstW = sizes[0]?.w ?? 612;
  const zoomValue = zoom === "fit" ? (viewWidth > 0 ? clampZoom((viewWidth - SIDE_PAD * 2) / (firstW * CSS_UNITS)) : 1) : zoom;
  const scale = zoomValue * CSS_UNITS;

  // ---- opening documents ---------------------------------------------------

  const openBytes = useCallback(
    async (bytes: Uint8Array, info: { key: string; name: string; size: number }) => {
      const seq = ++loadSeq.current;
      setLoading(true);
      setError(null);
      setShowRecent(false);
      try {
        // pdf.js takes ownership of the buffer it is given, so hand it a copy.
        const next = await pdfjs.getDocument({ data: bytes.slice() }).promise;
        if (seq !== loadSeq.current) {
          void next.loadingTask.destroy();
          return;
        }
        const first = (await next.getPage(1)).getViewport({ scale: 1 });
        void docRef.current?.loadingTask.destroy();
        docRef.current = next;
        pageEls.current.clear();

        const prev = data.pdfs.find((p) => p.key === info.key);
        const lastPage = Math.min(Math.max(1, prev?.lastPage ?? 1), next.numPages);
        const z = prev?.zoom ?? "fit";
        anchor.current = { page: lastPage, frac: 0 };
        setSizes(Array.from({ length: next.numPages }, () => ({ w: first.width, h: first.height })));
        setZoom(z);
        setPage(lastPage);
        setPageInput(String(lastPage));
        setActive(new Set());
        setDoc(next);
        setDocKey(info.key);

        const entry: RecentPdf = {
          key: info.key,
          name: info.name,
          size: info.size,
          lastPage,
          pageCount: next.numPages,
          zoom: z,
          openedAt: Date.now(),
        };
        update((d) => {
          const rest = d.pdfs.filter((p) => p.key !== info.key);
          const pdfs = [entry, ...rest];
          for (const dropped of pdfs.slice(MAX_RECENT_PDFS)) void deletePdf(dropped.key);
          return { ...d, pdfs: pdfs.slice(0, MAX_RECENT_PDFS), currentPdf: info.key };
        });
      } catch (e) {
        if (seq !== loadSeq.current) return;
        setError(e instanceof Error && e.name === "PasswordException" ? "This PDF is password protected." : "Couldn't open that file as a PDF.");
      } finally {
        if (seq === loadSeq.current) setLoading(false);
      }
    },
    [data.pdfs, update],
  );

  const openFile = useCallback(
    async (file: File) => {
      if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
        setError("That isn't a PDF.");
        return;
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const key = `${file.name}:${file.size}`;
      void putPdf(key, bytes.slice());
      await openBytes(bytes, { key, name: file.name, size: file.size });
    },
    [openBytes],
  );

  const openRecent = useCallback(
    async (r: RecentPdf) => {
      const bytes = await getPdf(r.key);
      if (!bytes) {
        setError(`"${r.name}" is no longer saved here. Open it again from your files.`);
        update((d) => ({ ...d, pdfs: d.pdfs.filter((p) => p.key !== r.key) }));
        return;
      }
      await openBytes(bytes, r);
    },
    [openBytes, update],
  );

  const forgetRecent = useCallback(
    (key: string) => {
      void deletePdf(key);
      update((d) => ({ ...d, pdfs: d.pdfs.filter((p) => p.key !== key), currentPdf: d.currentPdf === key ? null : d.currentPdf }));
    },
    [update],
  );

  const closeDoc = useCallback(() => {
    loadSeq.current++;
    void docRef.current?.loadingTask.destroy();
    docRef.current = null;
    setDoc(null);
    setDocKey(null);
    setSizes([]);
    update((d) => ({ ...d, currentPdf: null }));
  }, [update]);

  // Reopen whatever was open last time.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const last = data.pdfs.find((p) => p.key === data.currentPdf);
    if (last) void openRecent(last);
  }, [data.currentPdf, data.pdfs, openRecent]);

  useEffect(() => () => void docRef.current?.loadingTask.destroy(), []);

  // ---- layout, visibility, current page -------------------------------------

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => {
      if (el.clientWidth > 0) setViewWidth(el.clientWidth);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [doc]);

  // Re-rasterise a moment after zooming stops; until then the old bitmap is scaled.
  useEffect(() => {
    const id = window.setTimeout(() => setRenderScale(scale), 160);
    return () => window.clearTimeout(id);
  }, [scale]);

  const io = useRef<IntersectionObserver | null>(null);
  useEffect(() => {
    const root = scrollRef.current;
    if (!root || !doc) return;
    const obs = new IntersectionObserver(
      (entries) => {
        setActive((prev) => {
          const next = new Set(prev);
          for (const e of entries) {
            const n = Number((e.target as HTMLElement).dataset.page);
            if (e.isIntersecting) next.add(n);
            else next.delete(n);
          }
          return next;
        });
      },
      { root, rootMargin: "120% 0px" },
    );
    io.current = obs;
    pageEls.current.forEach((el) => obs.observe(el));
    return () => {
      obs.disconnect();
      io.current = null;
    };
  }, [doc]);

  const setRef = useCallback((num: number, el: HTMLDivElement | null) => {
    const prev = pageEls.current.get(num);
    if (prev === el) return;
    if (prev) io.current?.unobserve(prev);
    if (el) {
      pageEls.current.set(num, el);
      io.current?.observe(el);
    } else {
      pageEls.current.delete(num);
    }
  }, []);

  const onSize = useCallback((num: number, size: PageSize) => {
    setSizes((prev) => {
      if (!prev[num - 1]) return prev;
      const next = prev.slice();
      next[num - 1] = size;
      return next;
    });
  }, []);

  /** Which page sits at the top third of the view, and how far into it. */
  const readAnchor = useCallback((): Anchor | null => {
    const el = scrollRef.current;
    if (!el || pageEls.current.size === 0) return null;
    const probe = el.scrollTop + el.clientHeight * 0.3;
    let lo = 1;
    let hi = pageEls.current.size;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      const p = pageEls.current.get(mid);
      if (p && p.offsetTop <= probe) lo = mid;
      else hi = mid - 1;
    }
    const p = pageEls.current.get(lo);
    if (!p) return null;
    return {
      page: lo,
      frac: Math.min(1, Math.max(0, (el.scrollTop - p.offsetTop) / p.offsetHeight)),
      x: (el.scrollLeft + el.clientWidth / 2) / el.scrollWidth,
    };
  }, []);

  const onScroll = useRef<number | undefined>(undefined);
  const handleScroll = useCallback(() => {
    if (onScroll.current !== undefined) return;
    onScroll.current = requestAnimationFrame(() => {
      onScroll.current = undefined;
      const a = readAnchor();
      if (!a) return;
      setPage((p) => {
        if (p !== a.page) setPageInput(String(a.page));
        return a.page;
      });
    });
  }, [readAnchor]);

  // After a zoom or document load, put the remembered spot back at the top.
  useLayoutEffect(() => {
    const a = anchor.current;
    const el = scrollRef.current;
    // Wait for the real width so "fit" zoom has settled before scrolling.
    if (!a || !el || viewWidth === 0) return;
    const p = pageEls.current.get(a.page);
    if (!p) return;
    anchor.current = null;
    el.scrollTop = p.offsetTop + a.frac * p.offsetHeight - (a.frac === 0 ? PAGE_GAP : 0);
    // Keep the same spot horizontally; a fresh document starts centred.
    el.scrollLeft = (a.x ?? 0.5) * el.scrollWidth - el.clientWidth / 2;
  }, [scale, doc, sizes, viewWidth]);

  // Remember page and zoom for this file.
  useEffect(() => {
    if (!docKey) return;
    update((d) => {
      const cur = d.pdfs.find((p) => p.key === docKey);
      if (!cur || (cur.lastPage === page && cur.zoom === zoom)) return d;
      return { ...d, pdfs: d.pdfs.map((p) => (p.key === docKey ? { ...p, lastPage: page, zoom } : p)) };
    });
  }, [docKey, page, zoom, update]);

  // ---- navigation & zoom ----------------------------------------------------

  const goTo = useCallback(
    (n: number) => {
      if (!pageCount) return;
      const target = Math.min(pageCount, Math.max(1, Math.round(n)));
      const el = scrollRef.current;
      const p = pageEls.current.get(target);
      if (el && p) el.scrollTo({ top: p.offsetTop - PAGE_GAP });
      setPage(target);
      setPageInput(String(target));
    },
    [pageCount],
  );

  const applyZoom = useCallback(
    (next: Zoom) => {
      anchor.current = readAnchor();
      setZoom(next === "fit" ? "fit" : clampZoom(Math.round(next * 100) / 100));
    },
    [readAnchor],
  );

  const stepZoom = useCallback(
    (dir: 1 | -1) => {
      const cur = zoomValue;
      const next = dir > 0 ? ZOOM_STEPS.find((z) => z > cur + 0.001) ?? MAX_ZOOM : [...ZOOM_STEPS].reverse().find((z) => z < cur - 0.001) ?? MIN_ZOOM;
      applyZoom(next);
    },
    [zoomValue, applyZoom],
  );

  // Ctrl + wheel (and touchpad pinch, which arrives as ctrl+wheel) zooms.
  const zoomRef = useRef(zoomValue);
  zoomRef.current = zoomValue;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0025);
      applyZoom(zoomRef.current * factor);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [doc, applyZoom]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === "INPUT") return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && (e.key === "=" || e.key === "+")) stepZoom(1);
    else if (mod && e.key === "-") stepZoom(-1);
    else if (mod && e.key === "0") applyZoom("fit");
    else if (e.key === "ArrowRight" || e.key === "n") goTo(page + 1);
    else if (e.key === "ArrowLeft" || e.key === "p") goTo(page - 1);
    else if (e.key === "Home") goTo(1);
    else if (e.key === "End") goTo(pageCount);
    else return;
    e.preventDefault();
  };

  // ---- render ---------------------------------------------------------------

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) void openFile(f);
  };

  const fileInput = (
    <input
      ref={fileRef}
      type="file"
      accept="application/pdf,.pdf"
      hidden
      onChange={(e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (f) void openFile(f);
      }}
    />
  );

  const recentList = (
    <ul className="st-recent">
      {data.pdfs.map((r) => (
        <li key={r.key}>
          <button className="st-recent-open" onClick={() => void openRecent(r)}>
            <Icon name="book" />
            <span className="st-recent-text">
              <span className="st-recent-name">{r.name.replace(/\.pdf$/i, "")}</span>
              <span className="st-muted">
                Page {r.lastPage} of {r.pageCount} · {timeAgo(r.openedAt)}
              </span>
            </span>
          </button>
          <button className="st-icon-btn st-sm" onClick={() => forgetRecent(r.key)} aria-label={`Remove ${r.name} from recent`}>
            <Icon name="close" size={14} />
          </button>
        </li>
      ))}
    </ul>
  );

  if (!doc) {
    return (
      <div
        className={`st-reader st-reader-empty ${dragOver ? "is-drag" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {fileInput}
        <div className="st-empty">
          <div className="st-empty-icon">
            <Icon name="book" size={28} />
          </div>
          <div className="st-empty-title">{loading ? "Opening…" : "Open a PDF to study"}</div>
          <div className="st-muted">Drop a file here or pick one. Your page and zoom are remembered.</div>
          <button className="st-primary" onClick={() => fileRef.current?.click()} disabled={loading}>
            <Icon name="open" />
            <span>Open PDF</span>
          </button>
          {error && <div className="st-error">{error}</div>}
        </div>
        {data.pdfs.length > 0 && (
          <div className="st-card">
            <div className="st-card-title">Recent</div>
            {recentList}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`st-reader ${dragOver ? "is-drag" : ""}`}
      onKeyDown={onKeyDown}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      {fileInput}
      <div className="st-toolbar">
        <div className="st-doc-title" title={meta?.name}>
          {meta?.name.replace(/\.pdf$/i, "") ?? "Document"}
        </div>
        <button className="st-icon-btn st-sm" onClick={() => setShowRecent((v) => !v)} aria-label="Recent PDFs" aria-expanded={showRecent}>
          <Icon name="clock" />
        </button>
        <button className="st-icon-btn st-sm" onClick={() => fileRef.current?.click()} aria-label="Open another PDF">
          <Icon name="open" />
        </button>
        <button className="st-icon-btn st-sm" onClick={closeDoc} aria-label="Close PDF">
          <Icon name="close" />
        </button>
      </div>

      {showRecent && <div className="st-card st-popover">{recentList}</div>}
      {error && <div className="st-error st-error-bar">{error}</div>}

      <div className="st-toolbar st-toolbar-nav">
        <div className="st-pager">
          <button className="st-icon-btn st-sm" onClick={() => goTo(page - 1)} disabled={page <= 1} aria-label="Previous page">
            <Icon name="prev" />
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(pageInput);
              if (Number.isFinite(n)) goTo(n);
              else setPageInput(String(page));
            }}
          >
            <input
              className="st-page-input"
              value={pageInput}
              inputMode="numeric"
              aria-label="Page number"
              onChange={(e) => setPageInput(e.target.value.replace(/[^\d]/g, ""))}
              onBlur={() => setPageInput(String(page))}
              onFocus={(e) => e.target.select()}
            />
          </form>
          <span className="st-muted">/ {pageCount}</span>
          <button className="st-icon-btn st-sm" onClick={() => goTo(page + 1)} disabled={page >= pageCount} aria-label="Next page">
            <Icon name="next" />
          </button>
        </div>
        <div className="st-zoom">
          <button className="st-icon-btn st-sm" onClick={() => stepZoom(-1)} disabled={zoomValue <= MIN_ZOOM} aria-label="Zoom out">
            <Icon name="minus" />
          </button>
          <button className="st-zoom-value" onClick={() => applyZoom(1)} title="Actual size">
            {Math.round(zoomValue * 100)}%
          </button>
          <button className="st-icon-btn st-sm" onClick={() => stepZoom(1)} disabled={zoomValue >= MAX_ZOOM} aria-label="Zoom in">
            <Icon name="plus" />
          </button>
          <button
            className={`st-icon-btn st-sm ${zoom === "fit" ? "is-on" : ""}`}
            onClick={() => applyZoom("fit")}
            aria-label="Fit to width"
            title="Fit to width"
          >
            <Icon name="fit" />
          </button>
        </div>
      </div>

      <div className="st-pages" ref={scrollRef} onScroll={handleScroll} tabIndex={0} aria-label="PDF pages">
        {sizes.map((size, i) => (
          <PdfPage
            key={i + 1}
            doc={doc}
            num={i + 1}
            scale={scale}
            renderScale={renderScale}
            size={size}
            active={active.has(i + 1)}
            onSize={onSize}
            setRef={setRef}
          />
        ))}
      </div>
      {loading && <div className="st-loading">Opening…</div>}
    </div>
  );
}

function timeAgo(t: number): string {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? "yesterday" : `${d}d ago`;
}
