/* VIZION Portal — Admin. Exports AdminApp + ManageView to window. */
(function () {
  const { useState, useEffect, useMemo, useRef } = React;

  const shareUrlFor = (slug) => location.origin + location.pathname + '#/c/' + slug;
  const PARTS = ['None', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

  /* ---------- Modal ---------- */
  function Modal({ title, onClose, children, wide }) {
    useEffect(() => {
      const k = (e) => e.key === 'Escape' && onClose();
      document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k);
    }, [onClose]);
    return (
      <div className="vz-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div className={cx('vz-modal', wide && 'wide')}>
          <div className="vz-modal-head"><h3>{title}</h3><button type="button" className="vz-iconbtn" onClick={onClose}><Icon name="x" size={16} /></button></div>
          <div className="vz-modal-body">{children}</div>
        </div>
      </div>
    );
  }

  /* ---------- Combobox (typeable + suggestions) ---------- */
  function ComboField({ value, onType, options, onPick, placeholder }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const filtered = options.filter((o) => !value || o.label.toLowerCase().includes(value.toLowerCase()) || o.sub.toLowerCase().includes(value.toLowerCase()));
    return (
      <div className="vz-combo" ref={ref}>
        <input className="vz-input" value={value} placeholder={placeholder}
          onChange={(e) => { onType(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 140)} />
        {open && filtered.length > 0 && (
          <div className="vz-combo-list">
            {filtered.map((o, i) => (
              <button type="button" key={i} className="vz-combo-opt" onMouseDown={(e) => { e.preventDefault(); onPick(o.pair); setOpen(false); }}>
                <span className="vz-combo-opt-main">{o.label}</span>
                <span className="vz-combo-opt-sub">{o.sub}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ---------- Format select ---------- */
  function FormatSelect({ value, onChange }) {
    const [formats, setFormats] = useState(VZ.listFormats());
    const [adding, setAdding] = useState(false);
    const [val, setVal] = useState('');
    const toast = useToast();
    const commit = () => { const f = VZ.addFormat(val); if (f) { setFormats(VZ.listFormats()); onChange(f); toast('Format "' + f + '" added'); } setVal(''); setAdding(false); };
    return (
      <div className="vz-fmtsel">
        {!adding ? (
          <>
            <select className="vz-input" value={value} onChange={(e) => onChange(e.target.value)}>{formats.map((f) => <option key={f} value={f}>{f}</option>)}</select>
            <button type="button" className="vz-btn ghost sm" onClick={() => setAdding(true)}><Icon name="plus" size={13} />New</button>
          </>
        ) : (
          <>
            <input className="vz-input" autoFocus value={val} placeholder="e.g. WEBP" onChange={(e) => setVal(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), commit())} />
            <button type="button" className="vz-btn primary sm" onClick={commit}>Add</button>
            <button type="button" className="vz-btn ghost sm" onClick={() => setAdding(false)}>Cancel</button>
          </>
        )}
      </div>
    );
  }

  function TypeChooser({ onPick }) {
    return (
      <div className="vz-typechoose">
        <button type="button" className="vz-typecard" onClick={() => onPick('download')}>
          <Icon name="download" size={26} /><div className="vz-typecard-t">Download Link</div>
          <div className="vz-typecard-d">A direct cloud link to a rendered image set (JPG, PNG, floor plans…).</div>
        </button>
        <button type="button" className="vz-typecard" onClick={() => onPick('tour')}>
          <Icon name="qr" size={26} /><div className="vz-typecard-t">Virtual Tour</div>
          <div className="vz-typecard-d">A 3D tour with direct link, QR code and an embeddable iframe snippet.</div>
        </button>
      </div>
    );
  }

  /* ---------- Deliverable form ---------- */
  function EntryForm({ client, card, initial, onDone, onCancel }) {
    const isEdit = !!initial;
    const [type, setType] = useState(initial ? initial.type : null);
    const prefill = card.kind === 'normal' ? { projectName: card.name, projectId: card.projectId } : { projectName: '', projectId: '' };
    const [f, setF] = useState(() => Object.assign(
      { projectName: '', projectId: '', part: 'None', detail: '', link: '', format: VZ.listFormats()[0] || 'JPG', directLink: '', embedCode: '', qr: null, thumb: null },
      prefill, initial || {}
    ));
    const toast = useToast();
    const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

    const opts = useMemo(() => VZ.projectOptions(client).map((o) => ({ label: o.name, sub: o.projectId, pair: o })), [client]);
    const typeName = (v) => setF((p) => { const m = opts.find((o) => o.label === v); return { ...p, projectName: v, projectId: m ? m.pair.projectId : p.projectId }; });
    const typeId = (v) => setF((p) => { const m = opts.find((o) => o.sub === v); return { ...p, projectId: v, projectName: m ? m.pair.name : p.projectName }; });
    const pickPair = (pair) => setF((p) => ({ ...p, projectName: pair.name, projectId: pair.projectId }));

    if (!type) return (
      <div className="vz-form">
        <div className="vz-form-head"><h3>New Deliverable</h3><button type="button" className="vz-iconbtn" onClick={onCancel}><Icon name="x" size={16} /></button></div>
        <p className="vz-form-sub">What are you delivering?</p>
        <TypeChooser onPick={setType} />
      </div>
    );

    const genQR = () => {
      if (!f.directLink) { toast('Enter the direct link first', 'error'); return; }
      const qr = VZ.generateQR(f.directLink);
      if (qr) { set('qr', qr); toast('QR generated from link'); } else toast('QR generator unavailable — upload instead', 'error');
    };

    const submit = (e) => {
      e.preventDefault();
      if (!f.projectName.trim()) { toast('Project name is required', 'error'); return; }
      if (!f.projectId.trim()) { toast('Project ID is required', 'error'); return; }
      if (type === 'download' && !f.link.trim()) { toast('Download link is required', 'error'); return; }
      if (type === 'tour' && !f.directLink.trim()) { toast('Direct link is required', 'error'); return; }
      const common = { type, projectName: f.projectName.trim(), projectId: f.projectId.trim(), part: f.part, detail: f.detail.trim(), thumb: f.thumb };
      const payload = type === 'download'
        ? Object.assign(common, { link: f.link.trim(), format: f.format })
        : Object.assign(common, { directLink: f.directLink.trim(), embedCode: f.embedCode.trim(), qr: f.qr });
      if (isEdit) { VZ.updateDeliverable(client.id, initial.id, payload); toast('Deliverable updated'); }
      else { VZ.addDeliverable(client.id, payload); toast('Deliverable published'); }
      onDone();
    };

    const composed = VZ.composeId(f.projectId, f.part);

    return (
      <form className="vz-form" onSubmit={submit}>
        <div className="vz-form-head">
          <h3>{isEdit ? 'Edit' : 'New'} {type === 'tour' ? 'Virtual Tour' : 'Download Link'}</h3>
          <button type="button" className="vz-iconbtn" onClick={onCancel}><Icon name="x" size={16} /></button>
        </div>

        <div className="vz-form-grid">
          <div className="vz-form-col">
            <div className="vz-field-pair">
              <Field label="Project name" required hint="type or pick">
                <ComboField value={f.projectName} onType={typeName} onPick={pickPair} options={opts} placeholder="e.g. Marc & Mada [Bldg 2] Amenity" />
              </Field>
            </div>
            <div className="vz-row-2">
              <Field label="Project ID" required hint="type or pick">
                <ComboField value={f.projectId} onType={typeId} onPick={pickPair} options={opts} placeholder="e.g. TM-2506" />
              </Field>
              <Field label="Part">
                <select className="vz-input" value={f.part} onChange={(e) => set('part', e.target.value)}>{PARTS.map((p) => <option key={p} value={p}>{p}</option>)}</select>
              </Field>
            </div>
            {composed && <div className="vz-idpreview">Displays as <code>{composed}</code></div>}
            <Field label="Detail" hint="shown beside the project name">
              <textarea className="vz-input vz-textarea-sm" rows={2} value={f.detail} onChange={(e) => set('detail', e.target.value)} placeholder="e.g. Rooftop amenity & sky lounge — dusk lighting pass." />
            </Field>

            {type === 'download' ? (
              <>
                <Field label="Download link" required>
                  <input className="vz-input" value={f.link} onChange={(e) => set('link', e.target.value)} placeholder="https://drive.google.com/…" />
                </Field>
                <Field label="File format" required><FormatSelect value={f.format} onChange={(v) => set('format', v)} /></Field>
              </>
            ) : (
              <>
                <Field label="Direct link" required>
                  <input className="vz-input" value={f.directLink} onChange={(e) => set('directLink', e.target.value)} placeholder="https://biganto.com/tour/…" />
                </Field>
                <Field label="Embed code" hint="iframe snippet">
                  <textarea className="vz-input vz-textarea" rows={4} value={f.embedCode} onChange={(e) => set('embedCode', e.target.value)} placeholder='<iframe src="…" width="100%" height="600" …></iframe>' />
                </Field>
              </>
            )}
          </div>

          <div className="vz-form-col">
            {type === 'tour' && (
              <Field label="QR code" hint="upload or generate">
                <DropZone kind="qr" aspect="1 / 1" value={f.qr} onFile={(d) => set('qr', d)} onClear={() => set('qr', null)} label="Drop QR image" hint="PNG / JPG" />
                <button type="button" className="vz-btn ghost sm vz-genqr" onClick={genQR}><Icon name="qr" size={13} />Generate from link</button>
              </Field>
            )}
            <Field label="Thumbnail preview" hint="optional">
              <DropZone kind="thumb" aspect="4 / 3" value={f.thumb} onFile={(d) => set('thumb', d)} onClear={() => set('thumb', null)} label="Drop render preview" hint="JPG / PNG — drag & drop" />
            </Field>
          </div>
        </div>

        <div className="vz-form-actions">
          <button type="button" className="vz-btn ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="vz-btn primary"><Icon name="check" size={15} />{isEdit ? 'Save changes' : 'Publish deliverable'}</button>
        </div>
      </form>
    );
  }

  /* ---------- Confirm Action Modal ---------- */
  function ConfirmAction({ title, message, confirmLabel, danger, onConfirm, onCancel }) {
    return (
      <Modal title={title} onClose={onCancel}>
        <p style={{ margin: '0 0 18px', fontSize: '13.5px', color: 'var(--ink-2)', lineHeight: 1.55 }}>{message}</p>
        <div className="vz-form-actions">
          <button type="button" className="vz-btn ghost" onClick={onCancel}>Cancel</button>
          <button type="button" className={cx('vz-btn', danger ? 'danger-solid' : 'primary')} onClick={onConfirm}>
            <Icon name={danger ? 'trash' : 'check'} size={14} />{confirmLabel}
          </button>
        </div>
      </Modal>
    );
  }

  /* ---------- Unpin Old Modal ---------- */
  function UnpinOldModal({ client, oldPinned, onClose }) {
    const [selected, setSelected] = useState(() => new Set(oldPinned.map((e) => e.id)));
    const toast = useToast();
    const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const doUnpin = () => {
      if (selected.size > 0) { VZ.unpinDeliverables(client.id, [...selected]); toast(selected.size + ' item(s) unpinned'); }
      onClose();
    };
    const unpinAll = () => { VZ.unpinDeliverables(client.id, oldPinned.map((e) => e.id)); toast('All old pins removed'); onClose(); };
    return (
      <Modal title="Unpin Old Items?" onClose={onClose} wide>
        <p style={{ margin: '0 0 14px', fontSize: '13.5px', color: 'var(--ink-2)', lineHeight: 1.55 }}>
          These pinned deliverables are older than 7 days. Would you like to unpin any of them?
        </p>
        <div className="vz-unpin-list">
          {oldPinned.map((e) => {
            const composed = VZ.composeId(e.projectId, e.part);
            return (
              <label key={e.id} className={cx('vz-unpin-item', selected.has(e.id) && 'checked')}>
                <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggle(e.id)} />
                <div className="vz-unpin-info">
                  <div className="vz-unpin-name">{e.projectName}</div>
                  <div className="vz-unpin-meta">
                    {composed && <span className="vz-adminrow-code">{composed}</span>}
                    <span>{e.type === 'tour' ? 'Virtual Tour' : e.format}</span>
                    <span>·</span>
                    <span>{fmtDate(e.createdAt)}</span>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
        <div className="vz-form-actions" style={{ marginTop: 18, paddingTop: 16 }}>
          <button type="button" className="vz-btn ghost" onClick={onClose}>Skip</button>
          <button type="button" className="vz-btn ghost" onClick={unpinAll}>Unpin All</button>
          <button type="button" className="vz-btn primary" onClick={doUnpin} disabled={selected.size === 0}><Icon name="check" size={15} />Unpin Selected ({selected.size})</button>
        </div>
      </Modal>
    );
  }

  /* ---------- Deliverable row (manage) ---------- */
  function EntryRow({ entry, client, card, subset, idx, onEdit, refresh }) {
    const toast = useToast();
    const [confirmAction, setConfirmAction] = useState(null);
    const isTour = entry.type === 'tour';
    const composed = VZ.composeId(entry.projectId, entry.part);
    const isPinned = !!entry.pinned;
    return (
      <div className={cx('vz-adminrow', isPinned && 'pinned')}>
        <div className="vz-adminrow-thumb">
          {entry.thumb ? <img src={entry.thumb} alt="" /> : entry.qr ? <img src={entry.qr} alt="" className="qr" /> : <div className="vz-adminrow-ph"><Icon name={isTour ? 'qr' : 'image'} size={16} /></div>}
        </div>
        <div className="vz-adminrow-main">
          <div className="vz-adminrow-meta">
            <span className={cx('vz-pill', isTour ? 'tour' : 'dl')}>{isTour ? 'Virtual Tour' : entry.format}</span>
            {composed && <span className="vz-adminrow-code">{composed}</span>}
            {isPinned && <span className="vz-pill pinned"><Icon name="pin" size={10} />Pinned</span>}
          </div>
          <div className="vz-adminrow-title">{entry.projectName}</div>
          {entry.detail && <div className="vz-adminrow-detail">{entry.detail}</div>}
          <div className="vz-adminrow-date">{fmtDate(entry.createdAt)} · updated {relTime(entry.updatedAt || entry.createdAt)}</div>
        </div>
        <div className="vz-adminrow-actions">
          <div className="vz-adminrow-actions-row">
            <button type="button" className="vz-iconbtn" onClick={() => onEdit(entry)} title="Edit"><Icon name="edit" size={15} /></button>
            <button type="button" className="vz-iconbtn" onClick={() => setConfirmAction('duplicate')} title="Duplicate"><Icon name="copy" size={15} /></button>
            <button type="button" className="vz-iconbtn danger" onClick={() => setConfirmAction('delete')} title="Delete"><Icon name="trash" size={15} /></button>
          </div>
          <div className="vz-adminrow-actions-row">
            <button type="button" className={cx('vz-iconbtn', isPinned && 'pin-active')} onClick={() => { VZ.togglePin(client.id, entry.id); toast(isPinned ? 'Unpinned' : 'Pinned'); refresh(); }} title={isPinned ? 'Unpin' : 'Pin'}><Icon name="pin" size={15} /></button>
            <button type="button" className="vz-iconbtn" disabled={idx === 0} onClick={() => { VZ.moveDeliverable(client.id, entry.id, -1, card); refresh(); }} title="Move up"><Icon name="up" size={15} /></button>
            <button type="button" className="vz-iconbtn" disabled={idx === subset - 1} onClick={() => { VZ.moveDeliverable(client.id, entry.id, 1, card); refresh(); }} title="Move down"><Icon name="down" size={15} /></button>
          </div>
        </div>
        {confirmAction === 'duplicate' && (
          <ConfirmAction title="Duplicate Deliverable?" message={'Duplicate "' + entry.projectName + (composed ? ' · ' + composed : '') + '"?'} confirmLabel="Duplicate" onConfirm={() => { VZ.duplicateDeliverable(client.id, entry.id); toast('Duplicated'); setConfirmAction(null); refresh(); }} onCancel={() => setConfirmAction(null)} />
        )}
        {confirmAction === 'delete' && (
          <ConfirmAction title="Delete Deliverable?" message={'Delete "' + entry.projectName + (composed ? ' · ' + composed : '') + '"? This cannot be undone.'} confirmLabel="Delete" danger onConfirm={() => { VZ.deleteDeliverable(client.id, entry.id); toast('Deleted'); setConfirmAction(null); refresh(); }} onCancel={() => setConfirmAction(null)} />
        )}
      </div>
    );
  }

  /* ---------- Slug bar ---------- */
  function SlugBar({ client, card, refresh, compact }) {
    const toast = useToast();
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmVal, setConfirmVal] = useState('');
    const confirmOk = confirmVal.trim().toLowerCase() === 'random';
    const doShuffle = () => {
      VZ.shuffleSlug(client.id, card.id); toast('New random slug'); refresh();
      setShowConfirm(false); setConfirmVal('');
    };
    return (
      <>
        <div className={cx('vz-slugbar', compact && 'compact')}>
          <Icon name="link" size={14} />
          {!compact && <span className="vz-slug-label">Client link</span>}
          <code className="vz-slug-code">#/c/{card.slug}</code>
          <div className="vz-slug-actions">
            <button type="button" className="vz-iconbtn" title="Randomise slug" onClick={() => { setShowConfirm(true); setConfirmVal(''); }}><Icon name="settings" size={14} /></button>
            <button type="button" className="vz-iconbtn" title="Reset slug to name" onClick={() => { VZ.resetSlug(client.id, card.id); toast('Slug reset to name'); refresh(); }}><Icon name="back" size={14} /></button>
            <CopyButton text={shareUrlFor(card.slug)} label="" small className="iconish" />
          </div>
        </div>
        {showConfirm && (
          <div className="vz-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && setShowConfirm(false)}>
            <div className="vz-modal" style={{ width: 'min(400px, 90vw)' }}>
              <div className="vz-modal-head"><h3>Confirm Slug Change</h3><button type="button" className="vz-iconbtn" onClick={() => setShowConfirm(false)}><Icon name="x" size={16} /></button></div>
              <div className="vz-modal-body">
                <p style={{ margin: '0 0 14px', fontSize: '13.5px', color: 'var(--ink-2)', lineHeight: 1.55 }}>A new random slug will replace the current one. Type <b>random</b> to confirm.</p>
                <input className="vz-input" autoFocus value={confirmVal} onChange={(e) => setConfirmVal(e.target.value)} placeholder="random" onKeyDown={(e) => e.key === 'Enter' && confirmOk && doShuffle()} />
                <div className="vz-form-actions" style={{ marginTop: 16, paddingTop: 14 }}>
                  <button type="button" className="vz-btn ghost" onClick={() => setShowConfirm(false)}>Cancel</button>
                  <button type="button" className={cx('vz-btn', confirmOk ? 'primary' : 'ghost')} disabled={!confirmOk} onClick={doShuffle}><Icon name="check" size={15} />Confirm</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  /* ---------- ManageView (manage a card) ---------- */
  function ManageView({ cardId, navigate, openPortal }) {
    const [, force] = useState(0);
    const refresh = () => force((n) => n + 1);
    useEffect(() => VZ.subscribe(refresh), []);
    const [form, setForm] = useState(null);
    const [unpinModal, setUnpinModal] = useState(null);

    let client = null, card = null;
    for (const c of VZ.listClients()) { const p = c.projects.find((x) => x.id === cardId); if (p) { client = c; card = p; break; } }
    if (!client) return (
      <div className="vz-admin"><div className="vz-admin-top"><div className="vz-admin-brand" onClick={() => navigate('#/admin')}><Wordmark /><span className="vz-admin-badge">Admin</span></div></div>
        <div className="vz-admin-canvas"><div className="vz-empty"><Icon name="layers" size={26} /><div>This card no longer exists.</div><button className="vz-btn primary" onClick={() => navigate('#/admin')}>Back to console</button></div></div></div>
    );

    const list = VZ.deliverablesForCard(client, card);
    const isAll = card.kind === 'all';
    const pinnedCount = list.filter((e) => e.pinned).length;

    const handlePublishDone = () => {
      setForm(null);
      refresh();
      // check for old pinned items
      const oldPinned = VZ.getPinnedOlderThan(client.id, 7);
      if (oldPinned.length > 0) setUnpinModal(oldPinned);
    };

    return (
      <div className="vz-admin">
        <div className="vz-admin-top">
          <div className="vz-admin-brand" onClick={() => navigate('#/admin')}><Wordmark /><span className="vz-admin-badge">Admin</span></div>
        </div>
        <div className="vz-admin-canvas">
          <div className="vz-admin-bar">
            <button type="button" className="vz-btn ghost sm" onClick={() => navigate('#/admin')}><Icon name="back" size={14} />Console</button>
            <div className="vz-admin-bar-title">
              <div className="vz-admin-bar-name">{isAll ? (card.isBackup ? 'All Projects · Backup' : 'All Projects') : card.name}</div>
              <div className="vz-admin-bar-sub">{client.name}{!isAll && card.projectId ? ' · ' + card.projectId : ''} · {list.length} deliverable{list.length === 1 ? '' : 's'} · <Icon name="pin" size={11} style={{ display: 'inline', verticalAlign: '-1px' }} /> {pinnedCount} pinned</div>
            </div>
            <div className="vz-admin-bar-actions">
              <button type="button" className="vz-btn ghost" onClick={() => openPortal(card.slug)}><Icon name="eye" size={15} />Preview</button>
              <button type="button" className="vz-btn primary" onClick={() => setForm({})}><Icon name="plus" size={15} />Add deliverable</button>
            </div>
          </div>

          <SlugBar client={client} card={card} refresh={refresh} />

          {form && (
            <div className="vz-form-shell">
              <EntryForm client={client} card={card} initial={form.id ? form : null} onDone={handlePublishDone} onCancel={() => setForm(null)} />
            </div>
          )}

          <div className="vz-admin-list">
            {list.length === 0 && !form && <div className="vz-empty sm"><Icon name="layers" size={24} /><div>No deliverables yet. Add the first one.</div></div>}
            {list.map((e, i) => <EntryRow key={e.id} entry={e} client={client} card={card} subset={list.length} idx={i} refresh={refresh} onEdit={(en) => { setForm(en); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />)}
          </div>
        </div>

        {unpinModal && <UnpinOldModal client={client} oldPinned={unpinModal} onClose={() => { setUnpinModal(null); refresh(); }} />}
      </div>
    );
  }

  /* ---------- New Project ---------- */
  function NewProjectForm({ presetClientId, onDone, onCancel }) {
    const clients = VZ.listClients();
    const [clientId, setClientId] = useState(presetClientId || (clients[0] && clients[0].id) || '');
    const [name, setName] = useState('');
    const [pid, setPid] = useState('');
    const toast = useToast();
    const submit = (e) => {
      e.preventDefault();
      if (!clientId) { toast('Select a client', 'error'); return; }
      if (!name.trim()) { toast('Project name is required', 'error'); return; }
      if (!pid.trim()) { toast('Project ID is required', 'error'); return; }
      const p = VZ.addProject(clientId, { name: name.trim(), projectId: pid.trim() });
      toast('Project created'); onDone(p);
    };
    return (
      <form className="vz-form" onSubmit={submit}>
        <div className="vz-form-head"><h3>New Project</h3><button type="button" className="vz-iconbtn" onClick={onCancel}><Icon name="x" size={16} /></button></div>
        <div className="vz-form-col" style={{ maxWidth: 520 }}>
          <Field label="Client" required>
            <select className="vz-input" value={clientId} onChange={(e) => setClientId(e.target.value)}>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ' · ' + c.company : ''}</option>)}</select>
          </Field>
          <Field label="Project name" required><input className="vz-input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Marc & Mada [Bldg 2] Amenity" /></Field>
          <Field label="Project ID" required><input className="vz-input" value={pid} onChange={(e) => setPid(e.target.value)} placeholder="e.g. TM-2506" /></Field>
          <div className="vz-codepreview">A random 8-character link will be generated — you can reset it to the project name later.</div>
        </div>
        <div className="vz-form-actions"><button type="button" className="vz-btn ghost" onClick={onCancel}>Cancel</button><button type="submit" className="vz-btn primary"><Icon name="check" size={15} />Create project</button></div>
      </form>
    );
  }

  /* ---------- Manage Clients modal ---------- */
  function ClientEditor({ client, onClose, refresh }) {
    const [name, setName] = useState(client ? client.name : '');
    const [company, setCompany] = useState(client ? client.company : '');
    const toast = useToast();
    const submit = (e) => {
      e.preventDefault();
      if (!name.trim()) { toast('Client name required', 'error'); return; }
      if (client) { VZ.updateClient(client.id, { name: name.trim(), company: company.trim() }); toast('Client updated'); }
      else { VZ.addClient({ name: name.trim(), company: company.trim() }); toast('Client created'); }
      refresh(); onClose();
    };
    return (
      <form className="vz-subform" onSubmit={submit}>
        <Field label="Client name" required><input className="vz-input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Marc & Mada" /></Field>
        <Field label="Details" hint="optional"><input className="vz-input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Origin Property" /></Field>
        <div className="vz-form-actions"><button type="button" className="vz-btn ghost" onClick={onClose}>Cancel</button><button type="submit" className="vz-btn primary">{client ? 'Save' : 'Create'}</button></div>
      </form>
    );
  }

  function DeleteClientConfirm({ client, onClose, refresh }) {
    const [val, setVal] = useState('');
    const toast = useToast();
    const projectCount = client.projects.filter((p) => p.kind === 'normal').length;
    const hasData = client.deliverables.length > 0 || projectCount > 0;
    const ok = val.trim().toLowerCase() === 'delete';
    const confirm = () => {
      if (!ok) return;
      const res = VZ.deleteClient(client.id);
      if (res.recovered) toast('Data preserved under "' + res.name + '"'); else toast('Client deleted');
      refresh(); onClose();
    };
    return (
      <div className="vz-subform">
        <div className="vz-warn">
          <strong>Delete "{client.name}"?</strong>
          {hasData
            ? <p>This client has <b>{client.deliverables.length}</b> deliverable(s) across <b>{projectCount}</b> project(s). To avoid accidental loss, this content will be moved to a new safety client (e.g. <code>Recovered 01</code>) instead of being destroyed.</p>
            : <p>This client is empty and will be removed permanently.</p>}
        </div>
        <Field label={<>Type <b>delete</b> to confirm</>}>
          <input className="vz-input" autoFocus value={val} onChange={(e) => setVal(e.target.value)} placeholder="delete" />
        </Field>
        <div className="vz-form-actions">
          <button type="button" className="vz-btn ghost" onClick={onClose}>Cancel</button>
          <button type="button" className={cx('vz-btn', ok ? 'danger-solid' : 'ghost')} disabled={!ok} onClick={confirm}><Icon name="trash" size={14} />Delete client</button>
        </div>
      </div>
    );
  }

  function ManageClients({ onClose }) {
    const [, force] = useState(0);
    const refresh = () => force((n) => n + 1);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const clients = VZ.listClients();
    return (
      <Modal title="Manage Clients" onClose={onClose} wide>
        {editing ? (
          <ClientEditor client={editing === 'new' ? null : editing} onClose={() => setEditing(null)} refresh={refresh} />
        ) : deleting ? (
          <DeleteClientConfirm client={deleting} onClose={() => setDeleting(null)} refresh={refresh} />
        ) : (
          <>
            <div className="vz-mc-head">
              <span>{clients.length} client{clients.length === 1 ? '' : 's'} · order here sets the console order</span>
              <button type="button" className="vz-btn primary sm" onClick={() => setEditing('new')}><Icon name="plus" size={13} />Add client</button>
            </div>
            <div className="vz-mc-list">
              {clients.map((c, i) => (
                <div key={c.id} className="vz-mc-row">
                  <div className="vz-mc-reorder">
                    <button type="button" className="vz-iconbtn" disabled={i === 0} onClick={() => { VZ.moveClient(c.id, -1); refresh(); }}><Icon name="up" size={14} /></button>
                    <button type="button" className="vz-iconbtn" disabled={i === clients.length - 1} onClick={() => { VZ.moveClient(c.id, 1); refresh(); }}><Icon name="down" size={14} /></button>
                  </div>
                  <div className="vz-mc-info">
                    <div className="vz-mc-name">{c.name}</div>
                    <div className="vz-mc-sub">{c.company || '—'} · {c.projects.filter((p) => p.kind === 'normal').length} projects · {c.deliverables.length} deliverables</div>
                  </div>
                  <div className="vz-mc-actions">
                    <button type="button" className="vz-iconbtn" title="Edit" onClick={() => setEditing(c)}><Icon name="edit" size={15} /></button>
                    <button type="button" className="vz-iconbtn danger" title="Delete" onClick={() => setDeleting(c)}><Icon name="trash" size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Modal>
    );
  }

  /* ---------- Project card (console) ---------- */
  /* ---------- Typed Confirm Modal ---------- */
  function TypedConfirm({ title, message, confirmPhrase, confirmLabel, danger, onConfirm, onCancel }) {
    const [val, setVal] = useState('');
    const ok = val.trim().toLowerCase() === confirmPhrase.toLowerCase();
    return (
      <Modal title={title} onClose={onCancel}>
        <p style={{ margin: '0 0 14px', fontSize: '13.5px', color: 'var(--ink-2)', lineHeight: 1.55 }}>{message}</p>
        <Field label={<>Type <b>{confirmPhrase}</b> to confirm</>}>
          <input className="vz-input" autoFocus value={val} onChange={(e) => setVal(e.target.value)} placeholder={confirmPhrase} onKeyDown={(e) => e.key === 'Enter' && ok && onConfirm()} />
        </Field>
        <div className="vz-form-actions" style={{ marginTop: 16, paddingTop: 14 }}>
          <button type="button" className="vz-btn ghost" onClick={onCancel}>Cancel</button>
          <button type="button" className={cx('vz-btn', ok ? (danger ? 'danger-solid' : 'primary') : 'ghost')} disabled={!ok} onClick={onConfirm}>
            <Icon name={danger ? 'trash' : 'check'} size={14} />{confirmLabel}
          </button>
        </div>
      </Modal>
    );
  }

  function ProjectCard({ client, card, navigate, openPortal, refresh }) {
    const toast = useToast();
    const [confirmAction, setConfirmAction] = useState(null);
    const isAll = card.kind === 'all';
    const isPrimaryAll = isAll && !card.isBackup;
    const counts = VZ.cardCounts(client, card);
    const updated = VZ.cardUpdatedAt(client, card);
    const cardLabel = isAll ? 'All Projects' : card.name;
    const normalCount = client.projects.filter((p) => p.kind === 'normal').length;
    return (
      <div className={cx('vz-pcard', isAll && 'all', card.isBackup && 'backup')}>
        <div className="vz-pcard-top" onClick={() => navigate('#/admin/manage/' + card.id)}>
          <div className="vz-pcard-badges">
            {isPrimaryAll && <span className="vz-pill all-pill"><Icon name="layers" size={11} />All Projects</span>}
            {card.isBackup && <span className="vz-pill backup-pill">Backup</span>}
            {!isAll && <span className="vz-pcard-pid">{card.projectId}</span>}
          </div>
          <div className="vz-pcard-name">{cardLabel}</div>
        </div>
        <div className="vz-pcard-stats">
          <div><b>{counts.total}</b><span>deliverables</span></div>
          <div><b>{counts.tours}</b><span>tours</span></div>
          <div><b>{relShort(updated)}</b><span>updated</span></div>
        </div>
        <SlugBar client={client} card={card} refresh={refresh} compact />
        <div className="vz-pcard-foot">
          <div className="vz-pcard-mini">
            <button type="button" className="vz-iconbtn" title="Preview" onClick={() => openPortal(card.slug)}><Icon name="eye" size={15} /></button>
            <button type="button" className="vz-iconbtn" title="Duplicate" onClick={() => setConfirmAction('duplicate')}><Icon name="copy" size={15} /></button>
            <button type="button" className="vz-iconbtn danger" title={isPrimaryAll ? 'Delete all projects' : 'Delete'} onClick={() => setConfirmAction(isPrimaryAll ? 'deleteAll' : 'delete')}><Icon name="trash" size={15} /></button>
          </div>
          <button type="button" className="vz-btn ghost sm" onClick={() => navigate('#/admin/manage/' + card.id)}>Manage<Icon name="arrow" size={13} /></button>
        </div>
        {confirmAction === 'duplicate' && (
          <ConfirmAction title="Duplicate Card?" message={'Duplicate "' + cardLabel + '"?' + (isAll ? ' A new All-Projects link will be created.' : ' A copy of this project card will be created.')} confirmLabel="Duplicate" onConfirm={() => { VZ.duplicateProject(client.id, card.id); toast(isAll ? 'New All-Projects link created' : 'Project duplicated'); setConfirmAction(null); refresh(); }} onCancel={() => setConfirmAction(null)} />
        )}
        {confirmAction === 'delete' && (
          <TypedConfirm title="Delete Project?" message={'Delete "' + cardLabel + '"? Deliverables themselves are not removed.'} confirmPhrase="delete" confirmLabel="Delete project" danger onConfirm={() => { VZ.deleteProject(client.id, card.id); toast('Project deleted'); setConfirmAction(null); refresh(); }} onCancel={() => setConfirmAction(null)} />
        )}
        {confirmAction === 'deleteAll' && (
          <TypedConfirm title="Delete All Projects?" message={'This will permanently delete all ' + normalCount + ' project(s) and all deliverables for "' + client.name + '". This cannot be undone.'} confirmPhrase="delete all projects" confirmLabel="Delete all projects" danger onConfirm={() => { const n = VZ.deleteAllProjects(client.id); toast(n + ' project(s) deleted'); setConfirmAction(null); refresh(); }} onCancel={() => setConfirmAction(null)} />
        )}
      </div>
    );
  }

  /* ---------- sort persistence ---------- */
  const SORT_KEY = 'vz-admin-sort';
  function loadSort() {
    try { const s = JSON.parse(localStorage.getItem(SORT_KEY)); if (s && s.field) return s; } catch {}
    return { field: 'updated', dir: 'desc' };
  }
  function saveSort(field, dir) {
    try { localStorage.setItem(SORT_KEY, JSON.stringify({ field, dir })); } catch {}
  }

  /* ---------- ordered cards for a client ---------- */
  function orderedCards(client, sort, dir) {
    const primary = client.projects.filter((p) => p.kind === 'all' && !p.isBackup);
    const backups = client.projects.filter((p) => p.kind === 'all' && p.isBackup);
    let normals = client.projects.filter((p) => p.kind === 'normal');
    const flip = dir === 'asc' ? -1 : 1;
    if (sort === 'projectId') normals = normals.slice().sort((a, b) => flip * (a.projectId || '').localeCompare(b.projectId || ''));
    else if (sort === 'created') normals = normals.slice().sort((a, b) => flip * (+new Date(b.createdAt) - +new Date(a.createdAt)));
    else normals = normals.slice().sort((a, b) => flip * (+new Date(VZ.cardUpdatedAt(client, b)) - +new Date(VZ.cardUpdatedAt(client, a))));
    return [...primary, ...backups, ...normals];
  }

  /* ---------- AdminApp (console) ---------- */
  function AdminApp({ navigate, openPortal, user, onLogout }) {
    const [, force] = useState(0);
    const refresh = () => force((n) => n + 1);
    useEffect(() => VZ.subscribe(refresh), []);
    const [sortState, setSortState] = useState(loadSort);
    const sort = sortState.field;
    const sortDir = sortState.dir;
    const setSort = (field) => { setSortState((s) => { const n = { ...s, field }; saveSort(n.field, n.dir); return n; }); };
    const toggleDir = () => { setSortState((s) => { const d = s.dir === 'desc' ? 'asc' : 'desc'; saveSort(s.field, d); return { ...s, dir: d }; }); };
    const [newProject, setNewProject] = useState(false);
    const [manageClients, setManageClients] = useState(false);
    const clients = VZ.listClients();

    return (
      <div className="vz-admin">
        <div className="vz-admin-top">
          <div className="vz-admin-brand" onClick={() => navigate('#/admin')}><Wordmark /><span className="vz-admin-badge">Admin</span></div>
          <div className="vz-admin-top-actions">
            {user && <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{user.email}</span>}
            <button type="button" className="vz-btn ghost sm" onClick={onLogout}>Sign out</button>
          </div>
        </div>
        <div className="vz-admin-canvas">
          <div className="vz-console-bar">
            <div className="vz-admin-bar-title">
              <div className="vz-admin-bar-name">Projects</div>
              <div className="vz-admin-bar-sub">{clients.length} client{clients.length === 1 ? '' : 's'}</div>
            </div>
            <div className="vz-console-actions">
              <div className="vz-sort">
                <span>Sort</span>
                <select className="vz-input sm" value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="updated">Updated</option><option value="created">Created</option><option value="projectId">Project ID</option>
                </select>
                <button type="button" className="vz-iconbtn" onClick={toggleDir} title={sortDir === 'desc' ? 'Descending (newest first)' : 'Ascending (oldest first)'}>
                  <Icon name={sortDir === 'desc' ? 'down' : 'up'} size={15} />
                </button>
              </div>
              <button type="button" className="vz-btn ghost" onClick={() => setManageClients(true)}><Icon name="user" size={15} />Manage Clients</button>
              <button type="button" className="vz-btn primary" onClick={() => setNewProject(true)}><Icon name="plus" size={15} />New Project</button>
            </div>
          </div>

          {newProject && <div className="vz-form-shell"><NewProjectForm onDone={(p) => { setNewProject(false); navigate('#/admin/manage/' + p.id); }} onCancel={() => setNewProject(false)} /></div>}

          {clients.length === 0 && <div className="vz-empty"><Icon name="user" size={26} /><div>No clients yet. Use "Manage Clients" to add one.</div></div>}

          {clients.map((c) => (
            <section key={c.id} className="vz-cgroup">
              <div className="vz-cgroup-head">
                <div className="vz-cgroup-avatar">{c.name.slice(0, 1)}</div>
                <div className="vz-cgroup-title"><div className="vz-cgroup-name">{c.name}</div><div className="vz-cgroup-company">{c.company || '—'}</div></div>
                <button type="button" className="vz-btn ghost sm" onClick={() => { setNewProject(true); }}><Icon name="plus" size={13} />Project</button>
              </div>
              <div className="vz-pcard-grid">
                {orderedCards(c, sort, sortDir).map((card) => <ProjectCard key={card.id} client={c} card={card} navigate={navigate} openPortal={openPortal} refresh={refresh} />)}
              </div>
            </section>
          ))}
        </div>

        {manageClients && <ManageClients onClose={() => setManageClients(false)} />}
      </div>
    );
  }

  window.AdminApp = AdminApp;
  window.ManageView = ManageView;
})();
