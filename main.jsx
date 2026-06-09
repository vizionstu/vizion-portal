/* VIZION Portal — router, landing, auth, mount. */
(function () {
  const { useState, useEffect } = React;

  /* ---------------- Auth hook ---------------- */
  const DEV_USER = location.hostname === 'localhost' ? { email: 'dev@localhost', displayName: 'Dev' } : null;
  function useAuth() {
    const [user, setUser] = useState(DEV_USER !== null ? DEV_USER : undefined);
    useEffect(() => { if (DEV_USER) return; return auth.onAuthStateChanged((u) => setUser(u || null)); }, []);
    return user;
  }
  function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    return auth.signInWithPopup(provider);
  }
  function logout() { return auth.signOut(); }

  /* ---------------- Admin Login Screen ---------------- */
  function AdminLogin({ onBack }) {
    const toast = useToast();
    const [busy, setBusy] = useState(false);
    const doLogin = async () => {
      setBusy(true);
      try { await loginWithGoogle(); }
      catch (e) { toast(e.message, 'error'); }
      setBusy(false);
    };
    return (
      <div className="vz-notfound">
        <Wordmark />
        <h1>Admin Console</h1>
        <p>Sign in with Google to manage deliverables.</p>
        <button type="button" className="vz-btn primary" onClick={doLogin} disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in with Google'}
        </button>
        {onBack && <button type="button" className="vz-btn ghost" style={{ marginTop: 10 }} onClick={onBack}>
          <Icon name="back" size={14} />Back
        </button>}
      </div>
    );
  }

  /* ---------------- Router helpers ---------------- */
  function useHash() {
    const [hash, setHash] = useState(location.hash || '#/');
    useEffect(() => {
      const on = () => setHash(location.hash || '#/');
      window.addEventListener('hashchange', on);
      return () => window.removeEventListener('hashchange', on);
    }, []);
    return hash;
  }
  function navigate(h) { location.hash = h; }

  function parseRoute(hash) {
    const p = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    if (p[0] === 'admin') {
      if (p[1] === 'manage') return { name: 'manage', cardId: p[2] || null };
      return { name: 'admin' };
    }
    if (p[0] === 'c') return { name: 'client', slug: p[1] || null };
    return { name: 'home' };
  }

  /* ---------------- Landing ---------------- */
  function Landing({ openPortal }) {
    const [code, setCode] = useState('');
    const toast = useToast();
    const clients = VZ.listClients();
    const go = (e) => {
      e.preventDefault();
      const hit = VZ.getCardBySlug(code.trim());
      if (hit) openPortal(hit.card.slug);
      else toast('No workspace found for that code', 'error');
    };
    return (
      <div className="vz-landing">
        <div className="vz-landing-grid-bg" aria-hidden="true" />
        <div className="vz-landing-inner">
          <div className="vz-landing-left">
            <Wordmark size={1.25} />
            <h1 className="vz-landing-title">Client<br />Delivery<br /><span>Portal</span></h1>
            <p className="vz-landing-desc">Final renders, floor plans and 3D virtual tours — delivered to each client in one quiet, organised place.</p>
            <div className="vz-landing-meta"><span>EST. 2018</span><i /><span>3D Architectural Visualization</span></div>
          </div>

          <div className="vz-landing-right">
            <form className="vz-gate" onSubmit={go}>
              <div className="vz-gate-eyebrow">Client access</div>
              <h2 className="vz-gate-title">Enter your workspace</h2>
              <div className="vz-gate-field">
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="workspace code  ·  8 characters" />
                <button type="submit" className="vz-btn primary"><Icon name="arrow" size={16} /></button>
              </div>
              <div className="vz-gate-demo">
                <span>Demo workspaces</span>
                <div className="vz-gate-chips">
                  {clients.flatMap((c) => {
                    const all = c.projects.find((p) => p.kind === 'all' && !p.isBackup);
                    return all ? <button type="button" key={c.id} className="vz-chip" onClick={() => openPortal(all.slug)}>{c.name}<i className="vz-chip-tag">All</i></button> : null;
                  })}
                  {clients.flatMap((c) => c.projects.filter((p) => p.kind === 'normal').slice(0, 1).map((p) => (
                    <button type="button" key={p.id} className="vz-chip" onClick={() => openPortal(p.slug)}>{p.name}</button>
                  )))}
                </div>
              </div>
            </form>
            <button type="button" className="vz-admin-link" onClick={() => navigate('#/admin')}>
              <Icon name="settings" size={15} />Open Admin Console<Icon name="arrow" size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  function NotFound({ code }) {
    return (
      <div className="vz-notfound">
        <Wordmark />
        <h1>Workspace not found</h1>
        <p>No client workspace matches <code>{code}</code>.</p>
        <button type="button" className="vz-btn primary" onClick={() => navigate('#/')}>Back to start</button>
      </div>
    );
  }

  /* ---------------- App ---------------- */
  function App() {
    const hash = useHash();
    const route = parseRoute(hash);
    const user = useAuth();
    const [, force] = useState(0);
    useEffect(() => VZ.subscribe(() => force((n) => n + 1)), []);

    useEffect(() => {
      const root = document.documentElement;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (!document.hidden) { root.classList.add('vz-animate'); return; }
      const on = () => { if (!document.hidden) { root.classList.add('vz-animate'); document.removeEventListener('visibilitychange', on); } };
      document.addEventListener('visibilitychange', on);
      return () => document.removeEventListener('visibilitychange', on);
    }, []);

    const openPortal = (slug) => navigate('#/c/' + slug);
    const isClientPage = route.name === 'client';

    if (user === undefined) return null;

    let view;
    if (isClientPage) {
      const hit = VZ.getCardBySlug(route.slug);
      view = hit ? <ClientPortal client={hit.client} card={hit.card} onExit={() => navigate('#/')} /> : <NotFound code={route.slug} />;
    } else if (!user) {
      view = <AdminLogin onBack={null} />;
    } else if (route.name === 'admin') {
      view = <AdminApp navigate={navigate} openPortal={openPortal} user={user} onLogout={logout} />;
    } else if (route.name === 'manage') {
      view = <ManageView cardId={route.cardId} navigate={navigate} openPortal={openPortal} />;
    } else {
      view = <Landing openPortal={openPortal} />;
    }

    return (
      <ToastHost>
        {view}
      </ToastHost>
    );
  }

  VZ.init().then(() => {
    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  }).catch((err) => {
    console.error('Init failed:', err);
    document.getElementById('root').textContent = 'Failed to connect to database: ' + err.message;
  });
})();
