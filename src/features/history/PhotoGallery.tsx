import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { photoSrc } from "../../lib/storage";
import type { Photo } from "./historyApi";

interface Props {
  photos: Photo[];
  busy: boolean;
  onAdd: () => void;
  onCaption: (id: string, caption: string) => void;
  onRemove: (id: string) => void;
}

function usePhotoSrc(photo: Photo | null): string | undefined {
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    let live = true;
    setSrc(undefined);
    if (photo)
      photoSrc(photo)
        .then((s) => live && setSrc(s))
        .catch(() => {});
    return () => {
      live = false;
    };
  }, [photo?.id, photo?.fileName]);
  return src;
}

function Thumb({ photo, onOpen }: { photo: Photo; onOpen: () => void }) {
  const src = usePhotoSrc(photo);
  return (
    <button className="hx-thumb" onClick={onOpen} title={photo.caption || photo.fileName}>
      {src ? (
        <img src={src} alt={photo.caption || "Achievement photo"} loading="lazy" />
      ) : (
        <span className="hx-thumb-ph" />
      )}
      {photo.caption && <span className="hx-thumb-cap">{photo.caption}</span>}
    </button>
  );
}

export default function PhotoGallery({ photos, busy, onAdd, onCaption, onRemove }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const open = openIdx !== null ? (photos[openIdx] ?? null) : null;
  const src = usePhotoSrc(open);
  const [draft, setDraft] = useState("");

  useEffect(() => setDraft(open?.caption ?? ""), [open?.id]);

  useEffect(() => {
    if (openIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "Escape") setOpenIdx(null);
      if (e.key === "ArrowRight") setOpenIdx((i) => (i === null ? i : (i + 1) % photos.length));
      if (e.key === "ArrowLeft")
        setOpenIdx((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIdx, photos.length]);

  const saveCaption = () => {
    if (open && draft.trim() !== (open.caption ?? "")) onCaption(open.id, draft.trim());
  };

  return (
    <section className="hx-section">
      <div className="hx-section-head">
        <h3>Achievements</h3>
        <button className="btn ghost hx-add" onClick={onAdd} disabled={busy}>
          {busy ? "Adding…" : "+ Add photo"}
        </button>
      </div>
      {photos.length === 0 ? (
        <p className="hx-empty">No photos yet. Add one to remember what you pulled off today.</p>
      ) : (
        <div className="hx-gallery">
          {photos.map((p, i) => (
            <Thumb key={p.id} photo={p} onOpen={() => setOpenIdx(i)} />
          ))}
        </div>
      )}

      {open &&
        createPortal(
          <div className="hx-lightbox" onClick={() => setOpenIdx(null)}>
            <div className="hx-lightbox-card glass card" onClick={(e) => e.stopPropagation()}>
              {src ? (
                <img src={src} alt={open.caption || "Achievement photo"} />
              ) : (
                <div className="hx-thumb-ph hx-lightbox-ph" />
              )}
              <div className="hx-lightbox-bar">
                <input
                  className="hx-input"
                  placeholder="Add a caption…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={saveCaption}
                  onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
                />
                {photos.length > 1 && (
                  <>
                    <button
                      className="icon-btn"
                      onClick={() => setOpenIdx((openIdx! - 1 + photos.length) % photos.length)}
                      aria-label="Previous photo"
                    >
                      ‹
                    </button>
                    <button
                      className="icon-btn"
                      onClick={() => setOpenIdx((openIdx! + 1) % photos.length)}
                      aria-label="Next photo"
                    >
                      ›
                    </button>
                  </>
                )}
                <button
                  className="icon-btn close"
                  aria-label="Remove photo"
                  title="Remove from this day"
                  onClick={() => {
                    if (confirm("Remove this photo from the day?")) {
                      onRemove(open.id);
                      setOpenIdx(null);
                    }
                  }}
                >
                  🗑
                </button>
                <button className="icon-btn" onClick={() => setOpenIdx(null)} aria-label="Close">
                  ✕
                </button>
              </div>
              <span className="hx-lightbox-meta">Added {new Date(open.addedAt).toLocaleString()}</span>
            </div>
          </div>,
          document.querySelector(".app") ?? document.body,
        )}
    </section>
  );
}
