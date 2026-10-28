import { useState, useRef } from 'react';
import { Pencil, ImagePlus, X, Check, Square } from 'lucide-react';

// Up to three priorities, always typed by hand (never pulled from the to-do
// list). Optional: leave them blank and only the note/photo shows.
const MAX_PRIORITIES = 3;
function padTo3(list) {
  const rows = list.slice(0, MAX_PRIORITIES).map((p) => ({ ...p }));
  while (rows.length < MAX_PRIORITIES) {
    rows.push({ id: 'dp_' + Date.now() + Math.random().toString(36).slice(2, 6), text: '', done: false });
  }
  return rows;
}

export default function DailyNote({ text, setText, image, setImage, priorities, setPriorities }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text || '');
  const [draftPriorities, setDraftPriorities] = useState(() => padTo3(priorities));
  const fileRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1000;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        let quality = 0.85;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > 900_000 && quality > 0.4) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        setImage(dataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function startEdit() {
    setDraft(text || '');
    setDraftPriorities(padTo3(priorities));
    setEditing(true);
  }
  function commit() {
    setText(draft);
    setPriorities(draftPriorities.filter((p) => p.text.trim()).map((p) => ({ ...p, text: p.text.trim() })));
    setEditing(false);
  }
  function togglePriority(id) {
    setPriorities(priorities.map((p) => (p.id === id ? { ...p, done: !p.done } : p)));
  }

  const isEmpty = !text && !image && priorities.length === 0;

  if (!editing && isEmpty) {
    return (
      <button className="daily-note-empty" onClick={startEdit}>
        + Add a daily note, photo or priorities
      </button>
    );
  }

  if (!editing) {
    return (
      <div className="daily-note">
        {image && <img src={image} alt="" className="daily-note-img" />}
        {text && <p className="daily-note-text">{text}</p>}
        {priorities.length > 0 && (
          <div className={`daily-priorities ${text || image ? 'with-divider' : ''}`}>
            <div className="daily-priorities-label">Priorities</div>
            {priorities.map((p) => (
              <div className="daily-priority-row" key={p.id}>
                <button
                  className={`check-btn ${p.done ? '' : 'unchecked'}`}
                  onClick={() => togglePriority(p.id)}
                  aria-label={p.done ? 'Mark not done' : 'Mark done'}
                >
                  {p.done ? <Check size={16} /> : <Square size={16} />}
                </button>
                <span style={p.done ? { textDecoration: 'line-through', opacity: 0.5 } : undefined}>{p.text}</span>
              </div>
            ))}
          </div>
        )}
        <button className="daily-note-edit-btn" onClick={startEdit} aria-label="Edit note">
          <Pencil size={13} />
        </button>
      </div>
    );
  }

  return (
    <div className="daily-note daily-note-editing">
      {image && (
        <div className="daily-note-img-wrap">
          <img src={image} alt="" className="daily-note-img" />
          <button className="cover-btn daily-note-remove-img" onClick={() => setImage(null)}>
            <X size={12} /> Remove photo
          </button>
        </div>
      )}
      <textarea
        className="scratchpad-textarea"
        placeholder="A quote, intention, or note for today..."
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        autoFocus
      />
      <div className="daily-priorities-label" style={{ marginTop: 12 }}>Priorities <span style={{ color: 'var(--text-muted)', fontStyle: 'normal', fontFamily: 'var(--font-sans)', fontSize: 11.5 }}>(optional — up to 3)</span></div>
      {draftPriorities.map((p, i) => (
        <input
          key={p.id}
          type="text"
          className="daily-priority-input"
          placeholder={`Priority ${i + 1}`}
          value={p.text}
          onChange={(e) => setDraftPriorities((prev) => prev.map((x) => (x.id === p.id ? { ...x, text: e.target.value } : x)))}
        />
      ))}
      <div className="daily-note-actions">
        <button type="button" className="btn btn-sm" onClick={() => fileRef.current.click()}>
          <ImagePlus size={12} /> {image ? 'Change photo' : 'Add photo'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
        <button type="button" className="btn btn-primary btn-sm" onClick={commit}>
          <Check size={12} /> Done
        </button>
      </div>
    </div>
  );
}
