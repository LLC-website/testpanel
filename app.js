import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

const SUPABASE_URL = 'https://oxbbcdpfzqcizryhvcwf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_47muAalvktynEFLKZaNP5w_FsuB2u_X';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { flowType: 'implicit', persistSession: true, detectSessionInUrl: true } });

const ADMIN = 'LINA LIEN COSMETICS';
const REDIRECT = location.origin + location.pathname;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => new Date().toLocaleDateString('sv-SE');
const fd = d => { if (!d) return ''; const x = new Date(d.length === 10 ? d + 'T12:00' : d); return x.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }); };
const cap = s => s.trim().replace(/(^|[.!?]\s+)(\p{Ll})/gu, (m, a, b) => a + b.toUpperCase());
const low = s => String(s || '').trim().toLowerCase();

const S = {
  user: null, admin: false, member: false, loading: true, busy: false,
  profile: null, invites: [], profiles: [], products: [], samples: [], updates: [], posts: [], urls: {},
  view: 'chats', prod: null, tester: null, ttab: 'profiel', edit: false, step: 1, miss: false,
  open: null, rm: null, flash: false, snap: null, editProd: false,
  login: { state: null, email: '', err: '' }
};

/* ---------- vragen ---------- */
const Q = {
  press: { title: 'Press-Lash', qs: [
    ['cijfer', 'Welk cijfer geef je dit product?', 'num', '', 'Cijfer'],
    ['duur', 'Hoelang blijft het bij je zitten?', 'text', 'Bijvoorbeeld: 5 dagen', 'Draagtijd'],
    ['wr', 'Is het waterresistent bij jou?', 'yn', 'Kan tegen water zoals regen en voorzichtig douchen, maar niet tegen een langdurige straal op je gezicht of zwemmen.', 'Waterresistent'],
    ['wp', 'Is het volledig waterproof bij jou?', 'yn', '', 'Volledig waterproof'],
    ['zonder', 'Lukt het verwijderen zonder remover?', 'yn', '', 'Verwijderen zonder remover'],
    ['verbeter', 'Wat zijn verbeterpunten?', 'area', '', 'Verbeterpunten']] },
  diy: { title: 'DIY-Lash', qs: [
    ['cijfer', 'Welk cijfer geef je dit product?', 'num', '', 'Cijfer'],
    ['gebruik', 'Gebruik je de bond en/of sealant van ons?', 'sel', '', 'Bond en sealant'],
    ['bond', 'Hoelang blijven de DIY-lashes zitten met onze bond?', 'text', 'Bijvoorbeeld: 4 dagen', 'Draagtijd met bond'],
    ['sealant', 'Hoelang blijven de DIY-lashes zitten met onze bond in combinatie met onze sealant?', 'text', 'Bijvoorbeeld: 7 dagen', 'Met bond en sealant'],
    ['wp', 'Is het volledig waterproof?', 'yn', '', 'Volledig waterproof'],
    ['verbeter', 'Wat zijn verbeterpunten?', 'area', '', 'Verbeterpunten'],
    ['remover', 'Gaat het verwijderen met een remover makkelijk?', 'yn', '', 'Verwijderen met remover']] }
};
const GEB = ['Bond en sealant', 'Alleen bond', 'Alleen sealant', 'Geen van beide'];
const DQ = [
  ['cijfer', 'Welk cijfer geef je vandaag?', 'num'],
  ['zit', 'Zitten ze nog goed?', 'one', ['Ja, alles zit', 'Deels', 'Nee, eraf']],
  ['los', 'Heeft er iets losgelaten?', 'one', ['Nee', 'Een paar clusters', 'Veel']],
  ['water', 'Met welk water kwamen ze in aanraking?', 'multi', ['Geen', 'Regen', 'Douche', 'Sporten/zweten', 'Zwemmen']],
  ['irritatie', 'Heb je last gehad van jeuk of irritatie?', 'one', ['Nee', 'Een beetje', 'Ja']]];
const CARRIERS = {
  PostNL: (c, p) => `https://jouw.postnl.nl/track-and-trace/${encodeURIComponent(c)}-NL-${encodeURIComponent((p?.postcode || '').replace(/\s/g, '').toUpperCase())}`,
  DHL: c => `https://www.dhl.com/nl-nl/home/tracking/tracking-parcel.html?submit=1&tracking-id=${encodeURIComponent(c)}`,
  DPD: c => `https://tracking.dpd.de/status/nl_NL/parcel/${encodeURIComponent(c)}`,
  GLS: c => `https://gls-group.com/NL/nl/pakket-volgen?match=${encodeURIComponent(c)}`,
  UPS: c => `https://www.ups.com/track?loc=nl_NL&tracknum=${encodeURIComponent(c)}`
};

/* ---------- hulpfuncties ---------- */
const filled = (e, f) => String(e?.[f] ?? '').trim() !== '';
const asks = (e, k, f) => k !== 'diy' ? true : f === 'bond' ? (e.gebruik === 'Bond en sealant' || e.gebruik === 'Alleen bond') : f === 'sealant' ? e.gebruik === 'Bond en sealant' : true;
const adres = p => ['straat', 'postcode', 'plaats'].every(f => filled(p, f));
const addrText = p => p && adres(p) ? `${esc(p.straat)}, ${esc(p.postcode)} ${esc(p.plaats)}` : '<span class="meta">Nog niet ingevuld</span>';
const complete = p => !!p && adres(p) && ['press', 'diy'].every(k => !p[k]?.used || Q[k].qs.every(([f]) => !asks(p[k], k, f) || filled(p[k], f)));
const P = id => S.products.find(p => p.id === id);
const profileById = id => S.profiles.find(p => p.id === id);
const profileByEmail = e => S.profiles.find(p => low(p.email) === low(e));
const testerName = id => { const p = profileById(id); return p ? (p.name || p.email) : 'Oud-tester'; };
function norm(p) { if (!p) return p; p.press = p.press || { used: true }; p.diy = p.diy || { used: true }; p.notif = p.notif || { admin: true, post: true, sample: true }; return p; }

function toast(msg, err = false) {
  const t = $('toast'); t.textContent = msg; t.className = err ? 'err' : ''; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, err ? 6000 : 3000);
}
function fail(error, what) { console.error(error); toast(`${what} mislukt: ${error?.message || 'onbekende fout'}`, true); }

async function compress(file) {
  try {
    const img = await createImageBitmap(file);
    const s = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return await new Promise(r => c.toBlob(b => r(b || file), 'image/jpeg', 0.82));
  } catch { return file; }
}
async function uploadPhoto(file, folder) {
  if (!file) return '';
  const blob = await compress(file);
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await sb.storage.from('photos').upload(path, blob, { contentType: blob.type || 'image/jpeg' });
  if (error) throw error;
  return path;
}
async function signUrls() {
  const paths = [...S.updates.map(u => u.photo), ...S.posts.map(p => p.photo)].filter(x => x && !S.urls[x]);
  if (!paths.length) return;
  const { data } = await sb.storage.from('photos').createSignedUrls(paths, 60 * 60 * 12);
  (data || []).forEach(d => { if (d.signedUrl) S.urls[d.path] = d.signedUrl; });
}

/* ---------- laden ---------- */
async function load() {
  const all = await Promise.all([
    sb.from('products').select('*').order('created_at'),
    sb.from('samples').select('*').order('sent', { ascending: false }),
    sb.from('updates').select('*').order('created_at', { ascending: false }),
    sb.from('posts').select('*').order('created_at', { ascending: false }),
    S.admin ? sb.from('invites').select('*').order('created_at') : Promise.resolve({ data: [] }),
    S.admin ? sb.from('profiles').select('*') : sb.from('profiles').select('*').eq('id', S.user.id)
  ]);
  const bad = all.find(r => r.error); if (bad) fail(bad.error, 'Laden');
  [S.products, S.samples, S.updates, S.posts, S.invites, S.profiles] = all.map(r => r.data || []);
  S.profiles.forEach(norm);
  S.profile = S.profiles.find(p => p.id === S.user.id) || null;
  if (!S.admin && !S.profile) {
    const { data, error } = await sb.from('profiles').insert({ id: S.user.id, email: S.user.email }).select().single();
    if (error) fail(error, 'Profiel aanmaken'); else { S.profile = norm(data); S.profiles = [S.profile]; }
  }
  await signUrls();
}
async function boot() {
  S.loading = true; render();
  if (S.user) {
    const [a, m] = await Promise.all([sb.rpc('is_admin'), sb.rpc('is_member')]);
    if (a.error || m.error) fail(a.error || m.error, 'Inloggen');
    S.admin = !!a.data; S.member = !!m.data;
    if (S.member) await load();
    if (location.hash.includes('access_token')) history.replaceState(null, '', location.pathname);
  }
  S.loading = false; render();
}
sb.auth.onAuthStateChange((ev, session) => {
  const u = session?.user || null;
  if ((u?.id || null) !== (S.user?.id || null)) { S.user = u; setTimeout(boot, 0); }
  else if (ev === 'INITIAL_SESSION' && !u) { S.loading = false; render(); }
});

/* ---------- bouwstenen ---------- */
function seg(name, opts, val, label, cls = '', extra = '', de = '') {
  return `<div class="seg ${cls}" role="radiogroup" aria-label="${esc(label)}">${opts.map((o, i) => `<label><input type="radio" id="${name}-${i}" name="${name}" value="${esc(o)}" ${String(o) === String(val ?? '') ? 'checked' : ''} ${de ? `data-e="${de}"` : ''} ${extra}><span>${esc(o)}</span></label>`).join('')}</div>`;
}
function chk(name, opts, label) {
  return `<div class="seg" role="group" aria-label="${esc(label)}">${opts.map((o, i) => `<label><input type="checkbox" id="${name}-${i}" name="${name}" value="${esc(o)}"><span>${esc(o)}</span></label>`).join('')}</div>`;
}
function field(p, k, [f, l, ty, hint]) {
  const e = p[k], de = `${k}.${f}`, id = `pf-${k}-${f}`, miss = S.miss && !filled(e, f);
  let ctl;
  if (ty === 'num') ctl = seg(id, Array.from({ length: 10 }, (_, i) => i + 1), e[f], l, 'num', '', de);
  else if (ty === 'yn') ctl = seg(id, ['Ja', 'Nee'], e[f], l, '', '', de);
  else if (ty === 'sel') ctl = seg(id, GEB, e[f], l, '', 'data-r="1"', de);
  else if (ty === 'text') ctl = `<input id="${id}" data-e="${de}" value="${esc(e[f])}" placeholder="${esc(hint)}" aria-label="${esc(l)}">`;
  else ctl = `<textarea id="${id}" data-e="${de}" aria-label="${esc(l)}">${esc(e[f])}</textarea>`;
  const info = ty === 'yn' && hint ? `<details class="info"><summary aria-label="Uitleg">i</summary><p>${esc(hint)}</p></details>` : '';
  return `<div class="field ${miss ? 'miss' : ''}"><div class="qline"><span>${l}</span>${info}</div>${ctl}${miss ? '<p class="missnote">Nog invullen</p>' : ''}</div>`;
}
function expEdit(p, k) {
  const e = p[k], q = Q[k];
  return `<div class="col"><div class="colhead"><h3>${q.title}</h3>
    <label class="switch"><input type="checkbox" id="pf-${k}-used" ${e.used ? 'checked' : ''} data-e="${k}.used" data-r="1">Gebruikt</label></div>
    ${e.used ? q.qs.filter(([f]) => asks(e, k, f)).map(x => field(p, k, x)).join('') : `<p class="note">Zet aan als je ${q.title} hebt gebruikt.</p>`}</div>`;
}
function expRead(p, k) {
  const e = p[k], q = Q[k];
  return `<div class="col"><h3>${q.title}</h3>${e.used ? `<dl class="kv">${q.qs.filter(([f]) => asks(e, k, f)).map(([f, , , , s]) =>
    `<dt>${s}</dt><dd>${filled(e, f) ? esc(e[f]) + (f === 'cijfer' ? ' / 10' : '') : '<span class="wait">Open</span>'}</dd>`).join('')}</dl>` : '<p class="note">Niet gebruikt</p>'}</div>`;
}
function facts(m) {
  const f = [];
  if (m.cijfer) f.push(`Cijfer ${m.cijfer}/10`);
  if (m.zit) f.push(m.zit);
  if (m.los) f.push(m.los === 'Nee' ? 'Niets losgelaten' : 'Losgelaten: ' + m.los.toLowerCase());
  if (m.water?.length) { const w = m.water.filter(x => x !== 'Geen'); f.push(w.length ? 'Water: ' + w.join(', ').toLowerCase() : 'Geen water'); }
  if (m.irritatie) f.push(m.irritatie === 'Nee' ? 'Geen irritatie' : 'Irritatie: ' + m.irritatie.toLowerCase());
  return f;
}
const img = (path, alt) => path ? (S.urls[path] ? `<img src="${esc(S.urls[path])}" alt="${alt}" loading="lazy">` : '<p class="meta">Foto laden…</p>') : '';
function vUpd(m, who) {
  return `<article class="upd"><div class="mhead">${who ? `<b>${esc(testerName(m.tester))}</b>` : ''}<span class="pill day">Dag ${m.day}</span><span class="meta">${fd(m.created_at)}</span></div>
    <div class="facts">${facts(m).map(x => `<span>${esc(x)}</span>`).join('')}</div>
    ${m.text ? `<p class="utext">${esc(m.text)}</p>` : ''}${img(m.photo, 'Foto bij dagupdate')}</article>`;
}
function ttBlock(s, p) {
  if (!s.code) return '';
  const url = CARRIERS[s.carrier]?.(s.code, p);
  return `<details class="howto tt"><summary>Track & trace</summary><dl class="kv" style="margin-top:10px;max-width:420px"><dt>Vervoerder</dt><dd>${esc(s.carrier || 'Onbekend')}</dd><dt>Code</dt><dd>${esc(s.code)}</dd></dl>
    ${url ? `<a class="btn ghost small" href="${esc(url)}" target="_blank" rel="noopener">Volg je pakket bij ${esc(s.carrier)}</a>` : ''}</details>`;
}
const dis = () => S.busy ? 'disabled' : '';

/* ---------- schermen ---------- */
function vLogin() {
  const L = S.login;
  const body = L.state === 'sent'
    ? `<p>We hebben een inloglink gestuurd naar <b>${esc(L.email)}</b>. Open de mail en klik op de link.</p><p class="note">Geen mail ontvangen? Kijk ook in je spam.</p><div><button type="button" class="btn link" data-a="loginAgain">Ander e-mailadres</button></div>`
    : `<p class="note">Vul het e-mailadres in waarmee je bent uitgenodigd. Je krijgt een inloglink per mail, een wachtwoord is niet nodig.</p>
      <form data-f="login" class="stack" style="gap:10px"><input id="loginEmail" type="email" required autocomplete="email" placeholder="jij@voorbeeld.nl" aria-label="E-mailadres" value="${esc(L.email)}"><button class="btn" ${dis()}>${S.busy ? 'Bezig…' : 'Stuur mij een inloglink'}</button></form>
      ${L.state === 'denied' ? `<p class="wait">Dit e-mailadres is niet uitgenodigd. Vraag ${ADMIN} om je toe te voegen.</p>` : ''}
      ${L.state === 'error' ? `<p class="wait">${esc(L.err)}</p>` : ''}`;
  return `<div class="panel login"><h2>Inloggen</h2>${body}
    <p class="note">We gebruiken je gegevens alleen voor dit testpanel en het versturen van samples. Wil je dat we je gegevens verwijderen? Mail naar info@linaliencosmetics.com.</p></div>`;
}
function vNoAccess() {
  return `<div class="panel login"><h2>Geen toegang</h2><p>Je bent ingelogd als ${esc(S.user.email)}, maar dit e-mailadres heeft geen toegang (meer) tot het testpanel.</p><div><button type="button" class="btn ghost" data-a="logout">Uitloggen</button></div></div>`;
}

/* dagupdates */
function updForm(p, prods) {
  const day = S.updates.filter(m => m.tester === S.user.id && m.product === p.id).length + 1;
  const q = ([f, l, ty, opts]) => `<div class="field"><div class="qline"><span>${l}</span></div>${ty === 'num' ? seg('up-' + f, Array.from({ length: 10 }, (_, i) => i + 1), '', l, 'num', 'required')
    : ty === 'one' ? seg('up-' + f, opts, '', l, '', 'required') : chk('up-' + f, opts, l)}</div>`;
  return `<form data-f="upd" class="panel">
    <div class="head"><h2>Dagupdate</h2><span class="meta">${fd(today())}</span></div>
    <div class="row" style="align-items:flex-end;gap:16px">
     <div class="field" style="flex:1 1 220px"><span class="lbl">Product</span><select id="upProd" aria-label="Product">${prods.map(x => `<option value="${x.id}" ${x.id === p.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
     <div class="field" style="flex:0 1 90px"><span class="lbl">Dag</span><input id="upDay" type="number" min="1" value="${day}" required aria-label="Dag"></div></div>
    ${DQ.map(q).join('')}
    <div class="field"><div class="qline"><span>Hoe ging het vandaag?</span></div><textarea id="upText" placeholder="Bijvoorbeeld: na het sporten liet de buitenste cluster iets los" aria-label="Hoe ging het vandaag"></textarea></div>
    <div class="row"><label class="filebtn">Foto toevoegen<input id="upPhoto" type="file" accept="image/*" hidden></label><span id="upFile" class="meta"></span><span class="grow"></span><button class="btn" ${dis()}>${S.busy ? 'Bezig…' : 'Plaats update'}</button></div>
    <p class="note">Alleen jij en ${ADMIN} zien je update.</p></form>`;
}
function prodForm(p) {
  const v = p || { name: '', description: '', steps: [], letop: '' };
  return `<form data-f="${p ? 'editprod' : 'newprod'}" class="panel" style="gap:12px"><h3>${p ? 'Product bewerken' : 'Nieuw product'}</h3>
    <div class="field"><span class="lbl">Productnaam</span><input id="npName" required value="${esc(v.name)}" aria-label="Productnaam"></div>
    <div class="field"><span class="lbl">Wat testen we?</span><input id="npDesc" value="${esc(v.description)}" aria-label="Wat testen we"></div>
    <div class="field"><span class="lbl">Aanbrengstappen (één stap per regel)</span><textarea id="npSteps" rows="5" aria-label="Aanbrengstappen">${esc((v.steps || []).join('\n'))}</textarea></div>
    <div class="field"><span class="lbl">Let op</span><textarea id="npLetop" rows="2" aria-label="Let op">${esc(v.letop)}</textarea></div>
    <div class="row"><button class="btn" ${dis()}>Opslaan</button><button type="button" class="btn link" data-a="${p ? 'closeEditProd' : 'close'}">Annuleer</button></div></form>`;
}
function vDag() {
  if (S.admin) {
    if (!P(S.prod)) S.prod = S.products[0]?.id;
    const p = P(S.prod);
    const side = `<div class="stack" style="gap:8px"><div class="plist">${S.products.map(x => `<button type="button" data-a="prod" data-v="${x.id}" aria-current="${x.id === S.prod}"><span class="pname">${esc(x.name)}</span><span class="meta">${S.updates.filter(m => m.product === x.id).length} updates</span></button>`).join('')}</div>
      ${S.open === 'newprod' ? prodForm(null) : '<div><button type="button" class="btn link" data-a="open" data-v="newprod" style="margin-left:8px">+ Nieuw product</button></div>'}</div>`;
    if (!p) return `<div class="chat">${side}<div class="panel"><p class="note">Nog geen producten. Voeg links je eerste product toe.</p></div></div>`;
    const list = S.updates.filter(m => m.product === p.id);
    return `<div class="chat">${side}<div class="stack">${S.editProd ? prodForm(p) : ''}<div class="panel"><div class="head"><div><h2>${esc(p.name)}</h2>${p.description ? `<p class="note">${esc(p.description)}</p>` : ''}</div>${S.editProd ? '' : '<button type="button" class="btn ghost small" data-a="editProd">Bewerken</button>'}</div>
      <div>${list.map(m => vUpd(m, true)).join('') || '<p class="note">Nog geen dagupdates.</p>'}</div></div></div></div>`;
  }
  const prods = S.products.filter(p => S.samples.some(s => s.product === p.id));
  if (!prods.length) return '<div class="panel"><h2>Dagupdates</h2><p class="note">Zodra je sample is verstuurd, houd je hier per dag bij hoe het gaat.</p></div>';
  if (!prods.some(p => p.id === S.prod)) S.prod = prods[0].id;
  const p = P(S.prod), mine = S.updates.filter(m => m.tester === S.user.id && m.product === p.id).sort((a, b) => b.day - a.day || b.created_at.localeCompare(a.created_at));
  return updForm(p, prods) + `<div class="panel"><div class="head"><div><h2>Mijn dagupdates</h2><p class="note">${esc(p.name)}</p></div>${S.flash ? '<span class="ok">Update geplaatst</span>' : ''}</div>
    <div>${mine.map(m => vUpd(m, false)).join('') || '<p class="note">Nog geen updates voor dit product.</p>'}</div></div>`;
}

/* community */
function vCommunity() {
  const form = S.admin ? `<form data-f="post" class="panel"><h2>Nieuwe community-update</h2>
    <textarea id="postText" required placeholder="Wat wil je met je testers delen?" aria-label="Community-update"></textarea>
    <div class="row"><label class="filebtn">Foto toevoegen<input id="postPhoto" type="file" accept="image/*" hidden></label><span id="postFile" class="meta"></span><span class="grow"></span><button class="btn" ${dis()}>${S.busy ? 'Bezig…' : 'Plaats update'}</button></div>
    <p class="note">Alle testers zien dit bericht.</p></form>` : '';
  return form + `<div class="panel"><h2>Community</h2><div>${S.posts.map(p => `<article class="upd"><div class="mhead"><b>${ADMIN}</b><span class="meta">${fd(p.created_at)}</span><span class="grow"></span>${S.admin ? `<button type="button" class="btn link" data-a="delpost" data-v="${p.id}">Verwijderen</button>` : ''}</div>
    <p class="utext">${esc(p.text)}</p>${img(p.photo, 'Foto bij community-update')}</article>`).join('') || '<p class="note">Nog geen updates.</p>'}</div></div>`;
}

/* samples tester */
function vSamples() {
  const rows = S.samples;
  if (!rows.length) return '<div class="panel"><h2>Mijn samples</h2><p class="note">Er is nog niets naar je verstuurd.</p></div>';
  return `<div class="panel"><h2>Mijn samples</h2><div class="slist">${rows.map(s => { const p = P(s.product); return `<div class="sitem">
    <div class="head"><div><div class="pname">${esc(p?.name || 'Product')}</div><div class="meta">${esc(s.what)} · verstuurd ${fd(s.sent)}</div></div>
    ${s.received ? `<span class="pill ok">Ontvangen ${fd(s.received)}</span>` : `<span class="row"><span class="pill wait">Onderweg</span><button type="button" class="btn link" data-a="recv" data-v="${s.id}" ${dis()}>Ik heb het ontvangen</button></span>`}</div>
    ${s.received ? '' : ttBlock(s, S.profile)}
    ${p?.steps?.length ? `<details class="howto"><summary>Klik hier voor hoe je het aanbrengt</summary><ol>${p.steps.map((x, i) => `<li><b>Stap ${i + 1}</b>${esc(x)}</li>`).join('')}</ol>${p.letop ? `<p class="letop"><b>Let op:</b> ${esc(p.letop)}</p>` : ''}</details>` : ''}</div>`; }).join('')}</div></div>`;
}

/* profiel */
function vWizard(p) {
  const first = !S.edit;
  const top = `<div class="head"><span class="steps">Stap ${S.step} van 2</span>${S.edit ? '<button type="button" class="btn link" data-a="cancelEdit">Annuleer</button>' : ''}</div>`;
  if (S.step === 1) return `<div class="panel">${top}
    <div class="stack" style="gap:4px"><h2>${first ? 'Welkom bij het testpanel' : 'Over jou'}</h2>${first ? '<p class="note">Vul je profiel in, dan kun je meteen meetesten.</p>' : ''}</div>
    <div class="field"><span class="lbl">Naam</span><input id="pf-name" aria-label="Naam" autocomplete="name" value="${esc(p.name)}" data-e="name"></div>
    <div class="field ${S.miss && !adres(p) ? 'miss' : ''}"><span class="lbl">Adres voor je samples</span>
     <input id="pf-straat" placeholder="Straat en huisnummer" aria-label="Straat en huisnummer" autocomplete="street-address" value="${esc(p.straat)}" data-e="straat">
     <div class="row"><input id="pf-postcode" placeholder="Postcode" aria-label="Postcode" autocomplete="postal-code" value="${esc(p.postcode)}" data-e="postcode" style="flex:0 1 140px"><input id="pf-plaats" placeholder="Plaats" aria-label="Plaats" autocomplete="address-level2" value="${esc(p.plaats)}" data-e="plaats" style="flex:1 1 160px"></div>
     ${S.miss && !adres(p) ? '<p class="missnote">Vul je adres in, zodat we je samples kunnen versturen.</p>' : ''}</div>
    <div class="field"><span class="lbl">Noem hier je productwens</span><input id="pf-wish" aria-label="Productwens" value="${esc(p.wish)}" data-e="wish" placeholder="Bijvoorbeeld: waterproof lipstick"></div>
    <div class="row"><span class="grow"></span><button type="button" class="btn" data-a="step" data-v="2" ${dis()}>Volgende</button></div></div>`;
  return `<div class="panel">${top}
    <h2>Deel je huidige ervaringen met bestaande producten (vereist)</h2>
    <div class="cols">${expEdit(p, 'press')}${expEdit(p, 'diy')}</div>
    ${S.miss ? '<p class="missnote">Vul de rood gemarkeerde vragen in om op te slaan.</p>' : ''}
    <div class="row"><button type="button" class="btn ghost" data-a="step" data-v="1">Vorige</button><span class="grow"></span><button type="button" class="btn" data-a="saveprof" ${dis()}>${S.busy ? 'Bezig…' : 'Opslaan'}</button></div></div>`;
}
function vProfile() {
  const p = S.profile;
  if (!p) return '<div class="panel"><p class="note">Je profiel kon niet geladen worden. Ververs de pagina.</p></div>';
  if (!complete(p) || S.edit) return vWizard(p);
  return `<div class="panel"><div class="head"><h2>${esc(p.name || 'Mijn profiel')}</h2><button type="button" class="btn ghost" data-a="edit">Bewerken</button></div>
    <div><span class="lbl">Adres</span>${addrText(p)}</div>
    ${p.wish ? `<div><span class="lbl">Productwens</span>${esc(p.wish)}</div>` : ''}
    <div class="cols">${expRead(p, 'press')}${expRead(p, 'diy')}</div></div>
    <p class="note">Wil je dat we je gegevens verwijderen? Mail naar info@linaliencosmetics.com.</p>`;
}
function vNotif() {
  const p = S.profile; if (!p) return '';
  const opts = [['post', `${ADMIN} plaatst een community-update`], ['admin', `${ADMIN} start een nieuwe producttest`], ['sample', 'Er is een sample naar mij verstuurd']];
  return `<div class="panel"><div><h2>Meldingen per e-mail</h2><p class="note">Naar ${esc(p.email)}</p></div>
    <div class="stack" style="gap:14px">${opts.map(([k, l]) => `<label class="switch"><input type="checkbox" id="nf-${k}" ${p.notif[k] !== false ? 'checked' : ''} data-notif="${k}">${l}</label>`).join('')}</div></div>`;
}

/* testers (beheer) */
function inviteStatus(i) {
  const p = profileByEmail(i.email);
  if (!p) return ['Uitgenodigd', 'wait'];
  return complete(p) ? ['Compleet', 'ok'] : ['Profiel open', 'wait'];
}
function vTesters() {
  const inv = S.invites.find(i => i.email === S.tester);
  if (inv) return vTester(inv);
  return `<div class="panel"><div class="head"><h2>Testers</h2>${S.open === 'invite' ? '' : '<button type="button" class="btn" data-a="open" data-v="invite">+ Uitnodigen</button>'}</div>
    ${S.open === 'invite' ? `<form data-f="invite" class="stack" style="gap:10px"><div class="row"><input id="invEmail" type="email" required placeholder="E-mailadres" aria-label="E-mailadres" style="flex:2 1 200px"><input id="invName" placeholder="Naam (optioneel)" aria-label="Naam" style="flex:1 1 140px"></div>
      <div class="row"><button class="btn" ${dis()}>${S.busy ? 'Bezig…' : 'Uitnodigen en inloglink sturen'}</button><button type="button" class="btn link" data-a="close">Annuleer</button></div></form>` : ''}
    <div class="rows">${S.invites.map(i => { const p = profileByEmail(i.email), [l, c] = inviteStatus(i); return `<button type="button" class="rowbtn" data-a="tester" data-v="${esc(i.email)}"><span><b>${esc(p?.name || i.name || i.email)}</b>${(p?.name || i.name) ? ` <span class="meta">${esc(i.email)}</span>` : ''}</span><span class="pill ${c}">${l}</span></button>`; }).join('') || '<p class="note">Nog geen testers. Klik op "+ Uitnodigen".</p>'}</div></div>`;
}
function vTester(inv) {
  const p = profileByEmail(inv.email);
  const rm = S.rm === inv.email
    ? `<span class="row"><span class="meta">Toegang intrekken?</span><button type="button" class="btn" data-a="rm" ${dis()}>Ja, intrekken</button><button type="button" class="btn link" data-a="rmno">Nee</button></span>`
    : `<button type="button" class="btn ghost" data-a="rmask">Toegang intrekken</button>`;
  let body;
  if (!p) body = `<p class="note">Deze tester heeft nog niet ingelogd.</p><div><button type="button" class="btn ghost" data-a="resend" ${dis()}>Inloglink opnieuw sturen</button></div>`;
  else if (S.ttab === 'profiel') body = `<div><span class="lbl">Adres</span>${addrText(p)}</div><div><span class="lbl">Productwens</span>${esc(p.wish) || '<span class="meta">Geen wens doorgegeven</span>'}</div><div class="cols">${expRead(p, 'press')}${expRead(p, 'diy')}</div>`;
  else {
    const rows = S.samples.filter(s => s.tester === p.id);
    body = `<div><span class="lbl">Verzendadres</span>${addrText(p)}</div>
      ${rows.length ? `<div class="rows">${rows.map(s => `<div><div><div class="pname">${esc(P(s.product)?.name || 'Product')}</div><div class="meta">${esc(s.what)} · verstuurd ${fd(s.sent)}${s.code ? ` · ${esc(s.carrier || '')} ${esc(s.code)}` : ''}</div></div>
        ${s.received ? `<span class="pill ok">Ontvangen ${fd(s.received)}</span>` : `<span class="row"><span class="pill wait">Onderweg</span><button type="button" class="btn link" data-a="recvAdmin" data-v="${s.id}">Markeer ontvangen</button></span>`}</div>`).join('')}</div>` : '<p class="note">Nog niets verstuurd.</p>'}
      ${S.open === 'sample' ? `<form data-f="sample" class="stack compose" style="gap:10px"><div class="row">
         <select id="spProd" aria-label="Product" style="flex:1 1 180px">${S.products.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select>
         <input id="spWhat" required placeholder="Wat, bijv. 2 sets maat M" aria-label="Wat verstuurd" style="flex:1 1 180px">
         <input id="spDate" type="date" value="${today()}" required aria-label="Verstuurd op" style="flex:0 1 160px"></div>
         <div class="row"><select id="spCarrier" aria-label="Vervoerder" style="flex:0 1 160px"><option value="">Vervoerder</option>${Object.keys(CARRIERS).map(c => `<option>${c}</option>`).join('')}<option>Anders</option></select>
         <input id="spCode" placeholder="Track & trace-code" aria-label="Track & trace-code" style="flex:1 1 200px"></div>
         <div class="row"><span class="grow"></span><button type="button" class="btn link" data-a="close">Annuleer</button><button class="btn" ${dis()}>Opslaan</button></div></form>`
        : (S.products.length ? '<div><button type="button" class="btn" data-a="open" data-v="sample">+ Sample versturen</button></div>' : '<p class="note">Maak eerst een product aan bij Dagupdates.</p>')}`;
  }
  return `<div><button type="button" class="btn link" data-a="tester" data-v="">← Alle testers</button></div>
   <div class="panel"><div class="head"><div><h2>${esc(p?.name || inv.name || inv.email)}</h2><span class="meta">${esc(inv.email)}</span></div>${rm}</div>
    ${p ? `<div class="subtabs">${[['profiel', 'Profiel'], ['samples', 'Samples']].map(([k, l]) => `<button type="button" data-a="ttab" data-v="${k}" aria-current="${S.ttab === k}">${l}</button>`).join('')}</div>` : ''}
    ${body}</div>`;
}

/* ---------- render ---------- */
function render() {
  $('logout').hidden = !S.user;
  if (S.loading) { $('nav').innerHTML = ''; $('whoLine').textContent = ''; $('main').innerHTML = '<p class="loading">Laden…</p>'; return; }
  if (!S.user) { $('nav').innerHTML = ''; $('whoLine').textContent = ''; $('main').innerHTML = vLogin(); return; }
  if (!S.member) { $('nav').innerHTML = ''; $('whoLine').textContent = S.user.email; $('main').innerHTML = vNoAccess(); return; }
  const locked = !S.admin && !complete(S.profile);
  if (locked) S.view = 'profiel';
  const tabs = S.admin ? [['chats', 'Dagupdates'], ['community', 'Community'], ['testers', 'Testers']]
    : [['chats', 'Dagupdates'], ['community', 'Community'], ['samples', 'Mijn samples'], ['profiel', 'Mijn profiel'], ['notif', 'Meldingen']];
  if (!tabs.some(([k]) => k === S.view)) S.view = 'chats';
  $('nav').innerHTML = tabs.map(([k, l]) => `<button type="button" data-a="view" data-v="${k}" aria-current="${S.view === k}" ${locked && k !== 'profiel' ? 'disabled' : ''}>${l}</button>`).join('');
  $('whoLine').textContent = S.admin ? 'Beheer' : (S.profile?.name || S.user.email);
  $('main').innerHTML = ({ chats: vDag, community: vCommunity, testers: vTesters, samples: vSamples, profiel: vProfile, notif: vNotif })[S.view]();
}
async function run(what, fn) {
  if (S.busy) return;
  S.busy = true;
  const btns = [...document.querySelectorAll('#main button')]; btns.forEach(b => { b.disabled = true; });
  try { await fn(); S.busy = false; render(); }
  catch (e) { S.busy = false; btns.forEach(b => { b.disabled = false; }); fail(e, what); }
}
async function sendLink(email) {
  const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: REDIRECT } });
  return error;
}
async function saveProfile() {
  const p = S.profile;
  const { error } = await sb.from('profiles').update({ name: p.name || '', show_name: true, wish: p.wish || '', straat: p.straat || '', postcode: p.postcode || '', plaats: p.plaats || '', press: p.press, diy: p.diy }).eq('id', p.id);
  if (error) throw error;
}

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
  const a = b.dataset.a, v = b.dataset.v;
  if (a !== 'step' && a !== 'saveprof') S.flash = false;
  switch (a) {
    case 'logout': sb.auth.signOut(); S.login = { state: null, email: '', err: '' }; return;
    case 'loginAgain': S.login = { state: null, email: '', err: '' }; break;
    case 'view': S.view = v; S.open = null; S.tester = null; S.edit = false; S.step = 1; S.miss = false; S.editProd = false; break;
    case 'prod': S.prod = v; S.open = null; S.editProd = false; break;
    case 'open': S.open = v; break;
    case 'close': S.open = null; break;
    case 'editProd': S.editProd = true; break;
    case 'closeEditProd': S.editProd = false; break;
    case 'tester': S.tester = v || null; S.ttab = 'profiel'; S.open = null; S.rm = null; break;
    case 'ttab': S.ttab = v; S.open = null; break;
    case 'rmask': S.rm = S.tester; break;
    case 'rmno': S.rm = null; break;
    case 'rm': return run('Toegang intrekken', async () => {
      const email = S.tester, p = profileByEmail(email);
      let r = await sb.from('invites').delete().eq('email', email); if (r.error) throw r.error;
      if (p) { r = await sb.from('profiles').delete().eq('id', p.id); if (r.error) throw r.error; }
      S.tester = null; S.rm = null; await load(); toast('Toegang ingetrokken');
    });
    case 'resend': return run('Inloglink sturen', async () => { const err = await sendLink(S.tester); if (err) throw err; toast('Inloglink verstuurd'); });
    case 'recv': return run('Opslaan', async () => { const { error } = await sb.rpc('mark_received', { sid: v }); if (error) throw error; await load(); });
    case 'recvAdmin': return run('Opslaan', async () => { const { error } = await sb.from('samples').update({ received: today() }).eq('id', v); if (error) throw error; await load(); });
    case 'delpost': return run('Verwijderen', async () => { const { error } = await sb.from('posts').delete().eq('id', v); if (error) throw error; await load(); toast('Verwijderd'); });
    case 'step': {
      if (+v === 2 && !adres(S.profile)) { S.miss = true; break; }
      if (+v === 2) return run('Opslaan', async () => { await saveProfile(); S.step = 2; S.miss = false; });
      S.step = 1; S.miss = false; break;
    }
    case 'edit': S.snap = JSON.stringify(S.profile); S.edit = true; S.step = 1; break;
    case 'cancelEdit': Object.assign(S.profile, JSON.parse(S.snap)); S.edit = false; S.step = 1; S.miss = false; break;
    case 'saveprof':
      if (!complete(S.profile)) { S.miss = true; break; }
      return run('Profiel opslaan', async () => { await saveProfile(); S.edit = false; S.step = 1; S.miss = false; toast('Profiel opgeslagen'); });
  }
  render();
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'upProd') { S.prod = el.value; S.flash = false; render(); return; }
  if (el.id === 'upPhoto') { $('upFile').textContent = el.files[0]?.name || ''; return; }
  if (el.id === 'postPhoto') { $('postFile').textContent = el.files[0]?.name || ''; return; }
  if (el.dataset.notif) {
    const k = el.dataset.notif; S.profile.notif = { ...S.profile.notif, [k]: el.checked };
    sb.from('profiles').update({ notif: S.profile.notif }).eq('id', S.profile.id).then(({ error }) => error ? fail(error, 'Opslaan') : toast('Opgeslagen'));
    return;
  }
  if (!el.dataset.e || !S.profile) return;
  const [a, b] = el.dataset.e.split('.'), val = el.type === 'checkbox' ? el.checked : el.value;
  if (b) S.profile[a] = { ...S.profile[a], [b]: val }; else S.profile[a] = val;
  if (el.dataset.r) render();
});
document.addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target.dataset.f;
  if (f === 'login') {
    const email = low($('loginEmail').value);
    S.login = { state: null, email, err: '' };
    return run('Inloggen', async () => {
      const err = await sendLink(email);
      if (!err) S.login.state = 'sent';
      else if (/database error|signups not allowed|not allowed/i.test(err.message)) S.login.state = 'denied';
      else { S.login.state = 'error'; S.login.err = err.status === 429 ? 'Je hebt net al een link gevraagd. Wacht een minuut en probeer het opnieuw.' : err.message; }
    });
  }
  if (f === 'newprod' || f === 'editprod') {
    const row = { name: $('npName').value.trim(), description: $('npDesc').value.trim(), steps: $('npSteps').value.split('\n').map(s => s.trim()).filter(Boolean), letop: $('npLetop').value.trim() };
    return run('Product opslaan', async () => {
      const r = f === 'newprod' ? await sb.from('products').insert(row).select().single() : await sb.from('products').update(row).eq('id', S.prod).select().single();
      if (r.error) throw r.error;
      S.prod = r.data.id; S.open = null; S.editProd = false; await load(); toast('Product opgeslagen');
    });
  }
  if (f === 'invite') {
    const email = low($('invEmail').value), name = $('invName').value.trim();
    return run('Uitnodigen', async () => {
      const { error } = await sb.from('invites').insert({ email, name });
      if (error && error.code !== '23505') throw error;
      const err = await sendLink(email);
      S.open = null; await load();
      if (err) toast('Tester toegevoegd, maar de inloglink kon niet worden verstuurd: ' + err.message, true);
      else toast('Uitnodiging verstuurd naar ' + email);
    });
  }
  if (f === 'sample') {
    const p = profileByEmail(S.tester);
    const row = { tester: p.id, product: $('spProd').value, what: $('spWhat').value.trim(), sent: $('spDate').value, carrier: $('spCarrier').value, code: $('spCode').value.trim() };
    return run('Sample opslaan', async () => { const { error } = await sb.from('samples').insert(row); if (error) throw error; S.open = null; await load(); toast('Sample opgeslagen'); });
  }
  if (f === 'post') {
    const text = cap($('postText').value), file = $('postPhoto').files[0];
    return run('Plaatsen', async () => {
      const photo = await uploadPhoto(file, 'community');
      const { error } = await sb.from('posts').insert({ text, photo }); if (error) throw error;
      await load(); toast('Community-update geplaatst');
    });
  }
  if (f === 'upd') {
    const g = n => document.querySelector(`input[name="up-${n}"]:checked`)?.value || '';
    const txt = $('upText').value.trim(), file = $('upPhoto').files[0];
    const row = { tester: S.user.id, product: S.prod, day: +$('upDay').value, cijfer: +g('cijfer') || null, zit: g('zit'), los: g('los'), irritatie: g('irritatie'),
      water: [...document.querySelectorAll('input[name="up-water"]:checked')].map(x => x.value), text: txt ? cap(txt) : '' };
    return run('Dagupdate plaatsen', async () => {
      row.photo = await uploadPhoto(file, S.user.id);
      const { error } = await sb.from('updates').insert(row); if (error) throw error;
      await load(); S.flash = true;
    });
  }
});
