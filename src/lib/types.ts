// Shared data shapes. Feature panels code against these, so change them
// only additively.

/** "HH:MM", 24-hour. */
export type Time = string;

export interface Task {
  id: string;
  title: string;
  start?: Time;
  end?: Time;
  done: boolean;
  /** ISO timestamp of when it was ticked off. */
  doneAt?: string;
  /** See CATEGORIES in parser.ts. */
  category?: string;
}

export interface Photo {
  id: string;
  /** File name inside the app data photos/ folder. Use photoSrc() to display it. */
  fileName: string;
  caption?: string;
  addedAt: string;
}

export interface Day {
  /** "YYYY-MM-DD" */
  date: string;
  tasks: Task[];
  photos: Photo[];
  note?: string;
}
