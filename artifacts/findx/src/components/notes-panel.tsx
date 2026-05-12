import { useState } from "react";
import { StickyNote, Plus, Clock } from "lucide-react";
import type { Lead } from "../lib/types";

interface Note {
  id: string;
  text: string;
  createdAt: string;
}

export function NotesPanel({ lead: _lead }: { lead: Lead }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");

  function addNote() {
    if (!text.trim()) return;
    setNotes((prev) => [
      { id: Date.now().toString(), text: text.trim(), createdAt: new Date().toISOString() },
      ...prev,
    ]);
    setText("");
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a note about this lead..."
          rows={3}
          className="input resize-none"
          style={{ fontFamily: "inherit" }}
        />
        <button
          onClick={addNote}
          disabled={!text.trim()}
          className="btn btn-secondary text-xs gap-1.5 disabled:opacity-50"
        >
          <Plus className="w-3 h-3" />
          Add Note
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <StickyNote className="w-7 h-7 opacity-20" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--text-subtle)" }}>No notes yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="glass-card p-3"
              style={{ borderLeft: "3px solid var(--color-warning)" }}
            >
              <p className="text-sm" style={{ color: "var(--text)" }}>{note.text}</p>
              <p
                className="text-xs mt-1.5 flex items-center gap-1"
                style={{ color: "var(--text-subtle)" }}
              >
                <Clock className="w-3 h-3" />
                {new Date(note.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
