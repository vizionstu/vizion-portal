/* VIZION Portal — shared UI primitives. Exports to window. */
const { useState, useEffect, useRef, useCallback } = React;

/* ---------- helpers ---------- */
function cx(...a) { return a.filter(Boolean).join(' '); }

function relTime(iso) {
  const d = new Date(iso), now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  const days = Math.floor(diff / 86400);
  if (days < 30) return days + (days === 1 ? ' day ago' : ' days ago');
  if (days < 365) return Math.floor(days / 30) + 'mo ago';
  return Math.floor(days / 365) + 'y ago';
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}
function relShort(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h';
  const days = Math.floor(diff / 86400);
  if (days < 7) return days + 'd';
  if (days < 30) return Math.floor(days / 7) + 'w';
  if (days < 365) return Math.floor(days / 30) + 'mo';
  return Math.floor(days / 365) + 'y';
}

/* ---------- icons (simple strokes only) ---------- */
function Icon({ name, size = 16, stroke = 1.6, style }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round', style };
  const paths = {
    download: <><path d="M12 3v12" /><path d="M7 11l5 5 5-5" /><path d="M4 20h16" /></>,
    arrow: <><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>,
    external: <><path d="M14 4h6v6" /><path d="M20 4l-9 9" /><path d="M19 14v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></>,
    copy: <><rect x="9" y="9" width="11" height="11" rx="1.5" /><path d="M5 15V5a1 1 0 0 1 1-1h9" /></>,
    check: <path d="M4 12l5 5L20 6" />,
    code: <><path d="M9 8l-5 4 5 4" /><path d="M15 8l5 4-5 4" /></>,
    qr: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3" /><path d="M20 14v0" /><path d="M14 20h3" /><path d="M20 17v4" /></>,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    trash: <><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /></>,
    edit: <><path d="M4 20h4L19 9l-4-4L4 16v4z" /><path d="M14 6l4 4" /></>,
    up: <path d="M6 15l6-6 6 6" />,
    down: <path d="M6 9l6 6 6-6" />,
    image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 16l-5-5L5 21" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
    link: <><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" /></>,
    layers: <><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5" /></>,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="2.5" /></>,
    back: <path d="M15 6l-6 6 6 6" />,
    x: <><path d="M6 6l12 12" /><path d="M18 6L6 18" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    pin: <><path d="M9 4v4a2 2 0 0 1-2 2H5l1 5h12l1-5h-2a2 2 0 0 1-2-2V4" /><path d="M12 15v6" /><path d="M8 4h8" /></>,

  };
  return <svg {...common}>{paths[name] || null}</svg>;
}

/* ---------- VIZION STUDIO wordmark ---------- */
function Wordmark({ size = 1, light = false }) {
  return (
    <a href="https://vizionstu.com/" target="_blank" rel="noopener noreferrer" className="vz-mark" style={{ '--mk': size, textDecoration: 'none', color: 'inherit' }}>
      <img src="logo.png" alt="VIZION STUDIO" className="vz-mark-logo" aria-hidden="true" />
      <div className="vz-mark-text">
        <div className="vz-mark-name">VIZION <span className="vz-mark-studio">STUDIO</span></div>
        <div className="vz-mark-sub">3D Architectural Visualization</div>
      </div>
    </a>
  );
}

/* ---------- Toast ---------- */
const ToastCtx = React.createContext(() => {});
function ToastHost({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, kind) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2400);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="vz-toasts">
        {toasts.map((t) => (
          <div key={t.id} className={cx('vz-toast', t.kind)}>
            <Icon name={t.kind === 'error' ? 'x' : 'check'} size={14} />
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
function useToast() { return React.useContext(ToastCtx); }

/* ---------- Copy button ---------- */
function CopyButton({ text, label = 'Copy', className, small }) {
  const [done, setDone] = useState(false);
  const toast = useToast();
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e2) {}
      document.body.removeChild(ta);
    }
    setDone(true); toast('Copied to clipboard');
    setTimeout(() => setDone(false), 1400);
  };
  return (
    <button type="button" className={cx('vz-copy', small && 'sm', className)} onClick={onClick}>
      <Icon name={done ? 'check' : 'copy'} size={small ? 12 : 14} />
      <span>{done ? 'Copied' : label}</span>
    </button>
  );
}

/* ---------- Image drop zone ---------- */
function DropZone({ value, onFile, onClear, label, hint, aspect = '4 / 3', kind = 'thumb' }) {
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const toast = useToast();

  const handle = async (file) => {
    if (!file || !file.type.startsWith('image/')) { toast('Please drop an image file', 'error'); return; }
    setBusy(true);
    try {
      const data = kind === 'qr' ? await VZ.qrFromFile(file) : await VZ.thumbFromFile(file);
      onFile(data);
    } catch (e) { toast('Could not read image', 'error'); }
    setBusy(false);
  };

  return (
    <div
      className={cx('vz-drop', drag && 'drag', value && 'has')}
      style={{ aspectRatio: aspect }}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
      onClick={() => inputRef.current && inputRef.current.click()}
    >
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => handle(e.target.files[0])} />
      {value ? (
        <>
          <img src={value} alt="" className={cx('vz-drop-img', kind === 'qr' && 'qr')} />
          <button type="button" className="vz-drop-clear" onClick={(e) => { e.stopPropagation(); onClear(); }}>
            <Icon name="x" size={13} />
          </button>
        </>
      ) : (
        <div className="vz-drop-empty">
          <Icon name={kind === 'qr' ? 'qr' : 'image'} size={22} />
          <div className="vz-drop-label">{busy ? 'Processing…' : (label || 'Drop image')}</div>
          {hint && <div className="vz-drop-hint">{hint}</div>}
        </div>
      )}
    </div>
  );
}

/* ---------- striped placeholder ---------- */
function Placeholder({ text = 'render', className }) {
  return (
    <div className={cx('vz-ph', className)}>
      <span>{text}</span>
    </div>
  );
}

/* ---------- Field ---------- */
function Field({ label, hint, children, required }) {
  return (
    <label className="vz-field">
      <div className="vz-field-top">
        <span className="vz-field-label">{label}{required && <i> *</i>}</span>
        {hint && <span className="vz-field-hint">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

Object.assign(window, {
  cx, relTime, relShort, fmtDate, Icon, Wordmark,
  ToastHost, useToast, CopyButton, DropZone, Placeholder, Field,
});
