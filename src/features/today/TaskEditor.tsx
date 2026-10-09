import { useState } from "react";
import type { Task } from "../../lib/types";

export interface TaskEdit {
  title: string;
  start?: string;
  end?: string;
}

/** Inline editor for a task's title and start/end times. Enter saves, Escape cancels. */
export default function TaskEditor({
  task,
  onSave,
  onCancel,
}: {
  task: Task;
  onSave: (edit: TaskEdit) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [start, setStart] = useState(task.start ?? "");
  const [end, setEnd] = useState(task.end ?? "");

  const save = () => {
    if (!title.trim()) return;
    onSave({ title: title.trim(), start: start || undefined, end: start && end ? end : undefined });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") save();
    if (e.key === "Escape") onCancel();
  };

  return (
    <div className="task-editor" onKeyDown={onKeyDown}>
      <input
        autoFocus
        className="inline-edit"
        value={title}
        aria-label="Task title"
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="task-editor-row">
        <label>
          <span className="muted small">Start</span>
          <input type="time" className="inline-edit" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label>
          <span className="muted small">End</span>
          <input
            type="time"
            className="inline-edit"
            value={end}
            disabled={!start}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
        {start && (
          <button
            className="chip"
            onClick={() => {
              setStart("");
              setEnd("");
            }}
          >
            No time
          </button>
        )}
      </div>
      <div className="task-editor-row">
        <button className="btn" onClick={save} disabled={!title.trim()}>
          Save
        </button>
        <button className="btn ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
