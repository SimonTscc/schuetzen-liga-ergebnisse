/* =========================================================================
   DSB-Disziplin-Katalog (Gewehr + Pistole, ringbasiert)
   -------------------------------------------------------------------------
   Quellen: DSB Sportordnung 2026, Übersichten Sächsischer Schützenbund,
   SV Tell-Kirchen, Vegesacker SV. SpO-Nummern und Namen nach dieser
   Sportordnung; Schussprogramme als übliche Wettkampf-/Rundenwettkampf-
   Programme. Alles frei editierbar – bei abweichender Ausschreibung
   (z. B. Kreis Stuttgart) einfach die Werte unten anpassen.

   Nur ringbasierte Disziplinen (Gewehr 1.xx, Pistole 2.xx). Flinte, Bogen,
   Armbrust und Laufende Scheibe fehlen bewusst – sie brauchen ein anderes
   Wertungsprinzip als Ringe pro Schuss.

   Zwei Programmlängen (Liga 40 / Meisterschaft 60) gibt es nur dort, wo sie
   tatsächlich Standard sind: Luftgewehr, Luftpistole, Freie Pistole.

   Auflage-Disziplinen sind mit `dezimal: true` markiert und werden in
   Zehnteln erfasst (0,0–10,9); alle übrigen in ganzen Ringen.

   Feldbeschreibung je teil: key, label, schuss, serie (Schuss je Serie),
   cssClass ("teil-praezision" grün | "teil-20s" blau), startNr (optional).
   ========================================================================= */

(function () {
  "use strict";

  // ---- Programm-Bausteine ------------------------------------------------

  // Ein durchgehender Block (z. B. Luftgewehr, Liegendkampf)
  function einzel(schuss, serie) {
    return [{ key: "wertung", label: "Wertung", schuss: schuss, serie: serie || 10, cssClass: "teil-praezision" }];
  }

  // Dreistellungskampf: Kniend / Liegend / Stehend (Anzeigereihenfolge)
  function stellung(proStellung) {
    return [
      { key: "kniend", label: "Kniend", schuss: proStellung, serie: 10, cssClass: "teil-praezision" },
      { key: "liegend", label: "Liegend", schuss: proStellung, serie: 10, cssClass: "teil-20s" },
      { key: "stehend", label: "Stehend", schuss: proStellung, serie: 10, cssClass: "teil-praezision" },
    ];
  }

  // 25-m-Pistole: Präzision + Duell, je Serien à 5
  function praezisionDuell(proTeil) {
    return [
      { key: "praezision", label: "Präzision", schuss: proTeil, serie: 5, cssClass: "teil-praezision" },
      { key: "duell", label: "Duell", schuss: proTeil, serie: 5, cssClass: "teil-20s" },
    ];
  }

  // ---- Disziplinen (Reihenfolge = Anzeigereihenfolge) --------------------
  // kategorie gruppiert die Auswahlseite.
  const LISTE = [
    // ===== Gewehr – Luftdruck =====
    { id: "1.10", nummer: "1.10", name: "Luftgewehr", kategorie: "Gewehr · Luftdruck",
      beschreibung: "10 m, stehend, 40 Schuss (Rundenwettkampf).", teile: einzel(40, 10) },
    { id: "1.10-m", nummer: "1.10", name: "Luftgewehr (Meisterschaft)", kategorie: "Gewehr · Luftdruck",
      beschreibung: "10 m, stehend, 60 Schuss.", teile: einzel(60, 10) },
    { id: "1.11", nummer: "1.11", name: "Luftgewehr Auflage", kategorie: "Gewehr · Luftdruck",
      beschreibung: "10 m, aufgelegt, 30 Schuss, Zehntelwertung.", dezimal: true, teile: einzel(30, 10) },
    { id: "1.20", nummer: "1.20", name: "Luftgewehr 3-Stellung", kategorie: "Gewehr · Luftdruck",
      beschreibung: "10 m, kniend/liegend/stehend, 3 × 20 Schuss.", teile: stellung(20) },

    // ===== Gewehr – Zimmerstutzen =====
    { id: "1.30", nummer: "1.30", name: "Zimmerstutzen", kategorie: "Gewehr · Zimmerstutzen",
      beschreibung: "15 m, 30 Schuss.", teile: einzel(30, 10) },
    { id: "1.31", nummer: "1.31", name: "Zimmerstutzen Auflage", kategorie: "Gewehr · Zimmerstutzen",
      beschreibung: "15 m, aufgelegt, 30 Schuss, Zehntelwertung.", dezimal: true, teile: einzel(30, 10) },

    // ===== Gewehr – Kleinkaliber =====
    { id: "1.35", nummer: "1.35", name: "KK-Gewehr 100 m", kategorie: "Gewehr · Kleinkaliber",
      beschreibung: "100 m, 30 Schuss.", teile: einzel(30, 10) },
    { id: "1.36", nummer: "1.36", name: "KK-Gewehr 100 m Auflage", kategorie: "Gewehr · Kleinkaliber",
      beschreibung: "100 m, aufgelegt (Diopter), 30 Schuss, Zehntelwertung.", dezimal: true, teile: einzel(30, 10) },
    { id: "1.40", nummer: "1.40", name: "KK-Sportgewehr 50 m 3-Stellung", kategorie: "Gewehr · Kleinkaliber",
      beschreibung: "50 m, kniend/liegend/stehend, 3 × 20 Schuss.", teile: stellung(20) },
    { id: "1.41", nummer: "1.41", name: "KK-Sportgewehr Auflage 50 m", kategorie: "Gewehr · Kleinkaliber",
      beschreibung: "50 m, aufgelegt, 30 Schuss, Zehntelwertung.", dezimal: true, teile: einzel(30, 10) },
    { id: "1.42", nummer: "1.42", name: "KK-Gewehr 50 m Zielfernrohr", kategorie: "Gewehr · Kleinkaliber",
      beschreibung: "50 m, Zielfernrohr, 30 Schuss.", teile: einzel(30, 10) },
    { id: "1.43", nummer: "1.43", name: "KK-Gewehr 50 m Zielfernrohr aufgelegt", kategorie: "Gewehr · Kleinkaliber",
      beschreibung: "50 m, Zielfernrohr, aufgelegt, 30 Schuss, Zehntelwertung.", dezimal: true, teile: einzel(30, 10) },
    { id: "1.44", nummer: "1.44", name: "KK-Gewehr 100 m Zielfernrohr aufgelegt", kategorie: "Gewehr · Kleinkaliber",
      beschreibung: "100 m, Zielfernrohr, aufgelegt, 30 Schuss, Zehntelwertung.", dezimal: true, teile: einzel(30, 10) },
    { id: "1.45", nummer: "1.45", name: "KK-Sportgewehr 50 m Mehrlader", kategorie: "Gewehr · Kleinkaliber",
      beschreibung: "50 m, Mehrlader, 30 Schuss.", teile: einzel(30, 10) },
    { id: "1.60", nummer: "1.60", name: "KK-Freigewehr 50 m 3 × 40", kategorie: "Gewehr · Kleinkaliber",
      beschreibung: "50 m, kniend/liegend/stehend, 3 × 40 Schuss.", teile: stellung(40) },
    { id: "1.80", nummer: "1.80", name: "KK-Liegendkampf 50 m", kategorie: "Gewehr · Kleinkaliber",
      beschreibung: "50 m, liegend, 60 Schuss.", teile: einzel(60, 10) },
    { id: "1.85", nummer: "1.85", name: "KK-Liegendkampf Mehrlader 50 m", kategorie: "Gewehr · Kleinkaliber",
      beschreibung: "50 m, liegend, Mehrlader, 60 Schuss.", teile: einzel(60, 10) },

    // ===== Gewehr – Großkaliber =====
    { id: "1.37", nummer: "1.37", name: "GK-Feuerstutzen 50 m", kategorie: "Gewehr · Großkaliber",
      beschreibung: "50 m, 60 Schuss.", teile: einzel(60, 10) },
    { id: "1.38", nummer: "1.38", name: "GK-Feuerstutzen 100 m", kategorie: "Gewehr · Großkaliber",
      beschreibung: "100 m, 60 Schuss.", teile: einzel(60, 10) },
    { id: "1.50", nummer: "1.50", name: "GK-Standardgewehr 300 m 3 × 40", kategorie: "Gewehr · Großkaliber",
      beschreibung: "300 m, Dreistellung, 3 × 40 Schuss.", teile: stellung(40) },
    { id: "1.51", nummer: "1.51", name: "GK-Standardgewehr 300 m 3 × 20", kategorie: "Gewehr · Großkaliber",
      beschreibung: "300 m, Dreistellung, 3 × 20 Schuss.", teile: stellung(20) },
    { id: "1.52", nummer: "1.52", name: "GK-Standardgewehr 300 m liegend", kategorie: "Gewehr · Großkaliber",
      beschreibung: "300 m, liegend, 40 Schuss.", teile: einzel(40, 10) },
    { id: "1.53", nummer: "1.53", name: "GK-Standardgewehr Mehrlader 3 × 40", kategorie: "Gewehr · Großkaliber",
      beschreibung: "300 m, Mehrlader, Dreistellung, 3 × 40 Schuss.", teile: stellung(40) },
    { id: "1.54", nummer: "1.54", name: "GK-Standardgewehr Mehrlader 3 × 20", kategorie: "Gewehr · Großkaliber",
      beschreibung: "300 m, Mehrlader, Dreistellung, 3 × 20 Schuss.", teile: stellung(20) },
    { id: "1.55", nummer: "1.55", name: "GK-Standardgewehr Mehrlader liegend", kategorie: "Gewehr · Großkaliber",
      beschreibung: "300 m, Mehrlader, liegend, 40 Schuss.", teile: einzel(40, 10) },
    { id: "1.56", nummer: "1.56", name: "Unterhebelrepetierer 3 × 40", kategorie: "Gewehr · Großkaliber",
      beschreibung: "300 m, Dreistellung, 3 × 40 Schuss.", teile: stellung(40) },
    { id: "1.57", nummer: "1.57", name: "Unterhebelrepetierer 3 × 20", kategorie: "Gewehr · Großkaliber",
      beschreibung: "300 m, Dreistellung, 3 × 20 Schuss.", teile: stellung(20) },
    { id: "1.58-o", nummer: "1.58 O", name: "Ordonnanzgewehr 100 m 3 × 40", kategorie: "Gewehr · Großkaliber",
      beschreibung: "100 m, Dreistellung, 3 × 40 Schuss.", teile: stellung(40) },
    { id: "1.58-g", nummer: "1.58 G", name: "Ordonnanzgewehr 100 m 3 × 20", kategorie: "Gewehr · Großkaliber",
      beschreibung: "100 m, Dreistellung, 3 × 20 Schuss.", teile: stellung(20) },
    { id: "1.59", nummer: "1.59", name: "GK-Sportgewehr 300 m", kategorie: "Gewehr · Großkaliber",
      beschreibung: "300 m, Dreistellung, 3 × 40 Schuss.", teile: stellung(40) },
    { id: "1.70", nummer: "1.70", name: "GK-Freigewehr 300 m", kategorie: "Gewehr · Großkaliber",
      beschreibung: "300 m, Dreistellung, 3 × 40 Schuss.", teile: stellung(40) },
    { id: "1.71", nummer: "1.71", name: "GK-Freigewehr 50 m", kategorie: "Gewehr · Großkaliber",
      beschreibung: "50 m, Dreistellung, 3 × 40 Schuss.", teile: stellung(40) },
    { id: "1.72", nummer: "1.72", name: "GK-Freigewehr 100 m", kategorie: "Gewehr · Großkaliber",
      beschreibung: "100 m, Dreistellung, 3 × 40 Schuss.", teile: stellung(40) },
    { id: "1.90", nummer: "1.90", name: "GK-Liegendkampf 300 m", kategorie: "Gewehr · Großkaliber",
      beschreibung: "300 m, liegend, 40 Schuss.", teile: einzel(40, 10) },
    { id: "1.91", nummer: "1.91", name: "GK-Liegendkampf 50 m", kategorie: "Gewehr · Großkaliber",
      beschreibung: "50 m, liegend, 40 Schuss.", teile: einzel(40, 10) },
    { id: "1.92", nummer: "1.92", name: "GK-Liegendkampf 100 m", kategorie: "Gewehr · Großkaliber",
      beschreibung: "100 m, liegend, 40 Schuss.", teile: einzel(40, 10) },
    { id: "1.95", nummer: "1.95", name: "GK-Liegendkampf Mehrlader 300 m", kategorie: "Gewehr · Großkaliber",
      beschreibung: "300 m, liegend, Mehrlader, 40 Schuss.", teile: einzel(40, 10) },
    { id: "1.96", nummer: "1.96", name: "GK-Liegendkampf Mehrlader 50 m", kategorie: "Gewehr · Großkaliber",
      beschreibung: "50 m, liegend, Mehrlader, 40 Schuss.", teile: einzel(40, 10) },
    { id: "1.97", nummer: "1.97", name: "GK-Liegendkampf Mehrlader 100 m", kategorie: "Gewehr · Großkaliber",
      beschreibung: "100 m, liegend, Mehrlader, 40 Schuss.", teile: einzel(40, 10) },

    // ===== Pistole – Luftdruck =====
    { id: "2.10", nummer: "2.10", name: "Luftpistole", kategorie: "Pistole · Luftdruck",
      beschreibung: "10 m, 40 Schuss (Rundenwettkampf).", teile: einzel(40, 10) },
    { id: "2.10-m", nummer: "2.10", name: "Luftpistole (Meisterschaft)", kategorie: "Pistole · Luftdruck",
      beschreibung: "10 m, 60 Schuss.", teile: einzel(60, 10) },
    { id: "2.11", nummer: "2.11", name: "Luftpistole Auflage", kategorie: "Pistole · Luftdruck",
      beschreibung: "10 m, aufgelegt, 30 Schuss, Zehntelwertung.", dezimal: true, teile: einzel(30, 10) },
    { id: "2.16", nummer: "2.16", name: "Mehrschüssige Luftpistole", kategorie: "Pistole · Luftdruck",
      beschreibung: "10 m, mehrschüssig, 40 Schuss.", teile: einzel(40, 10) },

    // ===== Pistole – 25 m =====
    { id: "2.30", nummer: "2.30", name: "Schnellfeuerpistole", kategorie: "Pistole · 25 m",
      beschreibung: "25 m, 2 Durchgänge à 30 Schuss, Serien à 5.",
      teile: [
        { key: "durchgang1", label: "Durchgang 1", schuss: 30, serie: 5, cssClass: "teil-praezision" },
        { key: "durchgang2", label: "Durchgang 2", schuss: 30, serie: 5, cssClass: "teil-20s" },
      ] },
    { id: "2.40", nummer: "2.40", name: "Sportpistole 25 m", kategorie: "Pistole · 25 m",
      beschreibung: "25 m, 30 Präzision + 30 Duell, Serien à 5.", teile: praezisionDuell(30) },
    { id: "2.45", nummer: "2.45", name: "Zentralfeuerpistole 25 m", kategorie: "Pistole · 25 m",
      beschreibung: "25 m, 30 Präzision + 30 Duell, Serien à 5.", teile: praezisionDuell(30) },
    { id: "2.51", nummer: "2.51", name: "Großkaliberpistole .30", kategorie: "Pistole · 25 m",
      beschreibung: "25 m, 20 Präzision + 20 Duell, Serien à 5.", teile: praezisionDuell(20) },
    { id: "2.52", nummer: "2.52", name: "Großkaliberpistole .32", kategorie: "Pistole · 25 m",
      beschreibung: "25 m, 20 Präzision + 20 Duell, Serien à 5.", teile: praezisionDuell(20) },
    { id: "2.53", nummer: "2.53", name: "Pistole 9 mm (Präzision + 20 s)", kategorie: "Pistole · 25 m",
      beschreibung: "25 m, 20 Schuss Präzision + 20 Schuss 20 s, Serien à 5.",
      teile: [
        { key: "praezision", label: "Präzision", schuss: 20, serie: 5, cssClass: "teil-praezision" },
        { key: "schnell", label: "20 s", schuss: 20, serie: 5, cssClass: "teil-20s" },
      ] },
    { id: "2.54", nummer: "2.54", name: "Großkaliberpistole .38", kategorie: "Pistole · 25 m",
      beschreibung: "25 m, 20 Präzision + 20 Duell, Serien à 5.", teile: praezisionDuell(20) },
    { id: "2.55", nummer: "2.55", name: "Revolver .357 Magnum", kategorie: "Pistole · 25 m",
      beschreibung: "25 m, 20 Präzision + 20 Duell, Serien à 5.", teile: praezisionDuell(20) },
    { id: "2.56", nummer: "2.56", name: "Großkaliberpistole 10 mm", kategorie: "Pistole · 25 m",
      beschreibung: "25 m, 20 Präzision + 20 Duell, Serien à 5.", teile: praezisionDuell(20) },
    { id: "2.57", nummer: "2.57", name: "Großkaliberrevolver .41", kategorie: "Pistole · 25 m",
      beschreibung: "25 m, 20 Präzision + 20 Duell, Serien à 5.", teile: praezisionDuell(20) },
    { id: "2.58", nummer: "2.58", name: "Revolver .44 Magnum", kategorie: "Pistole · 25 m",
      beschreibung: "25 m, 20 Präzision + 20 Duell, Serien à 5.", teile: praezisionDuell(20) },
    { id: "2.59", nummer: "2.59", name: "Pistole .45", kategorie: "Pistole · 25 m",
      beschreibung: "25 m, 20 Präzision + 20 Duell, Serien à 5.", teile: praezisionDuell(20) },
    { id: "2.60", nummer: "2.60", name: "Standardpistole 25 m", kategorie: "Pistole · 25 m",
      beschreibung: "25 m, 3 × 20 Schuss (150 s / 20 s / 10 s), Serien à 5.",
      teile: [
        { key: "s150", label: "150 s", schuss: 20, serie: 5, cssClass: "teil-praezision" },
        { key: "s20", label: "20 s", schuss: 20, serie: 5, cssClass: "teil-20s" },
        { key: "s10", label: "10 s", schuss: 20, serie: 5, cssClass: "teil-praezision" },
      ] },

    // ===== Pistole – 50 m =====
    { id: "2.20", nummer: "2.20", name: "Freie Pistole 50 m", kategorie: "Pistole · 50 m",
      beschreibung: "50 m, 40 Schuss (Rundenwettkampf).", teile: einzel(40, 10) },
    { id: "2.20-m", nummer: "2.20", name: "Freie Pistole 50 m (Meisterschaft)", kategorie: "Pistole · 50 m",
      beschreibung: "50 m, 60 Schuss.", teile: einzel(60, 10) },
  ];

  // ---- In Map + Reihenfolge überführen -----------------------------------
  const DISZIPLINEN = {};
  const REIHENFOLGE = [];
  for (const d of LISTE) {
    d.schuetzenProTeam = 5;
    d.ringMax = 10;
    DISZIPLINEN[d.id] = d;
    REIHENFOLGE.push(d.id);
  }

  window.DISZIPLINEN = DISZIPLINEN;
  window.DISZIPLIN_REIHENFOLGE = REIHENFOLGE;
})();
