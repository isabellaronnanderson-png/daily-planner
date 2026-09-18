import { useRef, useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';

export default function NotesWidget({ notes, setNotes, activeNoteId, setActiveNoteId }) {
  const textareaRef = useRef(null);
  const pendingCursorRef = useRef(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0];

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
    if (pendingCursorRef.current !== null && textareaRef.current) {
      const pos = pendingCursorRef.current;
      textareaRef.current.selectionStart = pos;
      textareaRef.current.selectionEnd = pos;
      pendingCursorRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNote?.content, activeNote?.id]);

  if (!activeNote) return null;

  function updateContent(content) {
    setNotes(notes.map((n) => (n.id === activeNote.id ? { ...n, content } : n)));
  }

  function addNote() {
    const id = 'note_' + Date.now();
    setNotes([...notes, { id, title: `Note ${notes.length + 1}`, content: '' }]);
    setActiveNoteId(id);
  }

  function deleteNote(id) {
    if (notes.length <= 1) return;
    const next = notes.filter((n) => n.id !== id);
    setNotes(next);
    if (activeNoteId === id) setActiveNoteId(next[0].id);
  }

  function startRename(note) {
    setRenamingId(note.id);
    setRenameValue(note.title);
  }
  function commitRename(id) {
    if (renameValue.trim()) {
      setNotes(notes.map((n) => (n.id === id ? { ...n, title: renameValue.trim() } : n)));
    }
    setRenamingId(null);
  }

  function handleKeyDown(e) {
    const el = e.target;
    const val = el.value;
    const start = el.selectionStart;

    if (e.key === ' ') {
      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      const currentLine = val.substring(lineStart, start);
      if (currentLine === '*' || currentLine === '-') {
        e.preventDefault();
        const newVal = val.substring(0, lineStart) + '\u2022 ' + val.substring(start);
        pendingCursorRef.current = lineStart + 2;
        updateContent(newVal);
        return;
      }
    }

    if (e.key === 'Enter') {
      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      const currentLine = val.substring(lineStart, start);
      const bulletMatch = currentLine.match(/^(\s*)(\u2022|-|\*)\s+(.*)/);
      if (bulletMatch) {
        e.preventDefault();
        const content = bulletMatch[3].trim();
        if (content === '') {
          const newVal = val.substring(0, lineStart) + val.substring(start);
          pendingCursorRef.current = lineStart;
          updateContent(newVal);
        } else {
          const addition = '\n' + bulletMatch[1] + '\u2022 ';
          const newVal = val.substring(0, start) + addition + val.substring(start);
          pendingCursorRef.current = start + addition.length;
          updateContent(newVal);
        }
      }
    }
  }

  return (
    <div className="scratchpad-box">
      <div className="notes-tab-row">
        {notes.map((note) => (
          <div key={note.id} className={`notes-tab ${note.id === activeNote.id ? 'active' : ''}`}>
            {renamingId === note.id ? (
              <input
                className="notes-tab-input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => commitRename(note.id)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitRename(note.id); } }}
                autoFocus
              />
            ) : (
              <button className="notes-tab-label" onClick={() => setActiveNoteId(note.id)} onDoubleClick={() => startRename(note)}>
                {note.title}
              </button>
            )}
            {notes.length > 1 && note.id === activeNote.id && (
              <button className="notes-tab-close" onClick={() => deleteNote(note.id)} aria-label="Delete note">
                <X size={11} />
              </button>
            )}
          </div>
        ))}
        <button className="notes-tab-add" onClick={addNote} aria-label="Add note" title="New note">
          <Plus size={13} />
        </button>
      </div>
      <textarea
        ref={textareaRef}
        className="scratchpad-textarea"
        placeholder="Notes, shopping lists, things for next week..."
        value={activeNote.content}
        onChange={(e) => updateContent(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
