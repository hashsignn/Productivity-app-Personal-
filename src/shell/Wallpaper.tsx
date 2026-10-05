import { useEffect, useState } from "react";
import { useApp } from "./AppContext";
import { fileSrc } from "../lib/storage";

/** The custom image behind the glass. With opacity below 1 the blurred desktop shows through. */
export default function Wallpaper() {
  const { settings } = useApp();
  const [src, setSrc] = useState<string>();

  useEffect(() => {
    if (!settings.wallpaper) return setSrc(undefined);
    fileSrc(settings.wallpaper).then(setSrc).catch(console.error);
  }, [settings.wallpaper]);

  return (
    <div className="wallpaper" aria-hidden>
      <div className="wallpaper-tint" />
      {src && (
        <div
          className="wallpaper-img"
          style={{
            backgroundImage: `url("${src}")`,
            opacity: settings.wallpaperOpacity,
            filter: settings.wallpaperBlur ? `blur(${settings.wallpaperBlur}px)` : undefined,
          }}
        />
      )}
    </div>
  );
}
