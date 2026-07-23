/* =========================================================================
   Ergebnisliste / Meldebogen (WSV-Stil)
   -------------------------------------------------------------------------
   Übernimmt die in der Eingabe erfassten Ergebnisse (localStorage) und
   stellt sie als Rundenwettkampf-Meldebogen dar: Serien-Spalten je Schütze,
   Gesamt, Wertung (editierbar), beide Mannschaften gespiegelt, dazu
   digitale Unterschriften (Zeichnen) der Mannschaftsführer + Schießleiter.
   Druckbar / als PDF speicherbar über die Druckfunktion des Browsers.
   ========================================================================= */

"use strict";

// ---- Disziplin bestimmen -------------------------------------------------
const DISZ = (function () {
  const id = new URLSearchParams(location.search).get("d");
  return (window.DISZIPLINEN || {})[id] || null;
})();
if (!DISZ) {
  location.replace("index.html");
}

const TEILE = DISZ ? DISZ.teile : [];
const STAENDE = DISZ ? DISZ.schuetzenProTeam : 0;
const DEZIMAL = !!(DISZ && DISZ.dezimal);
const STORAGE_KEY = DISZ ? `liga:${DISZ.id}:v2` : "";
const LISTE_KEY = DISZ ? `liga:${DISZ.id}:liste` : "";

// ---- Formatierung --------------------------------------------------------
function rundeSumme(v) { return Math.round(v * 10) / 10; }
function formatSumme(v) {
  return DEZIMAL ? rundeSumme(v).toFixed(1).replace(".", ",") : String(v);
}
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---- Ergebnisse laden (nur lesen) ---------------------------------------
function loadResults() {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw); }
  catch (e) {}
  return null;
}
const results = loadResults();

function serienAnzahl() {
  let n = 0;
  for (const t of TEILE) { const serie = t.serie || t.schuss; n += Math.ceil(t.schuss / serie); }
  return n;
}
const N_SERIEN = serienAnzahl();

// Serien-Summen + Gesamt für einen Stand
function standDaten(teamKey, idx) {
  const leer = { name: "", serien: new Array(N_SERIEN).fill(0), ges: 0 };
  if (!results || !results.teams || !results.teams[teamKey]) return leer;
  const stand = results.teams[teamKey][idx];
  if (!stand) return leer;
  const serien = [];
  let ges = 0;
  for (const t of TEILE) {
    const arr = Array.isArray(stand[t.key]) ? stand[t.key] : [];
    const serie = t.serie || t.schuss;
    const anzahl = Math.ceil(t.schuss / serie);
    for (let s = 0; s < anzahl; s++) {
      let sum = 0;
      for (let k = s * serie; k < Math.min((s + 1) * serie, t.schuss); k++) {
        if (typeof arr[k] === "number") sum += arr[k];
      }
      serien.push(sum);
      ges += sum;
    }
  }
  return { name: stand.name || "", serien, ges };
}

function teamGes(teamKey) {
  let sum = 0;
  for (let i = 0; i < STAENDE; i++) sum += standDaten(teamKey, i).ges;
  return sum;
}

// ---- Meta (Kopf, Wertung, Unterschriften) laden/speichern ---------------
function defaultMeta() {
  return {
    saison: "2026 / 2027",
    klasse: "Kreisliga Stuttgart",
    gruppe: "",
    ort: "Stuttgart",
    datum: results && results.datum ? results.datum : "",
    heimName: results && results.heimName ? results.heimName : "",
    gastName: results && results.gastName ? results.gastName : "",
    wertung: { heim: new Array(STAENDE).fill(""), gast: new Array(STAENDE).fill("") },
    bericht: "",
    sig: { heim: { img: "", name: "" }, schiri: { img: "", name: "" }, gast: { img: "", name: "" } },
  };
}
function loadMeta() {
  const def = defaultMeta();
  try {
    const raw = localStorage.getItem(LISTE_KEY);
    if (raw) {
      const m = JSON.parse(raw);
      const merged = Object.assign(def, m);
      merged.wertung = {
        heim: Array.isArray(m.wertung && m.wertung.heim) ? m.wertung.heim : def.wertung.heim,
        gast: Array.isArray(m.wertung && m.wertung.gast) ? m.wertung.gast : def.wertung.gast,
      };
      merged.sig = Object.assign(def.sig, m.sig || {});
      return merged;
    }
  } catch (e) {}
  return def;
}
let meta = loadMeta();
let saveTimer = null;
function saveMeta() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(LISTE_KEY, JSON.stringify(meta)); } catch (e) {}
  }, 250);
}

// ---- Aufbau --------------------------------------------------------------
// Wertung = beste N Einzelergebnisse je Mannschaft
const WERTUNG_BESTE = 3;

function besteIndizes(teamKey, anzahl) {
  const arr = [];
  for (let i = 0; i < STAENDE; i++) arr.push({ i, ges: standDaten(teamKey, i).ges });
  arr.sort((a, b) => b.ges - a.ges);
  const set = new Set();
  let cnt = 0;
  for (const e of arr) {
    if (e.ges > 0 && cnt < anzahl) { set.add(e.i); cnt++; }
  }
  return set;
}
function wertungTeamSumme(teamKey, set) {
  let s = 0;
  for (const i of set) s += standDaten(teamKey, i).ges;
  return s;
}

function tabelleHtml() {
  const nums = [];
  for (let i = 1; i <= N_SERIEN; i++) nums.push(i);

  // Feste Spaltenbreiten über colgroup (Name wird nicht abgeschnitten)
  let cols = '<col class="c-nr"><col class="c-name">';
  cols += nums.map(() => '<col class="c-serie">').join("");
  cols += '<col class="c-ges"><col class="c-wert"><col class="c-wert"><col class="c-ges">';
  cols += nums.map(() => '<col class="c-serie">').join("");
  cols += '<col class="c-name"><col class="c-nr">';

  const thead =
    "<tr>" +
    '<th class="mb-nr"></th><th class="mb-name">Name</th>' +
    nums.map((n) => `<th>${n}</th>`).join("") +
    "<th>Ges.</th><th>Wertung</th>" +
    "<th>Wertung</th><th>Ges.</th>" +
    nums.slice().reverse().map((n) => `<th>${n}</th>`).join("") +
    '<th class="mb-name">Name</th><th class="mb-nr"></th>' +
    "</tr>";

  const bestHeim = besteIndizes("heim", WERTUNG_BESTE);
  const bestGast = besteIndizes("gast", WERTUNG_BESTE);

  let rows = "";
  for (let i = 0; i < STAENDE; i++) {
    const h = standDaten("heim", i);
    const g = standDaten("gast", i);
    const hWert = bestHeim.has(i) ? formatSumme(h.ges) : "";
    const gWert = bestGast.has(i) ? formatSumme(g.ges) : "";
    rows +=
      "<tr>" +
      `<td class="mb-nr">${i + 1}</td>` +
      `<td class="mb-name">${esc(h.name)}</td>` +
      h.serien.map((v) => `<td>${v ? formatSumme(v) : ""}</td>`).join("") +
      `<td class="mb-ges">${h.ges ? formatSumme(h.ges) : ""}</td>` +
      `<td class="mb-wert${bestHeim.has(i) ? " mb-count" : ""}">${hWert}</td>` +
      `<td class="mb-wert${bestGast.has(i) ? " mb-count" : ""}">${gWert}</td>` +
      `<td class="mb-ges">${g.ges ? formatSumme(g.ges) : ""}</td>` +
      g.serien.slice().reverse().map((v) => `<td>${v ? formatSumme(v) : ""}</td>`).join("") +
      `<td class="mb-name">${esc(g.name)}</td>` +
      `<td class="mb-nr">${i + 1}</td>` +
      "</tr>";
  }

  const leerSerien = nums.map(() => "<td></td>").join("");
  const hGes = teamGes("heim"), gGes = teamGes("gast");
  const hWertT = wertungTeamSumme("heim", bestHeim);
  const gWertT = wertungTeamSumme("gast", bestGast);
  const totrow =
    '<tr class="mb-total">' +
    '<td class="mb-nr"></td><td class="mb-name">Mannschaft</td>' +
    leerSerien +
    `<td class="mb-ges">${hGes ? formatSumme(hGes) : ""}</td>` +
    `<td class="mb-wert mb-count">${hWertT ? formatSumme(hWertT) : ""}</td>` +
    `<td class="mb-wert mb-count">${gWertT ? formatSumme(gWertT) : ""}</td>` +
    `<td class="mb-ges">${gGes ? formatSumme(gGes) : ""}</td>` +
    leerSerien +
    '<td class="mb-name"></td><td class="mb-nr"></td>' +
    "</tr>";

  const minW = 2 * 1.7 + 2 * 9 + 2 * N_SERIEN * 2.2 + 2 * 3 + 2 * 4;
  return (
    `<div class="mb-tablewrap"><table class="mb-table" style="min-width:${minW}rem"><colgroup>` +
    cols +
    "</colgroup><thead>" +
    thead +
    "</thead><tbody>" +
    rows +
    totrow +
    "</tbody></table></div>" +
    `<div class="mb-legend">Wertung = Ergebnis der besten ${WERTUNG_BESTE} Schützen je Mannschaft (automatisch); Mannschaftswertung = deren Summe.</div>`
  );
}

function sigBlockHtml(key, label) {
  return (
    '<div class="mb-sig">' +
    `<canvas id="sig-${key}" class="mb-sig-canvas" width="440" height="120"></canvas>` +
    `<button type="button" class="mb-sig-clear" id="sigclear-${key}">löschen</button>` +
    '<div class="mb-sig-line"></div>' +
    `<input class="mb-sig-name" id="signame-${key}" placeholder="Name in Druckschrift">` +
    `<div class="mb-sig-label">${label}</div>` +
    "</div>"
  );
}

function buildMeldebogen() {
  const root = document.getElementById("meldebogen");
  root.innerHTML =
    '<div class="mb-sheet">' +
    '<div class="mb-title">Württembergischer Schützenverband 1850 e.V.</div>' +
    '<div class="mb-subtitle">Rundenwettkampf <input class="mb-inp mb-inp-mid" data-meta="saison" value="' + esc(meta.saison) + '"></div>' +

    '<div class="mb-head3">' +
      '<div class="mb-head-left">' +
        '<input class="mb-inp" data-meta="klasse" value="' + esc(meta.klasse) + '">' +
        '<div><strong>Gruppe:</strong> <input class="mb-inp" data-meta="gruppe" value="' + esc(meta.gruppe) + '"></div>' +
      '</div>' +
      '<div class="mb-disz">' + esc(DISZ.name) + '</div>' +
      '<div class="mb-head-right">' +
        '<div><strong>Ort:</strong> <input class="mb-inp" data-meta="ort" value="' + esc(meta.ort) + '"></div>' +
        '<div><strong>Datum:</strong> <input type="date" class="mb-inp" data-meta="datum" value="' + esc(meta.datum) + '"></div>' +
      '</div>' +
    '</div>' +

    '<div class="mb-teams">' +
      '<div class="mb-team"><span class="mb-team-nr">Mannschaft 1</span><strong>Vereinsname:</strong> <input class="mb-inp" data-meta="heimName" value="' + esc(meta.heimName) + '"></div>' +
      '<div class="mb-team"><span class="mb-team-nr">Mannschaft 2</span><strong>Vereinsname:</strong> <input class="mb-inp" data-meta="gastName" value="' + esc(meta.gastName) + '"></div>' +
    '</div>' +

    tabelleHtml() +

    '<div class="mb-sigs">' +
      sigBlockHtml("heim", "Mannschaftsführer (Mannschaft 1)") +
      sigBlockHtml("schiri", "Schießleiter (neutrale Aufsicht)") +
      sigBlockHtml("gast", "Mannschaftsführer (Mannschaft 2)") +
    '</div>' +

    '<div class="mb-bericht">' +
      '<label>Wettkampfbericht (Besondere Vorkommnisse, Zuschauer, Medienvertreter, usw.)</label>' +
      '<textarea class="mb-inp" data-meta="bericht" rows="3">' + esc(meta.bericht) + '</textarea>' +
    '</div>' +

    '</div>';

  wireMeta();
  ["heim", "schiri", "gast"].forEach(initSignatur);
}

// ---- Verdrahtung ---------------------------------------------------------
function wireMeta() {
  document.querySelectorAll("[data-meta]").forEach((elm) => {
    const key = elm.dataset.meta;
    elm.addEventListener("input", () => {
      meta[key] = elm.value;
      saveMeta();
    });
  });
}

// ---- Unterschriften-Pad --------------------------------------------------
function initSignatur(key) {
  const canvas = document.getElementById("sig-" + key);
  const ctx = canvas.getContext("2d");
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#0b2e13";

  if (meta.sig[key] && meta.sig[key].img) {
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    img.src = meta.sig[key].img;
  }

  let drawing = false;
  let last = null;
  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height),
    };
  }
  canvas.addEventListener("pointerdown", (e) => {
    drawing = true;
    last = pos(e);
    try { canvas.setPointerCapture(e.pointerId); } catch (x) {}
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last = p;
  });
  function end() {
    if (!drawing) return;
    drawing = false;
    meta.sig[key].img = canvas.toDataURL("image/png");
    saveMeta();
  }
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("pointerleave", end);

  document.getElementById("sigclear-" + key).addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    meta.sig[key].img = "";
    saveMeta();
  });

  const nameInp = document.getElementById("signame-" + key);
  nameInp.value = meta.sig[key].name || "";
  nameInp.addEventListener("input", () => {
    meta.sig[key].name = nameInp.value;
    saveMeta();
  });
}

// ---- Start ---------------------------------------------------------------
function init() {
  if (!DISZ) return;
  document.title = `Ergebnisliste ${DISZ.nummer} – ${DISZ.name}`;
  document.getElementById("backTracker").href = "tracker.html?d=" + encodeURIComponent(DISZ.id);
  document.getElementById("btnDruck").addEventListener("click", () => window.print());
  buildMeldebogen();
}
document.addEventListener("DOMContentLoaded", init);
