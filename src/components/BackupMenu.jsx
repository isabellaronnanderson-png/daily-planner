import { useState, useRef, useEffect } from 'react';
import { Download, Upload, HardDriveDownload } from 'lucide-react';

export default function BackupMenu({ downloadBackup, restoreFromFile }) {
  const [open, setOpen] = useState(false);
  const fileRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (file) restoreFromFile(file);
    e.target.value = '';
    setOpen(false);
  }

  return (
    <div className="backup-menu-wrap" ref={wrapRef}>
      <button className="header-icon-btn" onClick={() => setOpen((o) => !o)} aria-label="Backup" title="Backup">
        <HardDriveDownload size={14} />
      </button>
      <div className={`backup-dropdown ${open ? 'show' : ''}`} style={{ display: open ? 'block' : 'none' }}>
        <button onClick={() => { downloadBackup(); setOpen(false); }}>
          <Download size={13} /> Download backup
        </button>
        <button onClick={() => fileRef.current.click()}>
          <Upload size={13} /> Restore from file
        </button>
      </div>
      <input ref={fileRef} type="file" accept="application/json" onChange={handleFile} style={{ display: 'none' }} />
    </div>
  );
}
