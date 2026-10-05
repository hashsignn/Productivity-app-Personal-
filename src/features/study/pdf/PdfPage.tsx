import { memo, useEffect, useRef } from "react";
import { pdfjs, type PDFDocumentProxy, type RenderTask } from "./pdfjs";

export interface PageSize {
  w: number;
  h: number;
}

// Stay under browser canvas limits on big pages at high zoom.
const MAX_CANVAS_PIXELS = 16_777_216;

interface Props {
  doc: PDFDocumentProxy;
  num: number;
  /** Layout scale (CSS px per PDF unit); changes immediately while zooming. */
  scale: number;
  /** Scale to actually rasterise at; lags `scale` so zooming stays smooth. */
  renderScale: number;
  size: PageSize;
  /** Near the viewport, so worth rendering. */
  active: boolean;
  onSize: (num: number, size: PageSize) => void;
  setRef: (num: number, el: HTMLDivElement | null) => void;
}

export const PdfPage = memo(function PdfPage({ doc, num, scale, renderScale, size, active, onSize, setRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const text = textRef.current;
    if (!canvas || !text) return;
    if (!active) {
      // Free the bitmap for pages far from view.
      canvas.width = 0;
      canvas.height = 0;
      text.replaceChildren();
      return;
    }
    let cancelled = false;
    let task: RenderTask | null = null;
    let textLayer: InstanceType<typeof pdfjs.TextLayer> | null = null;

    (async () => {
      const page = await doc.getPage(num);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      if (Math.abs(base.width - size.w) > 0.5 || Math.abs(base.height - size.h) > 0.5) {
        onSize(num, { w: base.width, h: base.height });
      }
      const viewport = page.getViewport({ scale: renderScale });
      let dpr = Math.min(window.devicePixelRatio || 1, 3);
      const area = viewport.width * viewport.height;
      if (area * dpr * dpr > MAX_CANVAS_PIXELS) dpr = Math.sqrt(MAX_CANVAS_PIXELS / area);

      // Draw off-screen first so the old bitmap stays visible until the new one is ready.
      const off = document.createElement("canvas");
      off.width = Math.floor(viewport.width * dpr);
      off.height = Math.floor(viewport.height * dpr);
      task = page.render({
        canvas: off,
        viewport,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
      });
      await task.promise;
      if (cancelled) return;
      canvas.width = off.width;
      canvas.height = off.height;
      canvas.getContext("2d")?.drawImage(off, 0, 0);
      off.width = 0;

      // Selectable text on top of the bitmap.
      text.replaceChildren();
      textLayer = new pdfjs.TextLayer({
        textContentSource: page.streamTextContent(),
        container: text,
        viewport,
      });
      await textLayer.render();
    })().catch(() => {
      /* cancelled renders reject; nothing to do */
    });

    return () => {
      cancelled = true;
      task?.cancel();
      textLayer?.cancel();
    };
    // size is intentionally excluded: it only feeds the onSize check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, num, renderScale, active, onSize]);

  return (
    <div
      ref={(el) => setRef(num, el)}
      className="st-page"
      data-page={num}
      style={
        {
          width: Math.floor(size.w * scale),
          height: Math.floor(size.h * scale),
          "--total-scale-factor": scale,
          "--scale-round-x": "1px",
          "--scale-round-y": "1px",
        } as React.CSSProperties
      }
    >
      <canvas ref={canvasRef} />
      <div ref={textRef} className="textLayer" />
      {!active && <span className="st-page-num">{num}</span>}
    </div>
  );
});
