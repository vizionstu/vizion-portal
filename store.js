/* VIZION Portal — data layer v3 (Firestore). Plain JS, attaches window.VZ.
   Model:  Client → Projects (cards) + flat Deliverables.
   A Project card has a slug → client-facing page. kind 'all' = All-Projects aggregate.
   Storage: single Firestore document at portal/data — keeps same structure as v2. */
(function () {
  const DOC_REF = db.collection('portal').doc('data');
  const listeners = new Set();
  let _data = null;
  let _ready = false;
  let _saveTimer = null;

  const nowISO = () => new Date().toISOString();
  const uid = (p) => (p || 'id') + '_' + Math.random().toString(36).slice(2, 9);

  function randomSlug() {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const all = letters + digits;
    let s = '';
    for (let i = 0; i < 8; i++) s += all[Math.floor(Math.random() * all.length)];
    if (!/[a-z]/.test(s)) s = letters[Math.floor(Math.random() * 26)] + s.slice(1);
    if (!/[0-9]/.test(s)) s = s.slice(0, -1) + digits[Math.floor(Math.random() * 10)];
    return s;
  }
  function slugify(str) {
    return String(str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 28) || 'project';
  }

  function emptyData() { return { settings: { formats: ['JPG', 'PNG'] }, clients: [] }; }

  /* ---------- Firestore persistence ---------- */
  function save(data) {
    _data = data;
    notify();
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => {
      DOC_REF.set(data).catch((e) => {
        console.error('Firestore save failed:', e);
        alert('Save failed: ' + e.message);
      });
    }, 500);
  }

  function notify() { listeners.forEach((fn) => { try { fn(); } catch (e) {} }); }
  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  function init() {
    return DOC_REF.get().then((snap) => {
      if (snap.exists) {
        _data = snap.data();
        if (!_data.settings) _data.settings = { formats: ['JPG', 'PNG'] };
        if (!Array.isArray(_data.clients)) _data.clients = [];
      } else {
        _data = emptyData();
        return DOC_REF.set(_data);
      }
    }).then(() => {
      _ready = true;
      DOC_REF.onSnapshot((snap) => {
        if (!snap.exists) return;
        _data = snap.data();
        if (!_data.settings) _data.settings = { formats: ['JPG', 'PNG'] };
        if (!Array.isArray(_data.clients)) _data.clients = [];
        notify();
      });
      notify();
    });
  }

  function getData() {
    if (!_data) _data = emptyData();
    return _data;
  }

  /* ---------- slugs (unique across ALL cards) ---------- */
  function allSlugs(d, exceptCardId) {
    const out = [];
    (d || getData()).clients.forEach((c) => c.projects.forEach((p) => { if (p.id !== exceptCardId) out.push(p.slug); }));
    return out;
  }
  function uniqueSlug(base, d, exceptCardId) {
    const taken = new Set(allSlugs(d, exceptCardId));
    if (!taken.has(base)) return base;
    let i = 2, s;
    do { s = base + '-' + i; i++; } while (taken.has(s));
    return s;
  }
  function uniqueRandomSlug(d, exceptCardId) {
    const taken = new Set(allSlugs(d, exceptCardId));
    let s; do { s = randomSlug(); } while (taken.has(s));
    return s;
  }

  /* ---------- clients ---------- */
  function listClients() { return getData().clients.slice(); }
  function getClientById(id) { return getData().clients.find((c) => c.id === id) || null; }

  function makeAllCard(d) {
    return { id: uid('all'), kind: 'all', isBackup: false, name: 'All Projects', projectId: '', slug: uniqueRandomSlug(d), createdAt: nowISO(), updatedAt: nowISO() };
  }

  function addClient({ name, company }) {
    const d = getData();
    const c = { id: uid('cl'), name: name || 'Untitled Client', company: company || '', createdAt: nowISO(), projects: [], deliverables: [] };
    c.projects.push(makeAllCard(d));
    d.clients.push(c);
    save(d);
    return c;
  }
  function updateClient(id, patch) {
    const d = getData(); const c = d.clients.find((x) => x.id === id);
    if (!c) return; Object.assign(c, patch); save(d); return c;
  }
  function moveClient(id, dir) {
    const d = getData(); const i = d.clients.findIndex((x) => x.id === id); const j = i + dir;
    if (i < 0 || j < 0 || j >= d.clients.length) return;
    const t = d.clients[i]; d.clients[i] = d.clients[j]; d.clients[j] = t; save(d);
  }
  function nextTempName(d) {
    let i = 1, name;
    const has = (n) => d.clients.some((c) => c.name === n);
    do { name = 'Recovered ' + String(i).padStart(2, '0'); i++; } while (has(name));
    return name;
  }
  function deleteClient(id) {
    const d = getData();
    const c = d.clients.find((x) => x.id === id);
    if (!c) return { recovered: false };
    const hasData = c.deliverables.length > 0 || c.projects.some((p) => p.kind !== 'all');
    d.clients = d.clients.filter((x) => x.id !== id);
    if (hasData) {
      const safe = { id: uid('cl'), name: nextTempName(d), company: c.company, createdAt: nowISO(), projects: c.projects, deliverables: c.deliverables };
      d.clients.push(safe); save(d);
      return { recovered: true, name: safe.name };
    }
    save(d);
    return { recovered: false };
  }

  /* ---------- projects (cards) ---------- */
  function addProject(clientId, { name, projectId }) {
    const d = getData(); const c = d.clients.find((x) => x.id === clientId); if (!c) return;
    const p = { id: uid('pr'), kind: 'normal', name: name.trim(), projectId: projectId.trim(), slug: uniqueRandomSlug(d), createdAt: nowISO(), updatedAt: nowISO() };
    c.projects.push(p); save(d); return p;
  }
  function updateProject(clientId, projId, patch) {
    const d = getData(); const c = d.clients.find((x) => x.id === clientId); if (!c) return;
    const p = c.projects.find((x) => x.id === projId); if (!p) return;
    Object.assign(p, patch); p.updatedAt = nowISO(); save(d); return p;
  }
  function deleteProject(clientId, projId) {
    const d = getData(); const c = d.clients.find((x) => x.id === clientId); if (!c) return;
    const p = c.projects.find((x) => x.id === projId);
    if (!p || (p.kind === 'all' && !p.isBackup)) return;
    c.projects = c.projects.filter((x) => x.id !== projId); save(d);
  }
  function deleteAllProjects(clientId) {
    const d = getData(); const c = d.clients.find((x) => x.id === clientId); if (!c) return 0;
    const count = c.projects.filter((p) => p.kind === 'normal').length;
    c.projects = c.projects.filter((p) => p.kind !== 'normal');
    c.deliverables = [];
    save(d); return count;
  }
  function duplicateProject(clientId, projId) {
    const d = getData(); const c = d.clients.find((x) => x.id === clientId); if (!c) return;
    const p = c.projects.find((x) => x.id === projId); if (!p) return;
    if (p.kind === 'all') {
      const fresh = { id: uid('all'), kind: 'all', isBackup: false, name: 'All Projects', projectId: '', slug: uniqueRandomSlug(d), createdAt: nowISO(), updatedAt: nowISO() };
      p.isBackup = true;
      const idx = c.projects.indexOf(p);
      c.projects.splice(idx, 0, fresh);
      save(d); return fresh;
    }
    const copy = Object.assign({}, p, { id: uid('pr'), slug: uniqueRandomSlug(d), createdAt: nowISO(), updatedAt: nowISO(), name: p.name + ' (copy)' });
    const idx = c.projects.indexOf(p);
    c.projects.splice(idx + 1, 0, copy); save(d); return copy;
  }

  function shuffleSlug(clientId, projId) {
    const d = getData(); const c = d.clients.find((x) => x.id === clientId); if (!c) return;
    const p = c.projects.find((x) => x.id === projId); if (!p) return;
    p.slug = uniqueRandomSlug(d, p.id); save(d); return p.slug;
  }
  function resetSlug(clientId, projId) {
    const d = getData(); const c = d.clients.find((x) => x.id === clientId); if (!c) return;
    const p = c.projects.find((x) => x.id === projId); if (!p) return;
    const base = p.kind === 'all' ? slugify(c.name + '-all-projects') : slugify(p.name || p.projectId);
    p.slug = uniqueSlug(base, d, p.id); save(d); return p.slug;
  }

  /* ---------- card resolution + queries ---------- */
  function getCardBySlug(slug) {
    if (!slug) return null;
    const d = getData();
    for (const c of d.clients) {
      const p = c.projects.find((x) => x.slug.toLowerCase() === String(slug).toLowerCase());
      if (p) return { client: c, card: p };
    }
    return null;
  }
  function deliverablesForCard(client, card) {
    if (!client || !card) return [];
    if (card.kind === 'all') return client.deliverables.slice();
    return client.deliverables.filter((e) => (e.projectId || '') === (card.projectId || ''));
  }
  function cardUpdatedAt(client, card) {
    const list = deliverablesForCard(client, card);
    const latest = list.reduce((m, e) => Math.max(m, +new Date(e.updatedAt || e.createdAt)), 0);
    return latest ? new Date(latest).toISOString() : card.createdAt;
  }
  function cardCounts(client, card) {
    const list = deliverablesForCard(client, card);
    return { total: list.length, tours: list.filter((e) => e.type === 'tour').length };
  }

  function projectOptions(client) {
    return client.projects.filter((p) => p.kind === 'normal').map((p) => ({ name: p.name, projectId: p.projectId }));
  }

  /* ---------- deliverables (flat on client; order = display order, idx0 = top) ---------- */
  function touchProject(client, projectId) {
    const p = client.projects.find((x) => x.kind === 'normal' && x.projectId === projectId);
    if (p) p.updatedAt = nowISO();
  }
  function addDeliverable(clientId, dv) {
    const d = getData(); const c = d.clients.find((x) => x.id === clientId); if (!c) return;
    const e = Object.assign({ id: uid('dv'), pinned: true, createdAt: nowISO(), updatedAt: nowISO() }, dv);
    c.deliverables.unshift(e); touchProject(c, e.projectId); save(d); return e;
  }
  function togglePin(clientId, dvId) {
    const d = getData(); const c = d.clients.find((x) => x.id === clientId); if (!c) return;
    const e = c.deliverables.find((x) => x.id === dvId); if (!e) return;
    e.pinned = !e.pinned; save(d); return e;
  }
  function unpinDeliverables(clientId, ids) {
    const d = getData(); const c = d.clients.find((x) => x.id === clientId); if (!c) return;
    ids.forEach((id) => { const e = c.deliverables.find((x) => x.id === id); if (e) e.pinned = false; });
    save(d);
  }
  function getPinnedOlderThan(clientId, days) {
    const d = getData(); const c = d.clients.find((x) => x.id === clientId); if (!c) return [];
    const cutoff = Date.now() - days * 86400000;
    return c.deliverables.filter((e) => e.pinned && +new Date(e.createdAt) < cutoff);
  }
  function updateDeliverable(clientId, dvId, patch) {
    const d = getData(); const c = d.clients.find((x) => x.id === clientId); if (!c) return;
    const e = c.deliverables.find((x) => x.id === dvId); if (!e) return;
    Object.assign(e, patch); e.updatedAt = nowISO(); touchProject(c, e.projectId); save(d); return e;
  }
  function deleteDeliverable(clientId, dvId) {
    const d = getData(); const c = d.clients.find((x) => x.id === clientId); if (!c) return;
    c.deliverables = c.deliverables.filter((x) => x.id !== dvId); save(d);
  }
  function duplicateDeliverable(clientId, dvId) {
    const d = getData(); const c = d.clients.find((x) => x.id === clientId); if (!c) return;
    const i = c.deliverables.findIndex((x) => x.id === dvId); if (i < 0) return;
    const copy = Object.assign({}, c.deliverables[i], { id: uid('dv'), createdAt: nowISO(), updatedAt: nowISO() });
    c.deliverables.splice(i, 0, copy); touchProject(c, copy.projectId); save(d); return copy;
  }
  function moveDeliverable(clientId, dvId, dir, card) {
    const d = getData(); const c = d.clients.find((x) => x.id === clientId); if (!c) return;
    const inCard = (e) => card.kind === 'all' || (e.projectId || '') === (card.projectId || '');
    const i = c.deliverables.findIndex((x) => x.id === dvId); if (i < 0) return;
    let j = i + dir;
    while (j >= 0 && j < c.deliverables.length && !inCard(c.deliverables[j])) j += dir;
    if (j < 0 || j >= c.deliverables.length) return;
    const t = c.deliverables[i]; c.deliverables[i] = c.deliverables[j]; c.deliverables[j] = t; save(d);
  }

  /* ---------- formats ---------- */
  function listFormats() { return getData().settings.formats.slice(); }
  function addFormat(fmt) {
    fmt = String(fmt || '').trim().toUpperCase(); if (!fmt) return;
    const d = getData(); if (!d.settings.formats.includes(fmt)) { d.settings.formats.push(fmt); save(d); }
    return fmt;
  }

  /* ---------- compose display id ---------- */
  function composeId(projectId, part) {
    if (!projectId) return '';
    return part && part !== 'None' && part !== '' ? projectId + '-' + part : projectId;
  }

  /* ---------- images ---------- */
  function scaleToBlob(file, maxDim, mime, quality) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let { width: w, height: h } = img;
          const scale = Math.min(1, maxDim / Math.max(w, h));
          w = Math.round(w * scale); h = Math.round(h * scale);
          const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
          const ctx = cv.getContext('2d');
          if (mime === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
          ctx.drawImage(img, 0, 0, w, h);
          cv.toBlob((blob) => resolve(blob), mime || 'image/jpeg', quality || 0.82);
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject; reader.readAsDataURL(file);
    });
  }
  function uploadBlob(blob, folder, ext) {
    const path = folder + '/' + uid('img') + '_' + Date.now() + '.' + ext;
    const ref = storage.ref(path);
    return ref.put(blob).then(() => ref.getDownloadURL());
  }
  const thumbFromFile = (f) => scaleToBlob(f, 900, 'image/jpeg', 0.82).then((b) => b ? uploadBlob(b, 'thumbs', 'jpg') : null);
  const qrFromFile = (f) => scaleToBlob(f, 640, 'image/png', 1).then((b) => b ? uploadBlob(b, 'qr', 'png') : null);
  function generateQR(text) {
    if (typeof window.qrcode !== 'function' || !text) return null;
    try { const qr = window.qrcode(0, 'M'); qr.addData(text); qr.make(); return qr.createDataURL(8, 8); } catch (e) { return null; }
  }

  window.VZ = {
    init, isReady: () => _ready,
    getData, subscribe, nowISO, uid, randomSlug, slugify,
    listClients, getClientById, addClient, updateClient, moveClient, deleteClient,
    addProject, updateProject, deleteProject, deleteAllProjects, duplicateProject, shuffleSlug, resetSlug,
    getCardBySlug, deliverablesForCard, cardUpdatedAt, cardCounts, projectOptions,
    addDeliverable, updateDeliverable, deleteDeliverable, duplicateDeliverable, moveDeliverable,
    togglePin, unpinDeliverables, getPinnedOlderThan,
    listFormats, addFormat, composeId,
    thumbFromFile, qrFromFile, generateQR,
  };
})();
