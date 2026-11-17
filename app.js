'use strict';
/* Campo - actualización de cédulas en tablet. Funciona sin conexión (salvo las imágenes del mapa). */
const $ = (s, r = document) => r.querySelector(s);
const el = (t, a = {}, ...c) => {
  const e = document.createElement(t);
  for (const [k, v] of Object.entries(a)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const x of c.flat()) e.append(x && x.nodeType ? x : document.createTextNode(x == null ? '' : x));
  return e;
};
const toast = (m, ms = 3000) => { const t = $('#toast'); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, ms); };
const today = () => new Date().toISOString().slice(0, 10);
const norm = s => String(s == null ? '' : s).trim();
const strip = s => norm(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ');
const safe = s => norm(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\\/:*?"<>|\s]+/g, '-').replace(/^-+|-+$/g, '');

/* ---------- Campos de la cédula ---------- */
const UF = ['', 'Protección', 'Ornato', 'Actividad económica primaria', 'General', 'No aplica'];
const SECTIONS = [
  { t: 'Encabezado', f: [
    ['kilometraje', 'Kilometraje (ubicación)', 'text', 'h'], ['folio', 'Folio', 'text', 'h'],
    ['x', 'X (UTM, m)', 'num', 'h'], ['y', 'Y (UTM, m)', 'num', 'h'],
    ['fecha_levantamiento', 'Fecha de levantamiento', 'date', 'h'], ['personal_levanto', 'Personal que levantó', 'text', 'h'],
    ['fecha_validacion', 'Fecha de validación', 'date', 'h'], ['estatus_validacion', 'Estatus de validación', 'text', 'h']] },
  { t: 'Datos generales del ocupante', f: [
    ['tipo_persona', 'Tipo de persona', 'select', 'h', ['', 'Física', 'Moral']], ['rfc', 'RFC', 'text', 'h'],
    ['nombre', 'Nombre y/o razón social', 'text', 'f'], ['nombre_comercial', 'Nombre comercial', 'text', 'f'],
    ['rep_legal', 'Representante legal', 'text', 'f'], ['correo', 'Correo electrónico', 'email', 'h'], ['telefono', 'Teléfono', 'tel', 'h'],
    ['domicilio_notif', 'Domicilio para recibir notificaciones', 'text', 'f']] },
  { t: 'Ubicación, características y uso del predio', f: [
    ['calle_numero', 'Calle y número', 'text', 'f'], ['colonia', 'Colonia', 'text', 'h'], ['lote_mza', 'Lote / Mza', 'text', 'h'],
    ['municipio', 'Municipio', 'text', 'h'], ['estado', 'Estado', 'text', 'h'], ['localidad', 'Localidad', 'text', 'h'],
    ['playa', 'Nombre de la playa (sitio)', 'text', 'h'], ['cp', 'Código postal', 'text', 'h']] },
  { t: 'Coordenadas UTM de inicio y final de la concesión', f: [
    ['datum', 'Datum', 'text', 'h'], ['zona_utm', 'Zona UTM', 'text', 'h'],
    ['v1x', 'Vértice 1 X', 'num', 'h'], ['v1y', 'Vértice 1 Y', 'num', 'h'], ['v2x', 'Vértice 2 X', 'num', 'h'], ['v2y', 'Vértice 2 Y', 'num', 'h'],
    ['v3x', 'Vértice 3 X', 'num', 'h'], ['v3y', 'Vértice 3 Y', 'num', 'h'], ['v4x', 'Vértice 4 X', 'num', 'h'], ['v4y', 'Vértice 4 Y', 'num', 'h'],
    ['vnx', 'Vértice N X', 'num', 'h'], ['vny', 'Vértice N Y', 'num', 'h'], ['mas_vertices', 'Más vértices (X, Y por línea)', 'area', 'f']] },
  { t: 'Uso para fines de recaudación (art. 232 LFD)', f: [
    ['uso_fiscal', 'Uso fiscal declarado', 'select', 'h', UF], ['uso_real_fiscal', 'Uso real fiscal', 'select', 'h', UF],
    ['frente_m', 'Frente ocupado de zona federal (m)', 'num', 'h']] },
  { t: 'Superficies (m²)', f: [
    ['sup_total', 'Superficie total', 'num', 't'], ['sup_construida', 'Construida', 'num', 't'], ['sup_libre', 'Libre', 'num', 't'],
    ['sup_zf', 'Sup. de zona federal', 'num', 't'], ['sup_tgm', 'Sup. de TGM', 'num', 't'], ['sup_total2', 'Sup. total', 'num', 't'],
    ['area_plano', 'Área medida en plano (referencia de la base)', 'num', 'h']] },
  { t: 'Uso y obras', f: [
    ['uso_aprov', 'Uso, aprovechamiento o explotación', 'area', 'f'], ['obras', 'Descripción de obras e instalaciones', 'area', 'f'],
    ['materiales', 'Materiales de las obras', 'area', 'f'], ['servicios', 'Servicios', 'area', 'f'], ['fecha_ocupacion', 'Fecha de ocupación', 'date', 'h']] },
  { t: 'Situación jurídica y trámite', f: [
    ['sit_juridica', 'Situación jurídica', 'text', 'f'], ['sit_tramite', 'Situación del trámite', 'text', 'f'],
    ['tipo_tramite', 'Tipo de trámite', 'text', 'h'], ['fecha_inicio', 'Fecha de inicio', 'date', 'h'],
    ['tipo_resolucion', 'Tipo de resolución', 'text', 'h'], ['fecha_solicitud', 'Fecha de solicitud', 'date', 'h'],
    ['vigencia', 'Vigencia', 'text', 'h'], ['concesion', 'Concesión (núm. de resolutivo)', 'text', 'h'],
    ['expediente', 'Expediente', 'text', 'f'], ['obs_titulo', 'Observaciones de título', 'area', 'f'], ['obs_base', 'Observaciones de la base (OBS)', 'area', 'f']] },
];
const FIELDS = SECTIONS.flatMap(s => s.f.map(([k, l, t, w, o]) => ({ k, l, t, w, o })));
const LABEL = Object.fromEntries(FIELDS.map(f => [f.k, f.l]));
const SLOTS = ['Lindero izquierdo', 'Frente', 'Lindero derecho', 'Panorámica'];
const SLUG = ['lindero-izq', 'frente', 'lindero-der', 'panoramica'];

/* Columnas del Excel del padrón -> campo de la cédula */
const COLMAP = { 'estado': 'estado', 'municipio': 'municipio', 'numero de expediente': 'expediente', 'nombre o razon social vigente': 'nombre',
  'nombre tramite': 'tipo_tramite', 'superficie autorizada': 'sup_total', 'localidad': 'localidad', 'sitio': 'playa',
  'uso fiscal autorizado': 'uso_fiscal', 'vigencia': 'vigencia', 'numero de resolutivo': 'concesion', 'estatus final': 'sit_juridica',
  'x': 'x', 'y': 'y', 'area': 'area_plano', 'obs': 'obs_base' };

/* ---------- Base de datos local (IndexedDB) ---------- */
let _db;
const dbOpen = () => _db ? Promise.resolve(_db) : new Promise((res, rej) => {
  const r = indexedDB.open('campo', 1);
  r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('records', { keyPath: 'id' }); const m = d.createObjectStore('media', { keyPath: 'key' }); m.createIndex('rec', 'rec'); d.createObjectStore('meta'); };
  r.onsuccess = () => { _db = r.result; res(_db); };
  r.onerror = () => rej(r.error);
});
const rq = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const store = async (n, mode = 'readonly') => (await dbOpen()).transaction(n, mode).objectStore(n);
const dbAll = async n => rq((await store(n)).getAll());
const dbGet = async (n, k) => rq((await store(n)).get(k));
const dbPut = async (n, v, k) => rq((await store(n, 'readwrite')).put(v, k));
const dbDel = async (n, k) => rq((await store(n, 'readwrite')).delete(k));
const dbClear = async n => rq((await store(n, 'readwrite')).clear());
const mediaOf = async id => rq((await store('media')).index('rec').getAll(id));

/* ---------- Importar padrón desde Excel ---------- */
function parsePadron(buf) {
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
  const head = rows[0].map(h => strip(h));
  const idx = {}; head.forEach((h, i) => { if (COLMAP[h] && !(COLMAP[h] in idx)) idx[COLMAP[h]] = i; });
  if (!('nombre' in idx) || !('x' in idx)) throw new Error('No reconozco las columnas del padrón (faltan "Nombre o Razon social vigente" o "X").');
  const unidadI = head.indexOf('unidad vigencia');
  const seen = new Map(), out = [];
  rows.slice(1).forEach((r, n) => {
    if (r.every(v => v == null || norm(v) === '')) return;
    const data = Object.fromEntries(FIELDS.map(f => [f.k, '']));
    for (const [k, i] of Object.entries(idx)) data[k] = r[i] == null ? '' : (typeof r[i] === 'number' ? r[i] : norm(r[i]));
    if (unidadI >= 0 && data.vigencia !== '' && r[unidadI]) data.vigencia = `${data.vigencia} ${norm(r[unidadI])}`;
    data.datum = 'ITRF2008'; data.zona_utm = '14';
    let base = safe(data.concesion) || (data.expediente !== '' ? 'EXP-' + safe(data.expediente) : '') || ('SIN-ID-fila' + (n + 2));
    const c = (seen.get(base) || 0) + 1; seen.set(base, c);
    const id = c > 1 ? `${base}-dup${c}` : base;
    data.folio = id;
    out.push({ id, fila: n + 2, orig: { ...data }, data, status: 0, nfotos: 0, ndocs: 0, ts: null, marker: null, dup: c > 1, sinId: base.startsWith('SIN-ID') });
  });
  return out;
}

/* ---------- Utilidades de imagen ---------- */
async function toJpeg(file, max, q, bw) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null);
  let img = bmp;
  if (!img) { img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); }); }
  const w0 = img.width, h0 = img.height, k = Math.min(1, max / Math.max(w0, h0));
  const c = document.createElement('canvas'); c.width = Math.round(w0 * k); c.height = Math.round(h0 * k);
  const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
  if (bw) { // escala de grises con contraste, útil para documentos
    const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) { let v = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]; v = Math.max(0, Math.min(255, (v - 110) * 1.6 + 128)); p[i] = p[i + 1] = p[i + 2] = v; }
    g.putImageData(d, 0, 0);
  }
  return new Promise(r => c.toBlob(r, 'image/jpeg', q));
}
const pickFile = (capture, multiple) => new Promise(res => {
  const i = el('input', { type: 'file', accept: 'image/*', multiple: multiple ? '' : false });
  if (capture) i.setAttribute('capture', 'environment');
  i.onchange = () => res([...i.files]); i.click();
});
const download = (blob, name) => { const a = el('a', { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); };

/* ---------- UTM <-> lat/lon ---------- */
const utmDef = z => `+proj=utm +zone=${parseInt(z) || 14} +datum=WGS84 +units=m +no_defs`;
const utmToLL = (x, y, z) => { const [lng, lat] = proj4(utmDef(z), 'WGS84', [+x, +y]); return [lat, lng]; };
const llToUtm = (lat, lng, z) => proj4('WGS84', utmDef(z), [lng, lat]).map(v => Math.round(v * 10000) / 10000);
const hasNum = v => v !== '' && v != null && isFinite(+v);

/* ---------- Estado ---------- */
const S = { recs: [], q: '', filtro: 'todos', cur: null, map: null };
const app = $('#app');
const changed = r => FIELDS.filter(f => norm(r.data[f.k]) !== norm(r.orig[f.k])).map(f => f.k);
const stLabel = r => ['Pendiente', 'En proceso', 'Terminado'][r.status];
async function loadAll() { S.recs = (await dbAll('records')).sort((a, b) => a.fila - b.fila); }
let saveT;
const touch = async r => { r.ts = new Date().toISOString(); if (r.status === 0) { r.status = 1; if (!r.data.fecha_levantamiento) r.data.fecha_levantamiento = today(); if (!r.data.personal_levanto) r.data.personal_levanto = (await dbGet('meta', 'personal')) || ''; } };
const saveRec = (r, now, edit = true) => { clearTimeout(saveT); const go = async () => { if (edit) await touch(r); await dbPut('records', r); }; if (now) return go(); saveT = setTimeout(go, 350); };

/* ---------- Vista: lista ---------- */
async function viewList() {
  S.cur = null; if (S.map) { S.map.remove(); S.map = null; }
  await loadAll();
  const n = [0, 0, 0]; S.recs.forEach(r => n[r.status]++);
  const q = strip(S.q);
  const vis = S.recs.filter(r => (S.filtro === 'todos' || r.status === +S.filtro) && (!q || strip([r.id, r.data.nombre, r.data.playa, r.data.expediente, r.data.sit_juridica].join(' ')).includes(q)));
  app.replaceChildren(
    el('div', { class: 'top' }, el('h1', {}, 'Actualización de cédulas en campo'),
      el('button', { onclick: menu }, 'Base y exportación')),
    el('div', { class: 'wrap' },
      S.recs.length ? [
        el('div', { class: 'bar' },
          el('input', { type: 'search', placeholder: 'Buscar por nombre, resolutivo, expediente o sitio', value: S.q, oninput: e => { S.q = e.target.value; clearTimeout(viewList.t); viewList.t = setTimeout(async () => { const p = e.target.selectionStart; await viewList(); const i = $('input[type=search]'); i.focus(); i.setSelectionRange(p, p); }, 250); } }),
          ...[['todos', `Todos (${S.recs.length})`], ['0', `Pendientes (${n[0]})`], ['1', `En proceso (${n[1]})`], ['2', `Terminados (${n[2]})`]].map(([v, t]) => el('button', { class: 'chip' + (S.filtro === v ? ' on' : ''), onclick: () => { S.filtro = v; viewList(); } }, t))),
        el('div', { class: 'list' }, vis.map(r => el('div', { class: 'card', onclick: () => viewRec(r.id) },
          el('div', {}, el('span', { class: 'id' }, r.id), ' ', el('span', { class: 'badge p' + r.status }, stLabel(r)), r.dup ? el('span', { class: 'badge' }, 'resolutivo repetido en la base') : '', r.sinId ? el('span', { class: 'badge' }, 'sin resolutivo ni expediente') : ''),
          el('div', { class: 'nm' }, r.data.nombre || '(sin nombre)'),
          el('div', { class: 'meta' }, [r.data.playa, r.data.sit_juridica].filter(Boolean).join(' · ')),
          el('div', { class: 'meta' }, `Fotos ${r.nfotos}/4 · Documentos ${r.ndocs}`)))),
        vis.length ? '' : el('div', { class: 'empty' }, 'Sin resultados.')
      ] : el('div', { class: 'empty' }, el('p', {}, 'Aún no hay base cargada.'), el('p', {}, 'Toca "Base y exportación" y luego "Cargar padrón (Excel)" para importar el Excel del padrón.'))));
}

/* ---------- Menú: base, exportación, ajustes ---------- */
async function menu() {
  const est = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null;
  const personal = (await dbGet('meta', 'personal')) || '';
  const d = el('dialog', {},
    el('h2', {}, 'Base y exportación'),
    el('p', { class: 'info' }, `Registros: ${S.recs.length}` + (est ? ` · Espacio usado: ${(est.usage / 1048576).toFixed(0)} MB` : '')),
    el('div', { class: 'fld' }, el('label', {}, 'Personal que levanta (se pone en cada ficha nueva)'), el('input', { value: personal, onchange: e => dbPut('meta', e.target.value.trim(), 'personal') })),
    el('div', { class: 'row' }, el('button', { class: 'pri', onclick: async () => { d.close(); await importar(); } }, 'Cargar padrón (Excel)')),
    el('div', { class: 'row' },
      el('button', { class: 'ok', onclick: () => { d.close(); exportXlsx(); } }, 'Descargar Excel actualizado'),
      el('button', { class: 'ok', onclick: () => { d.close(); exportZip(); } }, 'Descargar fotos y documentos (ZIP)')),
    el('p', { class: 'info' }, 'El Excel trae los datos y los nombres de archivo de cada foto; las imágenes viajan en el ZIP, una carpeta por registro.'),
    el('div', { class: 'row' }, el('button', { class: 'bad sm', onclick: async () => { if (prompt('Esto borra TODOS los registros, fotos y documentos de esta tablet. Escribe BORRAR para confirmar.') === 'BORRAR') { await dbClear('records'); await dbClear('media'); d.close(); toast('Base borrada'); viewList(); } } }, 'Borrar todo'), el('button', { onclick: () => d.close() }, 'Cerrar')));
  document.body.append(d); d.addEventListener('close', () => d.remove()); d.showModal();
}
async function importar() {
  const [f] = await pickFileAny(); if (!f) return;
  try {
    const recs = parsePadron(await f.arrayBuffer());
    const ya = new Set(S.recs.map(r => r.id));
    const nuevos = recs.filter(r => !ya.has(r.id));
    if (S.recs.length && !confirm(`La base ya tiene ${S.recs.length} registros. Se agregarán ${nuevos.length} nuevos y no se tocarán los existentes. ¿Continuar?`)) return;
    for (const r of nuevos) await dbPut('records', r);
    toast(`Importados ${nuevos.length} registros`); viewList();
  } catch (e) { alert('No se pudo importar: ' + e.message); }
}
const pickFileAny = () => new Promise(res => { const i = el('input', { type: 'file', accept: '.xlsx,.xls' }); i.onchange = () => res([...i.files]); i.click(); });

/* ---------- Vista: ficha ---------- */
async function viewRec(id) {
  const r = S.recs.find(x => x.id === id) || await dbGet('records', id); S.cur = r;
  if (S.map) { S.map.remove(); S.map = null; }
  const upd = () => { const c = changed(r).length; hd.textContent = c ? `${c} campo(s) modificado(s)` : 'Sin cambios sobre la base'; };
  const hd = el('span', { class: 'info' });
  const form = SECTIONS.map(s => el('fieldset', {}, el('legend', {}, s.t), el('div', { class: 'f' }, s.f.map(([k, l, t, w, o]) => campo(r, k, l, t, w, o, upd)))));
  const side = el('div', { class: 'side' });
  app.replaceChildren(
    el('div', { class: 'top' }, el('button', { onclick: async () => { await saveRec(r, true, changed(r).length > 0); viewList(); } }, '‹ Lista'),
      el('h1', {}, `${r.id} · ${r.data.nombre || ''}`),
      el('button', { class: r.status === 2 ? '' : 'pri', onclick: async () => {
        if (r.status === 2) { r.status = 1; } else { if (r.nfotos < 4 && !confirm(`Solo hay ${r.nfotos} de 4 fotografías. ¿Marcar como terminado de todos modos?`)) return; r.status = 2; }
        await saveRec(r, true, false); if (r.status === 2) viewList(); else viewRec(r.id);
      } }, r.status === 2 ? 'Reabrir' : 'Marcar terminado')),
    el('div', { class: 'wrap' }, hd, el('div', { class: 'grid' }, el('div', {}, form), side)));
  upd();
  renderSide(r, side);
}
function campo(r, k, l, t, w, o, upd) {
  const cls = () => 'fld ' + (w === 'h' ? 'h' : w === 't' ? 't' : '') + (norm(r.data[k]) !== norm(r.orig[k]) ? ' chg' : '');
  const box = el('div', { class: cls() });
  const draw = () => {
    box.className = cls(); box.replaceChildren(el('label', {}, l));
    let inp; const v = r.data[k] == null ? '' : r.data[k];
    if (t === 'select') { const opts = [...o]; if (v !== '' && !opts.includes(v)) opts.push(v); inp = el('select', {}, opts.map(x => el('option', { value: x }, x || '—'))); inp.value = v; }
    else if (t === 'area') inp = el('textarea', {}, v);
    else inp = el('input', { type: t === 'num' ? 'text' : t, inputmode: t === 'num' ? 'decimal' : false, value: v });
    const on = () => { let x = inp.value; if (t === 'num' && hasNum(x.replace(',', '.'))) x = x.replace(',', '.'); r.data[k] = x; saveRec(r); const was = box.className; box.className = cls(); if (was !== box.className) draw2(); upd(); };
    inp.addEventListener(t === 'select' || t === 'date' ? 'change' : 'input', on); box.append(inp); box._inp = inp;
    if (norm(r.data[k]) !== norm(r.orig[k])) box.append(el('div', { class: 'orig' }, 'Base: ' + (norm(r.orig[k]) || '(vacío)'), el('a', { onclick: () => { r.data[k] = r.orig[k]; saveRec(r); draw(); upd(); } }, 'restaurar')));
  };
  const draw2 = () => { // redibuja solo la nota de "Base:" sin perder el foco
    $('.orig', box)?.remove();
    if (norm(r.data[k]) !== norm(r.orig[k])) box.append(el('div', { class: 'orig' }, 'Base: ' + (norm(r.orig[k]) || '(vacío)'), el('a', { onclick: () => { r.data[k] = r.orig[k]; saveRec(r); draw(); upd(); } }, 'restaurar')));
  };
  draw(); box._set = v => { r.data[k] = v; saveRec(r); draw(); upd(); }; box.dataset.k = k; return box;
}
const setField = (k, v) => { const b = document.querySelector(`.fld[data-k="${k}"]`); if (b) b._set(v); };

/* ---------- Panel lateral: croquis, fotos, documentos ---------- */
async function renderSide(r, side) {
  const media = await mediaOf(r.id);
  const urls = [];
  const refresh = () => renderSide(r, side);
  const photos = media.filter(m => m.kind === 'foto').sort((a, b) => a.n - b.n);
  const docs = media.filter(m => m.kind === 'doc').sort((a, b) => a.n - b.n);
  r.nfotos = new Set(photos.map(p => p.n)).size; r.ndocs = docs.length; await dbPut('records', r);
  const url = b => { const u = URL.createObjectURL(b); urls.push(u); return u; };
  const nSlots = Math.max(4, ...photos.map(p => p.n));
  const slotEls = [];
  for (let n = 1; n <= nSlots; n++) {
    const p = photos.find(x => x.n === n), nm = n <= 4 ? SLOTS[n - 1] : `Adicional ${n}`;
    slotEls.push(el('div', { class: 'slot' + (p ? ' full' : '') }, el('div', { class: 'nm' }, `${n}. ${nm}`),
      p ? el('img', { src: url(p.blob), alt: nm }) : el('div', { class: 'ph' }, 'Sin foto'),
      el('div', { class: 'bt' },
        el('button', { class: 'sm pri', onclick: () => addPhoto(r, n, true, refresh) }, p ? 'Repetir' : 'Tomar'),
        el('button', { class: 'sm', onclick: () => addPhoto(r, n, false, refresh) }, 'Galería'),
        p ? el('button', { class: 'sm bad', onclick: async () => { if (confirm('¿Borrar esta foto?')) { await dbDel('media', p.key); refresh(); } } }, 'Borrar') : '')));
  }
  const mapPanel = el('div', { class: 'panel' }, el('h2', {}, 'Croquis (imagen satelital y calles)'), el('div', { id: 'map' }), mapControls(r));
  side.replaceChildren(mapPanel,
    el('div', { class: 'panel' }, el('h2', {}, `Fotografías del predio (${r.nfotos}/4 mínimo)`), el('div', { class: 'slots' }, slotEls),
      el('div', { class: 'row' }, el('button', { class: 'sm', onclick: () => addPhoto(r, nSlots + 1, true, refresh) }, '+ Foto adicional')),
      el('p', { class: 'info' }, 'Nombre de archivo: ' + `${r.id}_1-lindero-izq.jpg, ${r.id}_2-frente.jpg …`)),
    el('div', { class: 'panel' }, el('h2', {}, 'Documentos digitalizados'),
      el('div', { class: 'row' },
        el('button', { class: 'pri sm', onclick: () => addDoc(r, true, refresh) }, 'Escanear con la cámara'),
        el('button', { class: 'sm', onclick: () => addDoc(r, false, refresh) }, 'Elegir imagen')),
      el('div', { class: 'docs' }, docs.map(d => el('div', { class: 'doc' }, el('img', { src: url(d.blob) }), el('div', {}, d.name), el('button', { class: 'sm bad', onclick: async () => { if (confirm('¿Borrar este documento?')) { await dbDel('media', d.key); refresh(); } } }, 'Borrar'))))));
  initMap(r);
}
async function addPhoto(r, n, cam, done) {
  const [f] = await pickFile(cam, false); if (!f) return;
  try {
    const blob = await toJpeg(f, 2000, 0.85, false);
    const nm = `${r.id}_${n}-${n <= 4 ? SLUG[n - 1] : 'adicional'}.jpg`;
    await dbPut('media', { key: `${r.id}|foto|${n}`, rec: r.id, kind: 'foto', n, name: nm, blob, ts: new Date().toISOString() });
    await touch(r); await dbPut('records', r); done();
  } catch (e) { alert('No se pudo guardar la foto: ' + e.message); }
}
async function addDoc(r, cam, done) {
  const files = await pickFile(cam, !cam); if (!files.length) return;
  const bw = confirm('¿Mejorar como documento (blanco y negro con más contraste)?\nAceptar = sí · Cancelar = conservar a color');
  try {
    for (const f of files) {
      const cur = (await mediaOf(r.id)).filter(m => m.kind === 'doc'); const n = Math.max(0, ...cur.map(d => d.n)) + 1;
      const blob = await toJpeg(f, 2400, 0.8, bw);
      await dbPut('media', { key: `${r.id}|doc|${n}`, rec: r.id, kind: 'doc', n, name: `${r.id}_DOC-${String(n).padStart(2, '0')}.jpg`, blob, ts: new Date().toISOString() });
    }
    await touch(r); await dbPut('records', r); done();
  } catch (e) { alert('No se pudo guardar el documento: ' + e.message); }
}

/* ---------- Mapa ---------- */
const TARGETS = [['x,y', 'X, Y del predio'], ['v1', 'Vértice 1'], ['v2', 'Vértice 2'], ['v3', 'Vértice 3'], ['v4', 'Vértice 4'], ['vn', 'Vértice N']];
function mapControls(r) {
  const sel = el('select', { id: 'tgt' }, TARGETS.map(([v, t]) => el('option', { value: v }, t)));
  return el('div', {},
    el('div', { class: 'row' }, sel, el('button', { class: 'sm pri', onclick: () => asignar(r, sel.value) }, 'Asignar marcador a ese campo'),
      el('button', { class: 'sm', onclick: () => gps(r) }, 'Mi ubicación (GPS)')),
    el('p', { class: 'info', id: 'mapinfo' }, 'Toca el mapa para colocar el marcador rojo de la entrevista. El punto azul es la ubicación que trae la base.'));
}
function initMap(r) {
  const z = r.data.zona_utm;
  const base = hasNum(r.orig.x) && hasNum(r.orig.y) ? utmToLL(r.orig.x, r.orig.y, z) : null;
  const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Esri, Maxar, Earthstar Geographics' });
  const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' });
  const m = S.map = L.map('map', { layers: [sat] }).setView(base || [22.2641, -97.7855], base ? 19 : 14);
  L.control.layers({ 'Satélite': sat, 'Calles': osm }).addTo(m);
  if (base) L.marker(base, { icon: L.divIcon({ className: '', html: '<div class="mb"></div>', iconSize: [14, 14] }) }).addTo(m).bindTooltip('Ubicación en la base');
  const icon = L.divIcon({ className: '', html: '<div class="mi"></div>', iconSize: [18, 18] });
  let mk = null;
  const put = ll => { if (mk) mk.setLatLng(ll); else { mk = L.marker(ll, { icon, draggable: true }).addTo(m); mk.on('dragend', () => put(mk.getLatLng())); } r.marker = [mk.getLatLng().lat, mk.getLatLng().lng]; saveRec(r); info(); };
  const info = () => { if (!mk) return; const [ex, ny] = llToUtm(r.marker[0], r.marker[1], r.data.zona_utm); $('#mapinfo').textContent = `Marcador: X=${ex}  Y=${ny} (UTM zona ${r.data.zona_utm}) · ${r.marker[0].toFixed(6)}, ${r.marker[1].toFixed(6)}`; };
  m.on('click', e => put(e.latlng));
  S.putMarker = put;
  if (r.marker) { put(L.latLng(r.marker[0], r.marker[1])); }
  setTimeout(() => m.invalidateSize(), 200);
}
function asignar(r, t) {
  if (!r.marker) return toast('Primero coloca el marcador en el mapa');
  const [x, y] = llToUtm(r.marker[0], r.marker[1], r.data.zona_utm);
  const [kx, ky] = t === 'x,y' ? ['x', 'y'] : [t + 'x', t + 'y'];
  setField(kx, String(x)); setField(ky, String(y)); toast(`Asignado a ${TARGETS.find(a => a[0] === t)[1]}`);
}
function gps(r) {
  if (!navigator.geolocation) return toast('Este dispositivo no ofrece GPS al navegador');
  toast('Buscando ubicación…', 6000);
  navigator.geolocation.getCurrentPosition(p => { const ll = L.latLng(p.coords.latitude, p.coords.longitude); S.putMarker(ll); S.map.setView(ll, 19); toast(`GPS: precisión ±${Math.round(p.coords.accuracy)} m`); }, e => toast('No se obtuvo ubicación: ' + e.message, 5000), { enableHighAccuracy: true, timeout: 20000 });
}

/* ---------- Exportación ---------- */
async function exportXlsx() {
  await loadAll(); const media = await dbAll('media'); const by = {}; media.forEach(m => (by[m.rec] = by[m.rec] || []).push(m));
  const stamp = today(), H = ['ID', 'ESTATUS_LEVANTAMIENTO', 'ULTIMA_MODIFICACION', 'CAMPOS_MODIFICADOS', ...FIELDS.map(f => f.l), 'MARCADOR_LAT', 'MARCADOR_LON', 'MARCADOR_X_UTM', 'MARCADOR_Y_UTM', 'N_FOTOS', 'N_DOCUMENTOS', 'ARCHIVOS'];
  const A = [H], C = [['ID', 'CAMPO', 'VALOR_EN_BASE', 'VALOR_NUEVO']], F = [['ID', 'ARCHIVO', 'TIPO', 'FECHA']];
  for (const r of S.recs) {
    const ch = changed(r), ms = (by[r.id] || []).sort((a, b) => a.kind.localeCompare(b.kind) || a.n - b.n);
    const mk = r.marker ? [r.marker[0], r.marker[1], ...llToUtm(r.marker[0], r.marker[1], r.data.zona_utm)] : ['', '', '', ''];
    A.push([r.id, stLabel(r), r.ts || '', ch.map(k => LABEL[k]).join('; '), ...FIELDS.map(f => { const v = r.data[f.k]; return v !== '' && hasNum(v) && f.t === 'num' ? +v : v; }), ...mk, ms.filter(m => m.kind === 'foto').length, ms.filter(m => m.kind === 'doc').length, ms.map(m => m.name).join('; ')]);
    ch.forEach(k => C.push([r.id, LABEL[k], r.orig[k], r.data[k]]));
    ms.forEach(m => F.push([r.id, m.name, m.kind === 'foto' ? 'Fotografía' : 'Documento', m.ts]));
  }
  const wb = XLSX.utils.book_new();
  [['Padron_actualizado', A], ['Cambios', C], ['Fotos_Documentos', F]].forEach(([n, d]) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(d), n));
  download(new Blob([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], { type: 'application/octet-stream' }), `padron_actualizado_${stamp}.xlsx`);
  toast('Excel generado');
}
async function exportZip() {
  const media = await dbAll('media'); if (!media.length) return toast('No hay fotos ni documentos guardados');
  toast('Armando ZIP…', 8000); const z = new JSZip();
  media.forEach(m => z.file(`${m.rec}/${m.name}`, m.blob));
  const b = await z.generateAsync({ type: 'blob', compression: 'STORE' });
  download(b, `evidencias_${today()}.zip`); toast(`ZIP con ${media.length} archivos`);
}

/* ---------- Arranque ---------- */
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
viewList();
