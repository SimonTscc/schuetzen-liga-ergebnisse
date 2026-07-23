/* =========================================================================
   Liga Ergebniserfassung – Schusstracker (konfigurationsgesteuert)
   -------------------------------------------------------------------------
   Baut den Tracker anhand der gewählten Disziplin (disciplines.js) auf.
   Disziplin kommt aus dem URL-Parameter: tracker.html?d=<id>
   Ohne/mit ungültiger Disziplin → zurück zur Auswahlseite.
   Speicherung je Disziplin getrennt in localStorage.
   ========================================================================= */

"use strict";

// ---- Disziplin bestimmen -------------------------------------------------
const DISZ = (function () {
  const id = new URLSearchParams(location.search).get("d");
  const katalog = window.DISZIPLINEN || {};
  return katalog[id] || null;
})();

// Ohne gültige Disziplin: zurück zur Auswahl.
if (!DISZ) {
  location.replace("index.html");
}

// ---- Aus Disziplin abgeleitete Konfiguration -----------------------------
const TEAMS = [
  { key: "heim", label: "Heimmannschaft", cssClass: "team-heim" },
  { key: "gast", label: "Gastmannschaft", cssClass: "team-gast" },
];
const STAENDE_PRO_TEAM = DISZ ? DISZ.schuetzenProTeam : 0;
const TEILE = DISZ ? DISZ.teile : [];
const MAX_RING = DISZ ? DISZ.ringMax : 10;
const DEZIMAL = !!(DISZ && DISZ.dezimal);      // Zehntelwertung (z. B. Auflage)
const MAX_WERT = DEZIMAL ? 10.9 : MAX_RING;    // höchster erlaubter Schusswert
const STORAGE_KEY = DISZ ? `liga:${DISZ.id}:v2` : "liga:unbekannt";

// ---- Datenmodell ---------------------------------------------------------
function leererStand() {
  const stand = { name: "" };
  for (const t of TEILE) stand[t.key] = Array(t.schuss).fill(null);
  return stand;
}

function leererState() {
  const teams = {};
  for (const t of TEAMS) {
    teams[t.key] = [];
    for (let i = 0; i < STAENDE_PRO_TEAM; i++) teams[t.key].push(leererStand());
  }
  return { datum: "", heimName: "", gastName: "", teams };
}

let state = leererState();

// Geordnete Liste aller Schuss-Zellen (für Vor/Zurück-Navigation).
let cellOrder = [];
let activeIndex = -1;

// Dezimal-Eingabe (Zehntelwertung): "ganz" = ganzer Ring, "zehntel" = Nachkomma
let phase = "ganz";
let pendingGanz = null; // gewählter ganzer Ring, wartet auf das Zehntel

// ---- DOM-Referenzen ------------------------------------------------------
const el = {
  subtitle: document.getElementById("subtitle"),
  datum: document.getElementById("datum"),
  heim: document.getElementById("heimmannschaft"),
  gast: document.getElementById("gastmannschaft"),
  teamsMain: document.getElementById("teamsMain"),
  footer: document.getElementById("pageFooter"),
  status: document.getElementById("status"),
  keypadGrid: document.getElementById("keypadGrid"),
  keypadContext: document.getElementById("keypadContext"),
  keypadZero: document.querySelector(".keypad-zero"),
  keypadClear: document.querySelector(".keypad-clear"),
  btnPrev: document.getElementById("btnPrevSchuss"),
  btnNext: document.getElementById("btnNextSchuss"),
  btnSpeichern: document.getElementById("btnSpeichern"),
  btnListe: document.getElementById("btnListe"),
  btnExportCsv: document.getElementById("btnExportCsv"),
  btnLeeren: document.getElementById("btnLeeren"),
  gesamtSumme: null, // wird beim Footer-Aufbau gesetzt
};

// =========================================================================
//  DOM-Aufbau
// =========================================================================
function buildDom() {
  el.teamsMain.innerHTML = "";
  cellOrder = [];

  for (const team of TEAMS) {
    const section = document.createElement("section");
    section.className = `team-section ${team.cssClass}`;

    const title = document.createElement("h2");
    title.className = "team-title";
    title.textContent = team.label;
    section.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "staende-grid";

    for (let s = 0; s < STAENDE_PRO_TEAM; s++) {
      grid.appendChild(buildStand(team, s));
    }

    section.appendChild(grid);
    el.teamsMain.appendChild(section);
  }
}

function buildStand(team, standIdx) {
  const stand = state.teams[team.key][standIdx];

  const col = document.createElement("div");
  col.className = "stand-column";

  const header = document.createElement("div");
  header.className = "stand-header";
  header.textContent = `Stand ${standIdx + 1}`;
  col.appendChild(header);

  const nameWrap = document.createElement("div");
  nameWrap.className = "stand-name";
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "Schütze";
  nameInput.autocomplete = "name";
  nameInput.value = stand.name;
  nameInput.addEventListener("input", () => {
    stand.name = nameInput.value;
    updateKeypadContext();
    scheduleSave();
  });
  nameWrap.appendChild(nameInput);
  col.appendChild(nameWrap);

  const body = document.createElement("div");
  body.className = "stand-body";

  for (const teil of TEILE) {
    body.appendChild(buildTeil(team, standIdx, teil));
  }

  const gesamt = document.createElement("div");
  gesamt.className = "stand-gesamt";
  gesamt.dataset.role = "stand-gesamt";
  gesamt.dataset.team = team.key;
  gesamt.dataset.stand = String(standIdx);
  gesamt.innerHTML = `Gesamt: <strong>0</strong>`;
  body.appendChild(gesamt);

  col.appendChild(body);
  return col;
}

function buildTeil(team, standIdx, teil) {
  const block = document.createElement("div");
  block.className = `teil-block ${teil.cssClass || "teil-praezision"}`;

  const title = document.createElement("div");
  title.className = "teil-title";
  title.textContent = teil.label;
  block.appendChild(title);

  // Grid: 5 Schuss-Spalten + 1 Spalte für die Serien-Summe.
  const grid = document.createElement("div");
  grid.className = "ringe-grid";

  const startNr = teil.startNr || 1;
  const serie = teil.serie || teil.schuss;      // Schuss je Serie
  const anzahlSerien = Math.ceil(teil.schuss / serie);

  let row = 1;        // laufende Grid-Zeile
  let shotIdx = 0;    // laufender Schuss-Index im Teil

  for (let sIdx = 0; sIdx < anzahlSerien; sIdx++) {
    const serieLen = Math.min(serie, teil.schuss - sIdx * serie);
    const zeilen = Math.ceil(serieLen / 5);     // Zeilen dieser Serie (à 5 Schuss)

    for (let j = 0; j < serieLen; j++) {
      const cell = buildCell(team, standIdx, teil, shotIdx, startNr + shotIdx);
      cell.style.gridColumn = String((j % 5) + 1);
      cell.style.gridRow = String(row + Math.floor(j / 5));
      grid.appendChild(cell);
      shotIdx++;
    }

    // Serien-Summenzelle rechts neben der Serie (Spalte 6)
    const serieCell = buildSerieCell(team, standIdx, teil, sIdx);
    serieCell.style.gridColumn = "6";
    serieCell.style.gridRow = `${row} / span ${zeilen}`;
    grid.appendChild(serieCell);

    row += zeilen;
  }

  block.appendChild(grid);

  const zwischen = document.createElement("div");
  zwischen.className = "zwischenergebnis";
  zwischen.dataset.role = "teil-summe";
  zwischen.dataset.team = team.key;
  zwischen.dataset.stand = String(standIdx);
  zwischen.dataset.teil = teil.key;
  zwischen.innerHTML = `${teil.label}: <strong>0</strong>`;
  block.appendChild(zwischen);

  return block;
}

function buildSerieCell(team, standIdx, teil, serieIdx) {
  const cell = document.createElement("div");
  cell.className = "serie-cell";
  cell.dataset.role = "serie-summe";
  cell.dataset.team = team.key;
  cell.dataset.stand = String(standIdx);
  cell.dataset.teil = teil.key;
  cell.dataset.serie = String(serieIdx);
  cell.innerHTML =
    `<span class="serie-cell-label">Serie</span>` +
    `<span class="serie-cell-val">0</span>`;
  return cell;
}

function buildCell(team, standIdx, teil, schussIdx, anzeigeNr) {
  const cell = document.createElement("button");
  cell.type = "button";
  cell.className = "ring-cell";
  cell.dataset.team = team.key;
  cell.dataset.stand = String(standIdx);
  cell.dataset.teil = teil.key;
  cell.dataset.schuss = String(schussIdx);

  const num = document.createElement("span");
  num.className = "ring-cell-num";
  num.textContent = String(anzeigeNr);
  cell.appendChild(num);

  const val = document.createElement("span");
  val.className = "ring-cell-val";
  cell.appendChild(val);

  const orderIndex = cellOrder.length;
  cell.addEventListener("click", () => selectCell(orderIndex));

  cellOrder.push({
    el: cell,
    team: team.key,
    stand: standIdx,
    teil: teil.key,
    schuss: schussIdx,
    nr: anzeigeNr,
    teilLabel: teil.label,
  });

  renderCell(cellOrder[orderIndex]);
  return cell;
}

// Ziffernblock je nach Modus/Phase aufbauen:
//  - normal / Dezimal-Phase "ganz": Ringe 1..MAX_RING (0 über die feste Taste)
//  - Dezimal-Phase "zehntel": Zehntel ,0..,9
function renderKeypad() {
  el.keypadGrid.innerHTML = "";

  if (DEZIMAL && phase === "zehntel") {
    for (let t = 0; t <= 9; t++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "keypad-btn keypad-tenth";
      btn.dataset.tenth = String(t);
      btn.textContent = "," + t;
      el.keypadGrid.appendChild(btn);
    }
    if (el.keypadZero) el.keypadZero.style.display = "none";
    if (el.keypadClear) el.keypadClear.textContent = "Abbrechen";
  } else {
    for (let n = 1; n <= MAX_RING; n++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "keypad-btn";
      btn.dataset.value = String(n);
      btn.textContent = String(n);
      el.keypadGrid.appendChild(btn);
    }
    if (el.keypadZero) el.keypadZero.style.display = "";
    if (el.keypadClear) el.keypadClear.textContent = "Löschen";
  }
}

function buildFooter() {
  el.footer.innerHTML = "";

  for (const team of TEAMS) {
    const box = document.createElement("div");
    box.className = `footer-team footer-${team.key}`;

    const h3 = document.createElement("h3");
    h3.textContent = team.label;
    box.appendChild(h3);

    // Teil-Aufschlüsselung nur bei mehreren Blöcken (sonst = Gesamt, doppelt)
    if (TEILE.length > 1) {
      for (const teil of TEILE) {
        const p = document.createElement("p");
        p.innerHTML = `${teil.label}: <strong data-role="footer-teil" data-team="${team.key}" data-teil="${teil.key}">0</strong>`;
        box.appendChild(p);
      }
    }

    const pg = document.createElement("p");
    pg.className = "footer-team-gesamt";
    pg.innerHTML = `Gesamt: <strong data-role="footer-gesamt" data-team="${team.key}">0</strong>`;
    box.appendChild(pg);

    el.footer.appendChild(box);
  }

  const match = document.createElement("div");
  match.className = "footer-match";
  match.innerHTML =
    `<p class="footer-gesamt">Begegnung gesamt: <strong id="gesamtSumme">0</strong> Ringe</p>`;
  el.footer.appendChild(match);

  el.gesamtSumme = document.getElementById("gesamtSumme");
}

// =========================================================================
//  Formatierung (ganze Ringe vs. Zehntelwertung)
// =========================================================================
function rundeSumme(v) {
  return Math.round(v * 10) / 10; // Gleitkomma-Reste vermeiden
}

// Einzelner Schusswert für die Zelle
function formatRing(v) {
  if (v === null) return "";
  return DEZIMAL ? v.toFixed(1).replace(".", ",") : String(v);
}

// Summenwert (Serie/Stand/Mannschaft)
function formatSumme(v) {
  return DEZIMAL ? rundeSumme(v).toFixed(1).replace(".", ",") : String(v);
}

// =========================================================================
//  Rendering / Anzeige
// =========================================================================
function renderCell(entry) {
  const wert = state.teams[entry.team][entry.stand][entry.teil][entry.schuss];
  const valSpan = entry.el.querySelector(".ring-cell-val");
  valSpan.textContent = formatRing(wert);

  entry.el.classList.toggle("ring-cell--filled", wert !== null && wert > 0);
  entry.el.classList.toggle("ring-cell--zero", wert === 0);
}

function updateKeypadContext() {
  if (activeIndex < 0) {
    el.keypadContext.textContent = "Schuss antippen";
    return;
  }
  const c = cellOrder[activeIndex];
  const teamLabel = c.team === "heim" ? "Heim" : "Gast";
  const name = state.teams[c.team][c.stand].name.trim();
  const nameTeil = name ? ` · ${name}` : "";
  const basis = `${teamLabel} · Stand ${c.stand + 1}${nameTeil} · ${c.teilLabel} · Schuss ${c.nr}`;

  if (DEZIMAL && phase === "zehntel") {
    el.keypadContext.textContent = `${basis} · Zehntel für ${pendingGanz},_ wählen`;
  } else if (DEZIMAL) {
    el.keypadContext.textContent = `${basis} · ganzen Ring wählen`;
  } else {
    el.keypadContext.textContent = basis;
  }
}

function selectCell(index) {
  if (activeIndex >= 0 && cellOrder[activeIndex]) {
    cellOrder[activeIndex].el.classList.remove("ring-cell--active");
  }
  activeIndex = index;
  if (activeIndex >= 0 && cellOrder[activeIndex]) {
    const c = cellOrder[activeIndex];
    c.el.classList.add("ring-cell--active");
    c.el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  // Bei jedem Zellenwechsel Dezimal-Eingabe zurücksetzen
  if (DEZIMAL) {
    phase = "ganz";
    pendingGanz = null;
    renderKeypad();
  }
  updateKeypadContext();
}

// =========================================================================
//  Eingabe-Logik
// =========================================================================

// Ring-Taste gedrückt: ganze Zahl setzen (Standard) oder Dezimal-Eingabe starten
function ringEingabe(n) {
  if (activeIndex < 0) return;
  if (!DEZIMAL) {
    setValue(n);
    return;
  }
  pendingGanz = n;
  phase = "zehntel";
  renderKeypad();
  updateKeypadContext();
}

// Zehntel-Taste gedrückt: Wert = ganzer Ring + Zehntel, festschreiben
function zehntelEingabe(t) {
  if (activeIndex < 0 || pendingGanz === null) return;
  const wert = rundeSumme(pendingGanz + t / 10);
  const c = cellOrder[activeIndex];
  state.teams[c.team][c.stand][c.teil][c.schuss] = wert;
  renderCell(c);
  recalc();
  scheduleSave();
  pendingGanz = null;
  phase = "ganz";
  renderKeypad();
  advance();
}

// Dezimal-Eingabe abbrechen (zurück zur Ring-Auswahl, ohne zu schreiben)
function abbrechenDezimal() {
  pendingGanz = null;
  phase = "ganz";
  renderKeypad();
  updateKeypadContext();
}

function setValue(wert) {
  if (activeIndex < 0) return;
  if (wert > MAX_WERT) return;
  const c = cellOrder[activeIndex];
  state.teams[c.team][c.stand][c.teil][c.schuss] = wert;
  renderCell(c);
  recalc();
  scheduleSave();
  advance();
}

function clearValue() {
  if (activeIndex < 0) return;
  const c = cellOrder[activeIndex];
  state.teams[c.team][c.stand][c.teil][c.schuss] = null;
  renderCell(c);
  recalc();
  scheduleSave();
}

function advance() {
  if (activeIndex < 0) return;
  if (activeIndex < cellOrder.length - 1) selectCell(activeIndex + 1);
  else updateKeypadContext();
}

function retreat() {
  if (activeIndex < 0) {
    selectCell(0);
    return;
  }
  if (activeIndex > 0) selectCell(activeIndex - 1);
}

// =========================================================================
//  Summen
// =========================================================================
function summe(arr) {
  return arr.reduce((acc, v) => acc + (v === null ? 0 : v), 0);
}

function recalc() {
  let matchTotal = 0;

  for (const team of TEAMS) {
    const teilSummen = {};
    for (const t of TEILE) teilSummen[t.key] = 0;
    let teamTotal = 0;

    for (let s = 0; s < STAENDE_PRO_TEAM; s++) {
      const stand = state.teams[team.key][s];
      let standTotal = 0;
      for (const t of TEILE) {
        const sum = summe(stand[t.key]);
        teilSummen[t.key] += sum;
        standTotal += sum;
        setTeilSumme(team.key, s, t.key, sum);
        setSerieSummen(team.key, s, t, stand[t.key]);
      }
      setStandGesamt(team.key, s, standTotal);
      teamTotal += standTotal;
    }

    for (const t of TEILE) setFooterTeil(team.key, t.key, teilSummen[t.key]);
    setFooterGesamt(team.key, teamTotal);
    matchTotal += teamTotal;
  }

  if (el.gesamtSumme) el.gesamtSumme.textContent = formatSumme(matchTotal);
}

function setTeilSumme(teamKey, standIdx, teilKey, wert) {
  const node = el.teamsMain.querySelector(
    `.zwischenergebnis[data-team="${teamKey}"][data-stand="${standIdx}"][data-teil="${teilKey}"] strong`
  );
  if (node) node.textContent = formatSumme(wert);
}

function setSerieSummen(teamKey, standIdx, teil, werte) {
  const serie = teil.serie || teil.schuss;
  const anzahlSerien = Math.ceil(teil.schuss / serie);
  for (let sIdx = 0; sIdx < anzahlSerien; sIdx++) {
    const von = sIdx * serie;
    const bis = Math.min(von + serie, teil.schuss);
    let sum = 0;
    for (let k = von; k < bis; k++) sum += werte[k] === null ? 0 : werte[k];
    const node = el.teamsMain.querySelector(
      `.serie-cell[data-team="${teamKey}"][data-stand="${standIdx}"][data-teil="${teil.key}"][data-serie="${sIdx}"] .serie-cell-val`
    );
    if (node) node.textContent = formatSumme(sum);
  }
}

function setStandGesamt(teamKey, standIdx, wert) {
  const node = el.teamsMain.querySelector(
    `.stand-gesamt[data-team="${teamKey}"][data-stand="${standIdx}"] strong`
  );
  if (node) node.textContent = formatSumme(wert);
}

function setFooterTeil(teamKey, teilKey, wert) {
  const node = el.footer.querySelector(
    `[data-role="footer-teil"][data-team="${teamKey}"][data-teil="${teilKey}"]`
  );
  if (node) node.textContent = formatSumme(wert);
}

function setFooterGesamt(teamKey, wert) {
  const node = el.footer.querySelector(
    `[data-role="footer-gesamt"][data-team="${teamKey}"]`
  );
  if (node) node.textContent = formatSumme(wert);
}

// =========================================================================
//  Speichern / Laden (localStorage)
// =========================================================================
let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 400);
}

function save(showStatus) {
  state.datum = el.datum.value;
  state.heimName = el.heim.value;
  state.gastName = el.gast.value;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (showStatus) setStatus("Gespeichert.");
  } catch (e) {
    setStatus("Speichern fehlgeschlagen: " + e.message);
  }
}

function load() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    return false;
  }
  if (!raw) return false;

  try {
    state = mergeState(JSON.parse(raw));
    return true;
  } catch (e) {
    return false;
  }
}

// Geladene Daten defensiv ins aktuelle Schema übernehmen.
function mergeState(data) {
  const fresh = leererState();
  if (!data || typeof data !== "object") return fresh;

  fresh.datum = typeof data.datum === "string" ? data.datum : "";
  fresh.heimName = typeof data.heimName === "string" ? data.heimName : "";
  fresh.gastName = typeof data.gastName === "string" ? data.gastName : "";

  if (data.teams) {
    for (const team of TEAMS) {
      const gespeichert = Array.isArray(data.teams[team.key]) ? data.teams[team.key] : [];
      for (let s = 0; s < STAENDE_PRO_TEAM; s++) {
        const gStand = gespeichert[s];
        if (!gStand) continue;
        const ziel = fresh.teams[team.key][s];
        ziel.name = typeof gStand.name === "string" ? gStand.name : "";
        for (const t of TEILE) {
          ziel[t.key] = normArray(gStand[t.key], t.schuss);
        }
      }
    }
  }
  return fresh;
}

function normArray(arr, laenge) {
  const out = Array(laenge).fill(null);
  if (!Array.isArray(arr)) return out;
  for (let i = 0; i < laenge; i++) {
    const v = arr[i];
    if (typeof v === "number" && v >= 0 && v <= MAX_WERT) out[i] = v;
  }
  return out;
}

// =========================================================================
//  CSV-Export
// =========================================================================
function exportCsv() {
  const sep = ";";
  const lines = [];

  lines.push(`Disziplin${sep}${csvCell(DISZ.nummer + " " + DISZ.name)}`);
  lines.push(`Datum${sep}${csvCell(el.datum.value)}`);
  lines.push(`Heim${sep}${csvCell(el.heim.value)}`);
  lines.push(`Gast${sep}${csvCell(el.gast.value)}`);
  lines.push("");

  const header = ["Mannschaft", "Stand", "Schütze"];
  for (const t of TEILE) header.push(t.label);
  header.push("Gesamt");
  for (const t of TEILE) {
    const startNr = t.startNr || 1;
    for (let i = 0; i < t.schuss; i++) header.push(`${t.label} ${startNr + i}`);
  }
  lines.push(header.join(sep));

  for (const team of TEAMS) {
    for (let s = 0; s < STAENDE_PRO_TEAM; s++) {
      const stand = state.teams[team.key][s];
      const row = [
        team.key === "heim" ? el.heim.value || "Heim" : el.gast.value || "Gast",
        `Stand ${s + 1}`,
        stand.name,
      ];
      let standTotal = 0;
      for (const t of TEILE) {
        const sum = summe(stand[t.key]);
        standTotal += sum;
        row.push(formatSumme(sum));
      }
      row.push(formatSumme(standTotal));
      for (const t of TEILE) {
        for (const v of stand[t.key]) row.push(formatRing(v));
      }
      lines.push(row.map(csvCell).join(sep));
    }
  }

  const csv = "﻿" + lines.join("\r\n"); // BOM für Excel-Umlaute
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const datumTeil = el.datum.value || new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `liga-${DISZ.id}-${datumTeil}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  setStatus("CSV exportiert.");
}

function csvCell(value) {
  const s = String(value ?? "");
  if (/[";\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// =========================================================================
//  Alles leeren
// =========================================================================
function clearAll() {
  const ok = window.confirm("Wirklich alle Felder leeren? Das kann nicht rückgängig gemacht werden.");
  if (!ok) return;

  const datum = el.datum.value;
  state = leererState();
  state.datum = datum;

  el.heim.value = "";
  el.gast.value = "";

  buildDom();
  activeIndex = -1;
  updateKeypadContext();
  recalc();
  save();
  setStatus("Alle Felder geleert.");
}

// =========================================================================
//  Status-Meldung
// =========================================================================
let statusTimer = null;
function setStatus(text) {
  el.status.textContent = text;
  clearTimeout(statusTimer);
  if (text) statusTimer = setTimeout(() => (el.status.textContent = ""), 2500);
}

// =========================================================================
//  Event-Verdrahtung
// =========================================================================
function wireEvents() {
  el.keypadGrid.addEventListener("click", (e) => {
    const btn = e.target.closest(".keypad-btn");
    if (!btn) return;
    if (btn.dataset.tenth !== undefined) {
      zehntelEingabe(Number(btn.dataset.tenth));
    } else {
      ringEingabe(Number(btn.dataset.value));
    }
  });

  el.keypadZero?.addEventListener("click", () => ringEingabe(0));
  el.keypadClear?.addEventListener("click", () => {
    if (DEZIMAL && phase === "zehntel") abbrechenDezimal();
    else clearValue();
  });

  el.btnPrev.addEventListener("click", retreat);
  el.btnNext.addEventListener("click", advance);

  el.btnSpeichern.addEventListener("click", () => save(true));
  el.btnListe?.addEventListener("click", () => {
    save();
    location.href = "liste.html?d=" + encodeURIComponent(DISZ.id);
  });
  el.btnExportCsv.addEventListener("click", exportCsv);
  el.btnLeeren.addEventListener("click", clearAll);

  el.datum.addEventListener("change", scheduleSave);
  el.heim.addEventListener("input", scheduleSave);
  el.gast.addEventListener("input", scheduleSave);

  document.addEventListener("keydown", onKeydown);
}

function onKeydown(e) {
  const tag = document.activeElement?.tagName;
  const istTextfeld = tag === "INPUT" && document.activeElement.type !== "button";
  if (istTextfeld && e.key !== "Enter") return;

  if (e.key >= "0" && e.key <= "9") {
    e.preventDefault();
    const d = Number(e.key);
    if (!DEZIMAL) setValue(d);
    else if (phase === "zehntel") zehntelEingabe(d);
    else ringEingabe(d); // ganze 10 nur über den Ziffernblock
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (activeIndex < 0) selectCell(0);
    else advance();
  } else if (e.key === "Backspace" || e.key === "Delete") {
    e.preventDefault();
    if (DEZIMAL && phase === "zehntel") abbrechenDezimal();
    else clearValue();
  } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
    e.preventDefault();
    advance();
  } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
    e.preventDefault();
    retreat();
  }
}

// =========================================================================
//  Start
// =========================================================================
function init() {
  if (!DISZ) return; // wurde bereits umgeleitet

  document.title = `${DISZ.name} – Liga Ergebniserfassung`;
  const schuetzen = DISZ.schuetzenProTeam;
  el.subtitle.innerHTML =
    `Disziplin <strong>${DISZ.nummer}</strong> · ${DISZ.name} · ` +
    `${schuetzen * 2} Schützen (${schuetzen} Heim + ${schuetzen} Gast)` +
    (DEZIMAL ? " · Zehntelwertung" : "");

  if (DEZIMAL) el.teamsMain.classList.add("dezimal");

  const geladen = load();

  buildFooter();
  buildDom();
  renderKeypad();

  el.datum.value = state.datum || new Date().toISOString().slice(0, 10);
  el.heim.value = state.heimName || "";
  el.gast.value = state.gastName || "";

  wireEvents();
  updateKeypadContext();
  recalc();

  if (geladen) setStatus("Gespeicherte Daten geladen.");
}

document.addEventListener("DOMContentLoaded", init);
