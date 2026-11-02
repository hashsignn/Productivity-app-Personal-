// Shell icon set: one stroke weight, drawn on a 24px grid, so the rail and
// title bar match the Study panel's icons instead of mixing in color emoji.
const PATHS = {
  today: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12.3l2.7 2.7L16 9.7",
  history: "M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 10h16M8 3v4M16 3v4",
  study: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5",
  charts: "M4 20h16M7 16v-5M12 16V6M17 16v-8",
  window: "M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z",
  pin: "M9 4h6l-1 5 3 3v2H7v-2l3-3zM12 14v6",
  desktop: "M3 5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM9 20h6M12 16v4",
  settings:
    "M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7.5 7.5 0 0 1-2.1 1.2L14.7 21h-4l-.3-2.4a7.5 7.5 0 0 1-2.1-1.2l-1.9.7-2-3.4 1.6-1.2a7.6 7.6 0 0 1 0-2.9L4.4 9.3l2-3.4 1.9.7a7.5 7.5 0 0 1 2.1-1.2L10.7 3h4l.3 2.4a7.5 7.5 0 0 1 2.1 1.2l1.9-.7 2 3.4-1.6 1.2a7.6 7.6 0 0 1 0 2.9z",
  minimize: "M6 12h12",
  close: "M6 6l12 12M18 6L6 18",
  prev: "M15 5l-7 7 7 7",
  next: "M9 5l7 7-7 7",
  edit: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  check: "M5 12.5l4.5 4.5L19 7.5",
} as const;

export type ShellIconName = keyof typeof PATHS;

export function Icon({ name, size = 18 }: { name: ShellIconName; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
