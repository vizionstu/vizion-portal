/* VIZION Portal — Client-facing download page. Exports ClientPortal to window. */
(function () {
  const { useState, useEffect, useMemo, useRef } = React;

  const cid = (e) => VZ.composeId(e.projectId, e.part);

  function useQR(entry) {
    return useMemo(() => {
      if (entry.qr) return entry.qr;
      if (entry.type === 'tour' && entry.directLink) return VZ.generateQR(entry.directLink);
      return null;
    }, [entry.qr, entry.directLink, entry.type]);
  }

  function FormatTag({ children, big }) { return <span className={cx('vz-fmt', big && 'big')}>{children}</span>; }

  function VisualBlock({ entry, qr }) {
    if (entry.type === 'tour') {
      if (entry.thumb) return <div className="vz-visual"><img src={entry.thumb} alt="" /></div>;
      if (qr) return <div className={cx('vz-visual', 'qr')}><img src={qr} alt="QR code" /></div>;
      return <Placeholder text="3d virtual tour" />;
    }
    if (entry.thumb) return <div className="vz-visual"><img src={entry.thumb} alt="" /></div>;
    return (
      <div className="vz-visual ink">
        <div className="vz-visual-code">{cid(entry) || entry.format}</div>
        <div className="vz-visual-fmt">{entry.format}</div>
      </div>
    );
  }

  function EmbedBlock({ code, open, onToggle }) {
    return (
      <div className={cx('vz-embed', open && 'open')}>
        <button type="button" className="vz-embed-toggle" onClick={onToggle}>
          <Icon name="code" size={14} /><span>Embed code</span>
          <Icon name={open ? 'up' : 'down'} size={13} style={{ marginLeft: 'auto' }} />
        </button>
        {open && (
          <div className="vz-embed-body">
            <pre className="vz-embed-pre"><code>{code}</code></pre>
            <CopyButton text={code} label="Copy embed" small />
          </div>
        )}
      </div>
    );
  }

  /* ---------------- HERO (pinned) ---------------- */
  function HeroCard({ entry, idx, showPinBadge }) {
    const qr = useQR(entry);
    const [embed, setEmbed] = useState(false);
    const isTour = entry.type === 'tour';
    return (
      <article className="vz-hero reveal" style={{ '--d': idx * 70 + 'ms' }} data-screen-label={'Entry ' + (idx + 1)}>
        {showPinBadge && <div className="vz-hero-badge"><Icon name="pin" size={12} />PINNED</div>}
        <div className="vz-hero-grid">
          <div className="vz-hero-visual"><VisualBlock entry={entry} qr={qr} /></div>
          <div className="vz-hero-body">
            <div className="vz-meta-row">
              {cid(entry) && <span className="vz-code">{cid(entry)}</span>}
              <span className="vz-sep">/</span>
              <span className="vz-type">{isTour ? '3D Virtual Tour' : 'Image Set'}</span>
            </div>
            <h2 className="vz-hero-title">{entry.projectName}</h2>
            {entry.detail && <p className="vz-hero-detail">{entry.detail}</p>}
            <div className="vz-hero-tags">
              {!isTour && <FormatTag big>{entry.format}</FormatTag>}
              {isTour && <FormatTag big>INTERACTIVE</FormatTag>}
              <span className="vz-date"><Icon name="clock" size={13} />{fmtDate(entry.createdAt)}</span>
            </div>
            <div className="vz-hero-actions">
              {isTour ? (
                <a className="vz-btn primary lg" href={entry.directLink} target="_blank" rel="noopener"><Icon name="external" size={17} />Open Virtual Tour</a>
              ) : (
                <a className="vz-btn primary lg" href={entry.link} target="_blank" rel="noopener" download><Icon name="download" size={17} />Download {entry.format}</a>
              )}
              {isTour && entry.directLink && <CopyButton text={entry.directLink} label="Copy link" />}
            </div>
            {isTour && entry.embedCode && <EmbedBlock code={entry.embedCode} open={embed} onToggle={() => setEmbed(!embed)} />}
          </div>
        </div>
      </article>
    );
  }

  /* ---------------- STANDARD ---------------- */
  function StandardCard({ entry, idx }) {
    const qr = useQR(entry);
    const [embed, setEmbed] = useState(false);
    const isTour = entry.type === 'tour';
    return (
      <article className="vz-card reveal" style={{ '--d': idx * 60 + 'ms' }}>
        <div className="vz-card-visual"><VisualBlock entry={entry} qr={qr} /></div>
        <div className="vz-card-body">
          <div className="vz-meta-row">
            {cid(entry) && <span className="vz-code">{cid(entry)}</span>}
            <span className="vz-type">{isTour ? '3D Virtual Tour' : 'Image Set'}</span>
          </div>
          <h3 className="vz-card-title">{entry.projectName}</h3>
          {entry.detail && <p className="vz-card-detail">{entry.detail}</p>}
          <div className="vz-card-foot">
            <span className="vz-date">{fmtDate(entry.createdAt)}</span>
            {!isTour && <FormatTag>{entry.format}</FormatTag>}
          </div>
          {isTour && entry.embedCode && <EmbedBlock code={entry.embedCode} open={embed} onToggle={() => setEmbed(!embed)} />}
        </div>
        <div className="vz-card-action">
          {isTour ? (
            <a className="vz-btn primary" href={entry.directLink} target="_blank" rel="noopener"><Icon name="external" size={15} />Open</a>
          ) : (
            <a className="vz-btn primary" href={entry.link} target="_blank" rel="noopener" download><Icon name="download" size={15} />{entry.format}</a>
          )}
        </div>
      </article>
    );
  }

  /* ---------------- ARCHIVE ROW (expand = StandardCard style) ---------------- */
  function ArchiveRow({ entry, idx }) {
    const isTour = entry.type === 'tour';
    const qr = useQR(entry);
    const [embed, setEmbed] = useState(false);
    const [expanded, setExpanded] = useState(false);
    return (
      <div className={cx('vz-arch-wrap', 'reveal', expanded && 'expanded')} style={{ '--d': Math.min(idx, 8) * 35 + 'ms' }}>
        <div className="vz-arch" onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
          <div className="vz-arch-main">
            {cid(entry) && <span className="vz-arch-code">{cid(entry)}</span>}
            <span className="vz-arch-title">{entry.projectName}{entry.detail ? <span className="vz-arch-detail"> — {entry.detail}</span> : null}</span>
          </div>
          <div className="vz-arch-right">
            <span className="vz-arch-date">{fmtDate(entry.createdAt)}</span>
            {isTour ? <FormatTag>TOUR</FormatTag> : <FormatTag>{entry.format}</FormatTag>}
            <Icon name={expanded ? 'up' : 'down'} size={14} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
          </div>
        </div>
        {expanded && (
          <div className="vz-arch-expand-content">
            <article className="vz-card vz-card-inline">
              <div className="vz-card-visual"><VisualBlock entry={entry} qr={qr} /></div>
              <div className="vz-card-body">
                <div className="vz-meta-row">
                  {cid(entry) && <span className="vz-code">{cid(entry)}</span>}
                  <span className="vz-type">{isTour ? '3D Virtual Tour' : 'Image Set'}</span>
                </div>
                <h3 className="vz-card-title">{entry.projectName}</h3>
                {entry.detail && <p className="vz-card-detail">{entry.detail}</p>}
                <div className="vz-card-foot">
                  <span className="vz-date">{fmtDate(entry.createdAt)}</span>
                  {!isTour && <FormatTag>{entry.format}</FormatTag>}
                </div>
                {isTour && entry.embedCode && <EmbedBlock code={entry.embedCode} open={embed} onToggle={() => setEmbed(!embed)} />}
              </div>
              <div className="vz-card-action">
                {isTour ? (
                  <a className="vz-btn primary" href={entry.directLink} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}><Icon name="external" size={15} />Open</a>
                ) : (
                  <a className="vz-btn primary" href={entry.link} target="_blank" rel="noopener" download onClick={(e) => e.stopPropagation()}><Icon name="download" size={15} />{entry.format}</a>
                )}
              </div>
            </article>
          </div>
        )}
      </div>
    );
  }

  /* ---------------- PROJECT DIVIDER (All Projects view) ---------------- */
  function ProjectDivider({ projectId, projectName, count }) {
    return (
      <div className="vz-proj-divider reveal" style={{ '--d': '40ms' }}>
        <span className="vz-proj-divider-id">{projectId}</span>
        <span className="vz-proj-divider-name">{projectName}</span>
        <i />
        <span className="vz-proj-divider-count">{count}</span>
      </div>
    );
  }

  /* ---------------- SIDEBAR ---------------- */
  const FILTERS = [
    { id: 'all', label: 'All Deliverables', icon: 'layers' },
    { id: 'download', label: 'Image Sets', icon: 'image' },
    { id: 'tour', label: 'Virtual Tours', icon: 'qr' },
  ];

  function Sidebar({ client, card, filter, setFilter, counts, query, setQuery, focusedProjectId, onFocusProject }) {
    const isAll = card.kind === 'all';
    const normalProjects = isAll ? client.projects.filter((p) => p.kind === 'normal').slice().sort((a, b) => {
      const na = parseInt((a.projectId || '').replace(/\D/g, ''), 10) || 0;
      const nb = parseInt((b.projectId || '').replace(/\D/g, ''), 10) || 0;
      if (na !== nb) return nb - na;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    }) : [];
    return (
      <aside className="vz-side">
        <div className="vz-side-top"><Wordmark /></div>
        <div className="vz-side-client">
          <div className="vz-side-eyebrow">{isAll ? client.name : 'Project'}</div>
          <div className="vz-side-cname">{isAll ? 'All Projects' : card.name}</div>
          {isAll ? (client.company && <div className="vz-side-company">{client.company}</div>)
                 : <div className="vz-side-company">{client.name}{card.projectId ? ' · ' + card.projectId : ''}</div>}
        </div>
        <nav className="vz-nav">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" className={cx('vz-nav-item', filter === f.id && 'active')} onClick={() => setFilter(f.id)}>
              <Icon name={f.icon} size={16} /><span>{f.label}</span><span className="vz-nav-count">{counts[f.id] || 0}</span>
            </button>
          ))}
        </nav>
        {isAll && normalProjects.length > 0 && (
          <div className="vz-side-projdrop">
            <select value={focusedProjectId || ''} onChange={(e) => onFocusProject(e.target.value || null)}>
              <option value="">All Projects (Recent)</option>
              {normalProjects.map((p) => <option key={p.id} value={p.projectId}>{p.name} — {p.projectId}</option>)}
            </select>
          </div>
        )}
        <div className="vz-side-search">
          <Icon name="search" size={14} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search deliverables" />
        </div>
        {isAll && normalProjects.length > 0 && (
          <div className="vz-side-projlist">
            <button type="button" className={cx('vz-side-projlist-recent', !focusedProjectId && 'active')} onClick={() => onFocusProject(null)}>
              <Icon name="clock" size={14} /><span>All Projects (Recent)</span>
            </button>
            <div className="vz-side-projlist-items">
              {normalProjects.map((p) => (
                <button key={p.id} type="button" className={cx('vz-side-proj-item', focusedProjectId === p.projectId && 'active')} onClick={() => onFocusProject(focusedProjectId === p.projectId ? null : p.projectId)}>
                  <div className="vz-side-proj-name">{p.name}</div>
                  <div className="vz-side-proj-id">{p.projectId}</div>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="vz-side-foot">
          <div className="vz-side-foot-line">Delivered by VIZION Studio</div>
          <div className="vz-side-foot-line muted">vizion.studio · {new Date().getFullYear()}</div>
        </div>
      </aside>
    );
  }

  /* ---------------- helper: group entries by project ---------------- */
  function groupByProject(entries, client) {
    const groups = [];
    const seen = new Set();
    entries.forEach((e) => {
      const key = e.projectId || '__none';
      if (!seen.has(key)) {
        seen.add(key);
        const proj = client.projects.find((p) => p.kind === 'normal' && p.projectId === e.projectId);
        groups.push({ projectId: e.projectId, projectName: proj ? proj.name : e.projectName, items: [] });
      }
      groups.find((g) => g.projectId === (e.projectId || '__none') || g.projectId === e.projectId).items.push(e);
    });
    return groups;
  }

  /* ---------------- PORTAL ---------------- */
  function ClientPortal({ client, card, onExit }) {
    const [filter, setFilter] = useState('all');
    const [query, setQuery] = useState('');
    const [focusedProjectId, setFocusedProjectId] = useState(null);
    const isAll = card.kind === 'all';
    const focusedProject = focusedProjectId ? client.projects.find((p) => p.kind === 'normal' && p.projectId === focusedProjectId) : null;

    const handleFocusProject = (projectId) => {
      setFocusedProjectId(projectId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    useEffect(() => { setFocusedProjectId(null); }, [card.id]);

    const base = useMemo(() => VZ.deliverablesForCard(client, card), [client, card]);
    const counts = useMemo(() => {
      const c = { all: base.length, download: 0, tour: 0 };
      base.forEach((e) => { c[e.type] = (c[e.type] || 0) + 1; });
      return c;
    }, [base]);

    const entries = useMemo(() => {
      let list = base.slice();
      if (focusedProjectId) list = list.filter((e) => e.projectId === focusedProjectId);
      if (filter !== 'all') list = list.filter((e) => e.type === filter);
      const q = query.trim().toLowerCase();
      if (q) list = list.filter((e) => (e.projectName + ' ' + cid(e) + ' ' + (e.format || '') + ' ' + (e.detail || '')).toLowerCase().includes(q));
      return list;
    }, [base, filter, query, focusedProjectId]);

    const [animKey, setAnimKey] = useState(0);
    useEffect(() => { setAnimKey((k) => k + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }, [filter, query, card, focusedProjectId]);

    // Pin-based layout: pinned items = hero, unpinned = standard + archive
    const pinned = entries.filter((e) => e.pinned);
    const unpinned = entries.filter((e) => !e.pinned);

    // For All Projects view without focus → group unpinned by project
    const showProjectDividers = isAll && !focusedProjectId && !query.trim();
    const unpinnedGroups = useMemo(() => {
      if (!showProjectDividers) return null;
      return groupByProject(unpinned, client);
    }, [showProjectDividers, unpinned, client]);

    // Flat layout items (non-grouped)
    const standard = showProjectDividers ? [] : unpinned.slice(0, 3);
    const archive = showProjectDividers ? [] : unpinned.slice(3);

    return (
      <div className="vz-portal">
        <Sidebar client={client} card={card} filter={filter} setFilter={setFilter} counts={counts} query={query} setQuery={setQuery} focusedProjectId={focusedProjectId} onFocusProject={handleFocusProject} />
        <main className="vz-main">
          <div className="vz-main-inner" key={animKey}>
            <header className="vz-page-head reveal" style={{ '--d': '0ms' }}>
              <div className="vz-page-eyebrow">
                <span>{focusedProject ? focusedProject.projectId : 'Download'}</span>
                <span className="vz-page-eyebrow-meta">{entries.length} deliverable{entries.length === 1 ? '' : 's'}{pinned.length > 0 ? ' · ' + pinned.length + ' pinned' : ''}</span>
              </div>
              <h1 className="vz-page-title">{focusedProject ? focusedProject.name : 'Download'}</h1>
              <p className="vz-page-desc">
                {focusedProject
                  ? <><strong>{focusedProject.name}</strong> deliverables for {client.name}.</>
                  : isAll
                    ? <>All deliverables for <strong>{client.name}</strong> in one place. Pinned items are highlighted — earlier work stays available below.</>
                    : <><strong>{card.name}</strong> assets for {client.name}. Pinned items are highlighted — earlier deliverables remain available below.</>}
              </p>
            </header>

            {entries.length === 0 && (
              <div className="vz-empty"><Icon name="layers" size={28} /><div>No deliverables {query ? 'match your search' : 'in this category yet'}.</div></div>
            )}

            {/* PINNED section */}
            {pinned.length > 0 && (
              <section className="vz-section">
                <div className="vz-section-label reveal" style={{ '--d': '40ms' }}><span><Icon name="pin" size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 6 }} />Pinned</span><i /><span className="vz-section-count">{pinned.length}</span></div>
                <div className="vz-pinned-list">
                  {pinned.map((e, i) => <HeroCard key={e.id} entry={e} idx={i} showPinBadge={true} />)}
                </div>
              </section>
            )}

            {/* GROUPED layout (All Projects, no focus/search) */}
            {showProjectDividers && unpinnedGroups && unpinnedGroups.map((group, gi) => (
              <section key={group.projectId} className="vz-section">
                <ProjectDivider projectId={group.projectId} projectName={group.projectName} count={group.items.length} />
                {gi === 0 ? (
                  <>
                    <div className="vz-std-list">
                      {group.items.slice(0, 2).map((e, i) => <StandardCard key={e.id} entry={e} idx={i} />)}
                    </div>
                    {group.items.length > 2 && (
                      <div className="vz-arch-list" style={{ marginTop: 8 }}>
                        {group.items.slice(2).map((e, i) => <ArchiveRow key={e.id} entry={e} idx={i} />)}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="vz-arch-list">
                    {group.items.map((e, i) => <ArchiveRow key={e.id} entry={e} idx={i} />)}
                  </div>
                )}
              </section>
            ))}

            {/* FLAT layout (single project / focused / searching) */}
            {!showProjectDividers && standard.length > 0 && (
              <section className="vz-section">
                <div className="vz-section-label reveal" style={{ '--d': '120ms' }}><span>Recent</span><i /></div>
                <div className="vz-std-list">{standard.map((e, i) => <StandardCard key={e.id} entry={e} idx={i + 1} />)}</div>
              </section>
            )}

            {!showProjectDividers && archive.length > 0 && (
              <section className="vz-section">
                <div className="vz-section-label reveal" style={{ '--d': '160ms' }}><span>Archive</span><i /><span className="vz-section-count">{archive.length}</span></div>
                <div className="vz-arch-list">{archive.map((e, i) => <ArchiveRow key={e.id} entry={e} idx={i} />)}</div>
              </section>
            )}

            <footer className="vz-portal-foot reveal" style={{ '--d': '200ms' }}>
              <span>End of deliverables</span>
              <button type="button" className="vz-exit" onClick={onExit}><Icon name="back" size={13} />Switch workspace</button>
            </footer>
          </div>
        </main>
      </div>
    );
  }

  window.ClientPortal = ClientPortal;
})();
