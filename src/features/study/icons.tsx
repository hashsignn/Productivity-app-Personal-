// Small stroke icons, inline so the feature has no icon-font dependency.
const PATHS = {
  play: "M8 5.5v13l10.5-6.5z",
  pause: "M8 5v14M16 5v14",
  reset: "M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5",
  skip: "M6 5.5v13l9-6.5zM18 5v14",
  gear: "M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7.5 7.5 0 0 1-2.1 1.2L14.7 21h-4l-.3-2.4a7.5 7.5 0 0 1-2.1-1.2l-1.9.7-2-3.4 1.6-1.2a7.6 7.6 0 0 1 0-2.9L4.4 9.3l2-3.4 1.9.7a7.5 7.5 0 0 1 2.1-1.2L10.7 3h4l.3 2.4a7.5 7.5 0 0 1 2.1 1.2l1.9-.7 2 3.4-1.6 1.2a7.6 7.6 0 0 1 0 2.9z",
  timer: "M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l2.5 2M9.5 2.5h5",
  book: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5",
  open: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  prev: "M15 5l-7 7 7 7",
  next: "M9 5l7 7-7 7",
  minus: "M5 12h14",
  plus: "M12 5v14M5 12h14",
  fit: "M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4",
  close: "M6 6l12 12M18 6L6 18",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const filled = name === "play" || name === "skip";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 1.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
