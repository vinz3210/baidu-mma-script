// ==UserScript==
// @name         Map Making App – Baidu coverage
// @namespace    baidu-stuff
// @version      0.3.3
// @description  Baidu street view coverage overlay, click-to-add Baidu panos, Pannellum viewer and GeoGuessr Baidu export for map-making.app
// @match        https://map-making.app/maps/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/pannellum/2.5.6/pannellum.js
// @run-at       document-idle
// @grant        none
// @updateURL    https://raw.githubusercontent.com/vinz3210/baidu-mma-script/main/map-making-baidu.user.js
// @downloadURL  https://raw.githubusercontent.com/vinz3210/baidu-mma-script/main/map-making-baidu.user.js
// ==/UserScript==

(() => {
  'use strict';
  // the app exposes window.map / window.editor once the editor has mounted
  const waiter = setInterval(() => {
    if (window.map && window.editor && window.google && window.pannellum) { clearInterval(waiter); init(); }
  }, 300);

  function init() {

  // ---------- coordinate maths (BD09MC <-> BD09 <-> GCJ02) ----------
  // GeoGuessr stores Baidu locations as GCJ02 lat/lng.
  const LLBAND = [75, 60, 45, 30, 15, 0];
  const LL2MC = [
    [-0.0015702102444, 111320.7020616939, 1704480524535203, -10338987376042340, 26112667856603880, -35149669176653700, 26595700718403920, -10725012454188240, 1800819912950474, 82.5],
    [0.0008277824516172526, 111320.7020463578, 647795574.6671607, -4082003173.641316, 10774905663.51142, -15171875531.51559, 12053065338.62167, -5124939663.577472, 913311935.9512032, 67.5],
    [0.00337398766765, 111320.7020202162, 4481351.045890365, -23393751.19931662, 79682215.47186455, -115964993.2797253, 97236711.15602145, -43661946.33752821, 8477230.501135234, 52.5],
    [0.00220636496208, 111320.7020209128, 51751.86112841131, 3796837.749470245, 992013.7397791013, -1221952.21711287, 1340652.697009075, -620943.6990984312, 144416.9293806241, 37.5],
    [-0.0003441963504368392, 111320.7020576856, 278.2353980772752, 2485758.690035394, 6070.750963243378, 54821.18345352118, 9540.606633304236, -2710.55326746645, 1405.483844121726, 22.5],
    [-0.0003218135878613132, 111320.7020701615, 0.00369383431289, 823725.6402795718, 0.46104986909093, 2351.343141331292, 1.58060784298199, 8.77738589078284, 0.37238884252424, 7.45],
  ];
  const MCBAND = [12890594.86, 8362377.87, 5591021, 3481989.83, 1678043.12, 0];
  const MC2LL = [
    [1.410526172116255e-8, 0.00000898305509648872, -1.9939833816331, 200.9824383106796, -187.2403703815547, 91.6087516669843, -23.38765649603339, 2.57121317296198, -0.03801003308653, 17337981.2],
    [-7.435856389565537e-9, 0.000008983055097726239, -0.78625201886289, 96.32687599759846, -1.85204757529826, -59.36935905485877, 47.40033549296737, -16.50741931063887, 2.28786674699375, 10260144.86],
    [-3.030883460898826e-8, 0.00000898305509983578, 0.30071316287616, 59.74293618442277, 7.357984074871, -25.38371002664745, 13.45380521110908, -3.29883767235584, 0.32710905363475, 6856817.37],
    [-1.981981304930552e-8, 0.000008983055099779535, 0.03278182852591, 40.31678527705744, 0.65659298677277, -4.44255534477492, 0.85341911805263, 0.12923347998204, -0.04625736007561, 4482777.06],
    [3.09191371068437e-9, 0.000008983055096812155, 0.00006995724062, 23.10934304144901, -0.00023663490511, -0.6321817810242, -0.00663494467273, 0.03430082397953, -0.00466043876332, 2555164.4],
    [2.890871144776878e-9, 0.000008983055095805407, -3.068298e-8, 7.47137025468032, -0.00000353937994, -0.02145144861037, -0.00001234426596, 0.00010322952773, -0.00000323890364, 826088.5],
  ];
  const poly = (f, c) => f[2] + f[3] * c + f[4] * c ** 2 + f[5] * c ** 3 + f[6] * c ** 4 + f[7] * c ** 5 + f[8] * c ** 6;
  function bd2mc(lng, lat) {
    const a = Math.abs(lat);
    const f = LL2MC[LLBAND.findIndex(b => a >= b)] || LL2MC[5];
    return [(f[0] + f[1] * Math.abs(lng)) * Math.sign(lng || 1), poly(f, a / f[9]) * Math.sign(lat || 1)];
  }
  function mc2bd(x, y) {
    const ay = Math.abs(y);
    const f = MC2LL[MCBAND.findIndex(b => ay >= b)] || MC2LL[5];
    return [(f[0] + f[1] * Math.abs(x)) * Math.sign(x || 1), poly(f, ay / f[9]) * Math.sign(y || 1)];
  }
  const XP = Math.PI * 3000 / 180;
  function bd2gcj(lng, lat) {
    const x = lng - 0.0065, y = lat - 0.006;
    const z = Math.hypot(x, y) - 0.00002 * Math.sin(y * XP), t = Math.atan2(y, x) - 0.000003 * Math.cos(x * XP);
    return [z * Math.cos(t), z * Math.sin(t)];
  }
  function gcj2bd(lng, lat) {
    const z = Math.hypot(lng, lat) + 0.00002 * Math.sin(lat * XP), t = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * XP);
    return [z * Math.cos(t) + 0.0065, z * Math.sin(t) + 0.006];
  }
  const inChina = (lng, lat) => lng >= 72.004 && lng <= 137.8347 && lat >= 0.8293 && lat <= 55.8271;

  // ---------- state ----------
  const S = { coverage: false };
  const BAIDU_ID = /^\d{20,}[0-9A-Z]{1,6}$/; // e.g. 01013800001406231102108396Z, 09008200011612181214362522D
  const HOSTS = 'https://mapsv0.bdimg.com/';
  const FILTER = 'hue-rotate(140deg) saturate(200%)'; // Baidu's coverage lines -> blue, same as various-map-generator

  const sdataCache = new Map();
  async function sdata(id) {
    if (sdataCache.has(id)) return sdataCache.get(id);
    const j = await (await fetch(`${HOSTS}?qt=sdata&sid=${id}`)).json();
    const c = j.content && j.content[0];
    if (!c || !c.ID) return null;
    sdataCache.set(id, c);
    return c;
  }
  const dateFromId = id => {
    const s = id.slice(10, 22);
    return `20${s.slice(0, 2)}-${s.slice(2, 4)}-${s.slice(4, 6)}T${s.slice(6, 8)}:${s.slice(8, 10)}:${s.slice(10, 12)}`;
  };
  // pano position from sdata -> GCJ02 [lng, lat]
  const panoGcj = c => { const [l, b] = mc2bd(c.X / 100, c.Y / 100); return bd2gcj(l, b); };

  // ---------- UI ----------
  const css = document.createElement('style');
  css.textContent = `
    #bdu-panel{position:fixed;right:12px;bottom:56px;z-index:99998;background:#222;color:#eee;font:12px system-ui,sans-serif;padding:8px 10px;border-radius:6px;box-shadow:0 2px 8px #000a;display:flex;flex-direction:column;gap:4px}
    #bdu-panel label{display:flex;gap:6px;align-items:center;cursor:pointer}
    #bdu-panel button{cursor:pointer}
    #bdu-toast{position:fixed;left:50%;bottom:60px;transform:translateX(-50%);z-index:99999;background:#000c;color:#fff;padding:6px 12px;border-radius:4px;font:13px system-ui,sans-serif;display:none}
    #bdu-view{position:fixed;right:12px;bottom:12px;z-index:99997;width:min(640px,50vw);height:min(420px,50vh);background:#111;border-radius:6px;box-shadow:0 2px 12px #000a;display:none;flex-direction:column;overflow:hidden}
    #bdu-view.big{width:calc(100vw - 24px);height:calc(100vh - 24px)}
    #bdu-bar{background:#222;color:#fff;font:12px system-ui,sans-serif;padding:4px 8px;display:flex;gap:8px;align-items:center}
    #bdu-bar span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    #bdu-pano{flex:1;min-height:0}
    .bdu-arrow{width:64px;height:64px;margin-left:-32px;margin-top:-32px;cursor:pointer}
    .bdu-chev{width:100%;height:100%;background:#fff;opacity:.8;transform:perspective(160px) rotateX(55deg);
      clip-path:polygon(50% 0,100% 72%,50% 46%,0 72%);filter:drop-shadow(0 0 2px #000)}
    .bdu-arrow:hover .bdu-chev{opacity:1;background:#9cf}
    #bdu-view.docked{position:absolute;left:0;top:0;right:auto;bottom:auto;width:100%;height:100%;border-radius:0;box-shadow:none;z-index:10}
    #bdu-view.docked #bdu-bar{position:absolute;top:0;left:0;right:0;z-index:2;background:#000a;pointer-events:none}
    #bdu-view.docked #bdu-bar button{display:none}
    #bdu-view.docked #bdu-pano{position:absolute;left:0;top:0;width:100%;height:100%}`;
  document.head.appendChild(css);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://cdnjs.cloudflare.com/ajax/libs/pannellum/2.5.6/pannellum.css';
  document.head.appendChild(link);

  const panel = document.createElement('div');
  panel.id = 'bdu-panel';
  panel.innerHTML = `
    <label><input type="checkbox" id="bdu-cov"> Baidu coverage + click to add pano</label>
    <button id="bdu-export">Export Baidu locations (GeoGuessr JSON)</button>`;
  document.body.appendChild(panel);
  const toastEl = document.createElement('div'); toastEl.id = 'bdu-toast'; document.body.appendChild(toastEl);
  let toastT;
  const toast = (t, ms = 2500) => { toastEl.textContent = t; toastEl.style.display = 'block'; clearTimeout(toastT); toastT = setTimeout(() => toastEl.style.display = 'none', ms); };

  // ---------- coverage overlay ----------
  function makeMapType() {
    const T = 256;
    return {
      tileSize: new google.maps.Size(T, T),
      name: 'Baidu coverage',
      getTile(coord, zoom, doc) {
        const canvas = doc.createElement('canvas');
        canvas.width = canvas.height = T;
        canvas.style.filter = FILTER;
        canvas.style.opacity = '0.9';
        if (zoom < 5) return canvas;
        const n = 2 ** zoom, x = ((coord.x % n) + n) % n, y = coord.y;
        if (y < 0 || y >= n) return canvas;
        const lat = yy => Math.atan(Math.sinh(Math.PI * (1 - 2 * yy / n))) * 180 / Math.PI;
        const west = x / n * 360 - 180, east = (x + 1) / n * 360 - 180, north = lat(y), south = lat(y + 1);
        if (!inChina(west, south) && !inChina(east, north)) return canvas;
        const conv = (lng, lat) => {
          const b = gcj2bd(lng, lat); // Google basemap in China is GCJ02
          return bd2mc(b[0], b[1]);
        };
        const tl = conv(west, north), br = conv(east, south);
        const bz = Math.min(zoom + 1, 19), P = 2 ** (18 - bz) * T;
        const a = [tl[0] / P, tl[1] / P], b = [br[0] / P, br[1] / P];
        const sx = T / (b[0] - a[0]), sy = T / (a[1] - b[1]);
        const ctx = canvas.getContext('2d');
        canvas._alive = true;
        for (let tx = Math.floor(a[0]); tx <= Math.floor(b[0]); tx++) {
          for (let ty = Math.floor(b[1]); ty <= Math.floor(a[1]); ty++) {
            const img = new Image();
            img.onload = () => { if (canvas._alive) ctx.drawImage(img, (tx - a[0]) * sx, (a[1] - (ty + 1)) * sy, sx, sy); };
            img.src = `https://mapsv${tx % 2}.bdimg.com/tile/?udt=20200825&qt=tile&styles=pl&x=${tx}&y=${ty}&z=${bz}`;
          }
        }
        return canvas;
      },
      releaseTile(tile) { tile._alive = false; },
    };
  }
  let mapType = null;
  function refreshOverlay() {
    const layers = map.overlayMapTypes;
    for (let i = layers.getLength() - 1; i >= 0; i--) if (layers.getAt(i) === mapType) layers.removeAt(i);
    mapType = null;
    if (S.coverage) { mapType = makeMapType(); layers.push(mapType); }
  }
  document.getElementById('bdu-cov').onchange = e => { S.coverage = e.target.checked; refreshOverlay(); };

  // ---------- click to add ----------
  let adding = false;
  async function addAt(latLng) {
    if (adding) return;
    adding = true;
    try {
      const [mx, my] = bd2mc(...gcj2bd(latLng.lng(), latLng.lat()));
      const mpp = 156543.03 * Math.cos(latLng.lat() * Math.PI / 180) / 2 ** map.getZoom();
      const r = Math.round(Math.min(300, Math.max(15, mpp * 12)));
      const q = await (await fetch(`${HOSTS}?qt=qsdata&x=${mx}&y=${my}&r=${r}`)).json();
      const id = q && q.content && q.content.id;
      if (!id) return toast('No Baidu coverage here');
      if ((window.locations || []).some(l => l.panoId === id)) return toast('Already in the map');
      const c = await sdata(id);
      if (!c) return toast('Baidu returned no data for ' + id);
      const [lng, lat] = panoGcj(c);
      editor.addAndOpenLocation({
        flags: 1, // LoadAsPanoId
        location: { lat, lng },
        panoId: id,
        panoDate: null,
        heading: c.Heading || 0,
        pitch: 0,
        zoom: null,
        tags: ['baidu'],
      });
      lastAdd = Date.now();
      toast(`Added ${id}`);
    } catch (e) {
      console.error('[baidu]', e); toast('Baidu lookup failed: ' + e.message);
    } finally { adding = false; }
  }
  let lastClick = 0, lastAdd = 0;
  map.addListener('click', e => { if (S.coverage && e.latLng) { lastClick = Date.now(); addAt(e.latLng); } });

  // ---------- Pannellum viewer for Baidu locations ----------
  const view = document.createElement('div');
  view.id = 'bdu-view';
  view.innerHTML = `<div id="bdu-bar"><span id="bdu-title"></span><button id="bdu-big">⤢</button><button id="bdu-x">✕</button></div><div id="bdu-pano"></div>`;
  document.body.appendChild(view);
  let pano = null, shownId = null, tokenN = 0, urlToRevoke = null;
  // dock the viewer where the Google street view normally is; fall back to a floating panel
  function mount() {
    const host = document.querySelector('.location-preview__panorama');
    if (host) {
      if (view.parentElement !== host) host.appendChild(view);
      view.classList.add('docked');
    } else {
      if (view.parentElement !== document.body) document.body.appendChild(view);
      view.classList.remove('docked');
    }
  }
  new ResizeObserver(() => pano && pano.resize()).observe(view);
  document.getElementById('bdu-x').onclick = () => { view.style.display = 'none'; shownId = null; ignoreId = lastId; };
  document.getElementById('bdu-big').onclick = () => { view.classList.toggle('big'); pano && pano.resize(); };

  async function stitch(id, z = 4) {
    const cols = 2 ** (z - 1), rows = 2 ** (z - 2), T = 512;
    const cv = document.createElement('canvas'); cv.width = cols * T; cv.height = rows * T;
    const ctx = cv.getContext('2d');
    const jobs = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      jobs.push(fetch(`${HOSTS}?qt=pdata&sid=${id}&pos=${r}_${c}&z=${z}`).then(x => x.ok ? x.blob() : null)
        .then(b => b && createImageBitmap(b)).then(bm => bm && ctx.drawImage(bm, c * T, r * T)).catch(() => {}));
    }
    await Promise.all(jobs);
    return new Promise(res => cv.toBlob(res, 'image/jpeg', 0.9));
  }
  const norm = d => ((d + 540) % 360) - 180;
  const norm360 = d => ((d % 360) + 360) % 360;
  let curNorth = 0;

  // The app's own "moveTo / setPov" actions live in a React hook; dig them out of the fibre tree.
  // Without them the arrows still work, but the location's saved position does not follow.
  function findApi() {
    const el = document.querySelector('.location-preview__panorama');
    if (!el) return null;
    const key = Object.keys(el).find(k => k.startsWith('__reactFiber$'));
    let f = key && el[key];
    for (let n = 0; f && n < 300; f = f.return, n++) {
      let h = f.memoizedState;
      for (let k = 0; h && typeof h === 'object' && k < 80; h = h.next, k++) {
        const v = h.memoizedState, cand = Array.isArray(v) ? v[0] : v;
        if (cand && typeof cand === 'object' && typeof cand.moveTo === 'function' && typeof cand.setPov === 'function') return cand;
      }
    }
    return null;
  }
  function neighbours(c) {
    const out = new Map();
    for (const road of c.Roads || []) {
      const ps = road.Panos || [], i = ps.findIndex(p => p.PID === c.ID);
      if (i < 0) continue;
      for (const j of [i - 1, i + 1]) {
        const p = ps[j];
        if (p && !out.has(p.PID)) out.set(p.PID, { pid: p.PID, x: p.X, y: p.Y });
      }
    }
    return [...out.values()].map(n => ({ ...n, bearing: norm360(Math.atan2(n.x - c.X, n.y - c.Y) * 180 / Math.PI) }));
  }
  function go(n) {
    const heading = pano ? norm360(pano.getYaw() + 180 - curNorth) : n.bearing; // keep looking the same way
    const [l, b] = mc2bd(n.x / 100, n.y / 100), [lng, lat] = bd2gcj(l, b);
    shownId = n.pid;
    showPano(n.pid, heading, pano ? pano.getPitch() : 0);
    const api = findApi();
    if (api) api.moveTo({ lat, lng }, n.pid); else toast('Moved in the viewer only (could not reach the app\'s move action)');
  }
  function syncPov() {
    const api = findApi();
    if (!api || !pano) return;
    const cur = editor.currentLocation, u = cur && cur.updatedProps;
    api.setPov({ zoom: u ? u.zoom : null, heading: norm360(pano.getYaw() + 180 - curNorth), pitch: pano.getPitch() });
  }
  async function showPano(id, heading, pitch) {
    const my = ++tokenN;
    mount();
    view.style.display = 'flex';
    document.getElementById('bdu-title').textContent = id + ' (loading…)';
    const [c, blob] = await Promise.all([sdata(id).catch(() => null), stitch(id)]);
    if (my !== tokenN) return;
    if (!blob) { document.getElementById('bdu-title').textContent = id + ' (no tiles)'; return; }
    // bearing at image column u is 360*u - NorthDir, so the image centre (yaw 0) is bearing 180 - NorthDir
    const north = c ? c.NorthDir || 0 : 0;
    curNorth = north;
    const yaw = norm((heading ?? c?.Heading ?? 0) - (180 - north));
    const hotSpots = (c ? neighbours(c) : []).map(n => ({
      pitch: -28, yaw: norm(n.bearing - (180 - north)), type: 'custom', cssClass: 'bdu-arrow',
      createTooltipFunc: div => { div.innerHTML = '<div class="bdu-chev"></div>'; },
      clickHandlerFunc: () => go(n),
    }));
    if (pano) { try { pano.destroy(); } catch (e) {} }
    if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
    urlToRevoke = URL.createObjectURL(blob);
    document.getElementById('bdu-pano').innerHTML = '';
    pano = pannellum.viewer('bdu-pano', {
      type: 'equirectangular', panorama: urlToRevoke, autoLoad: true, hotSpots,
      yaw, pitch: pitch || 0, hfov: 100, minHfov: 30, maxHfov: 120, showFullscreenCtrl: false, compass: false,
    });
    pano.on('mouseup', syncPov);
    pano.on('touchend', syncPov);
    document.getElementById('bdu-title').textContent = `${id}  ${c ? (c.Rname || '') + ' ' + dateFromId(id).slice(0, 10) : ''}`;
  }
  // watch the location the app has open (updatedProps follows moves and pov changes)
  let lastId = null, ignoreId = null;
  function currentBaiduLoc() {
    const cur = editor.currentLocation;
    if (!cur) return null;
    for (const cand of [cur.updatedProps, cur.location, cur.updated, cur.original, cur]) {
      if (cand && typeof cand.panoId === 'string' && BAIDU_ID.test(cand.panoId)) return cand;
    }
    return null;
  }
  // The app only knows Google panos: it complains "No coverage found" on map clicks and, when a Baidu pano
  // opens, "Configured pano ID could not be found" and then strips the pano ID (fallbackToCoordinate).
  // Silence the toasts and turn that fallback into a no-op while a Baidu location is involved.
  const baiduActive = () => shownId != null || Date.now() - lastAdd < 8000;
  function patchApi() {
    const api = findApi();
    if (!api || api.__bduPatched) return;
    const orig = api.fallbackToCoordinate;
    try {
      api.fallbackToCoordinate = function (...a) { if (baiduActive()) return; return orig.apply(this, a); };
      Object.defineProperty(api, '__bduPatched', { value: true });
    } catch (e) {}
  }
  const unwanted = t =>
    (t.includes('Configured pano ID could not be found') && baiduActive()) ||
    (t.includes('No coverage found at this location') && S.coverage && Date.now() - lastClick < 5000);
  function hideToasts() {
    for (const el of document.querySelectorAll('.snackbar')) {
      if (el.style.display !== 'none' && unwanted(el.textContent || '')) el.style.display = 'none';
    }
  }
  new MutationObserver(hideToasts).observe(document.body, { childList: true, subtree: true, characterData: true });
  setInterval(() => {
    try { patchApi(); } catch (e) {}
    let loc = null;
    try { loc = currentBaiduLoc(); } catch (e) {}
    const id = loc && loc.panoId;
    if (id !== lastId) { lastId = id; if (id !== ignoreId) ignoreId = null; }
    if (id && id === shownId) mount();
    if (id && id !== shownId && id !== ignoreId) { shownId = id; showPano(id, loc.heading, loc.pitch); }
    else if (!id && shownId) { shownId = null; view.style.display = 'none'; }
  }, 300);

  // ---------- export ----------
  document.getElementById('bdu-export').onclick = async () => {
    const locs = (window.locations || []).filter(l => l && typeof l.panoId === 'string' && BAIDU_ID.test(l.panoId) && !(l.flags & 2));
    if (!locs.length) return toast('No Baidu locations in this map');
    toast(`Fetching metadata for ${locs.length} locations…`, 60000);
    const out = []; let i = 0;
    async function worker() {
      while (i < locs.length) {
        const l = locs[i++];
        const c = await sdata(l.panoId).catch(() => null);
        out.push({
          panoId: l.panoId, lat: l.location.lat, lng: l.location.lng,
          heading: l.heading, pitch: l.pitch || 0, zoom: 0, country: 'CN',
          imageDate: dateFromId(l.panoId), source: 'baidu_pano',
          links: c && c.Links ? c.Links.map(k => k.PID) : [],
          extra: { tags: ['baidu', ...(l.tags || []).filter(t => t !== 'baidu')] },
        });
      }
    }
    await Promise.all(Array.from({ length: 6 }, worker));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ customCoordinates: out })], { type: 'application/json' }));
    a.download = 'baidu_locations.json'; a.click();
    toast(`Exported ${out.length} locations`);
  };
  }
})();
