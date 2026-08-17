import { useRef } from 'react';
import { ImagePlus, RefreshCw, X } from 'lucide-react';

const TABS = [
  { key: 'habits', label: 'Habits' },
  { key: 'weekend', label: 'Weekend' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'todo', label: 'To-do' },
  { key: 'chores', label: 'Chores' },
];

export default function Header({ coverImage, setCoverImage, activeTab, setActiveTab }) {
  const fileRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCoverImage(reader.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <>
      <div className="cover">
        {coverImage ? (
          <img src={coverImage} alt="" />
        ) : (
          <button className="cover-empty" onClick={() => fileRef.current.click()}>
            <ImagePlus size={16} /> Add a cover photo
          </button>
        )}
        {coverImage && (
          <div className="cover-controls">
            <button className="cover-btn" onClick={() => fileRef.current.click()}><RefreshCw size={12} /> Change</button>
            <button className="cover-btn" onClick={() => setCoverImage(null)}><X size={12} /> Remove</button>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
      </div>

      <div className="header-block">
        <div className="header-title-row">
          <h1 className="header-title">isabella's planner</h1>
        </div>
        <p className="header-date">{today}</p>
      </div>

      <nav className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </>
  );
}
