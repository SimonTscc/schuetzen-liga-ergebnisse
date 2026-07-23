# Liga Ergebniserfassung (Kreis Stuttgart)

Web-App zur Eingabe von Schießergebnissen im Rundenwettkampf. **Mehrere Disziplinen** über eine Auswahlseite, Eingabe je Schuss über einen festen Ziffernblock — für Mobilgeräte optimiert.

## Aufbau

- **`index.html`** – Startseite: Disziplin auswählen.
- **`tracker.html?d=<id>`** – Erfassungsseite für die gewählte Disziplin.
- **`disciplines.js`** – zentraler Disziplin-Katalog (Schützenzahl, Schuss-Programm, Serien, Ringe).
- **`app.js`** – konfigurationsgesteuerte Tracker-Logik.
- **`styles.css`** – Gestaltung.

## Starten

`index.html` im Browser öffnen (Doppelklick) und eine Disziplin wählen.

Optional mit lokalem Server (empfohlen, falls localStorage/CSV zickt):

```bash
cd schuetzen-liga-ergebnisse
python -m http.server 8080
```

Dann im Browser: http://localhost:8080

## Enthaltene Disziplinen

Alle ringbasierten **Gewehr- (1.xx)** und **Pistolen-Disziplinen (2.xx)** der DSB-Sportordnung, gruppiert auf der Auswahlseite mit Suchfeld:

- **Gewehr · Luftdruck**: Luftgewehr (40 / 60), LG Auflage, LG 3-Stellung
- **Gewehr · Zimmerstutzen**: Zimmerstutzen, Zimmerstutzen Auflage
- **Gewehr · Kleinkaliber**: KK 100 m, KK 50 m 3-Stellung, Auflage-Varianten, Zielfernrohr, Freigewehr 3 × 40, Liegendkampf
- **Gewehr · Großkaliber**: Standardgewehr, Feuerstutzen, Freigewehr, Liegendkampf, Ordonnanz, Unterhebelrepetierer (50/100/300 m)
- **Pistole · Luftdruck**: Luftpistole (40 / 60), LP Auflage, mehrschüssige LP
- **Pistole · 25 m**: Sportpistole, Zentralfeuer, Großkaliber (.30/.32/9 mm/.38/.357/10 mm/.41/.44/.45), Schnellfeuer, Standardpistole
- **Pistole · 50 m**: Freie Pistole (40 / 60)

Alle Disziplinen: **5 Heim + 5 Gast**, Ringe 0–10.

**Zehntelwertung:** Auflage-Disziplinen (mit `dezimal: true` markiert) werden in Zehnteln erfasst (0,0–10,9). Die Eingabe ist dort zweistufig: erst den ganzen Ring antippen, dann das Zehntel (,0–,9) — der Ziffernblock schaltet automatisch um. Alle Summen rechnen und zeigen dezimal. Alle übrigen Disziplinen bleiben bei ganzen Ringen mit einstufiger Eingabe.

> [!Hinweis] Programme prüfen
> SpO-Nummern und Namen folgen der DSB-Sportordnung. Die Schussprogramme sind die üblichen Wettkampf-/Rundenwettkampf-Programme; bei abweichender Ausschreibung (z. B. Kreis Stuttgart) in `disciplines.js` anpassen. Zwei Längen (Liga 40 / Meisterschaft 60) gibt es nur dort, wo das Standard ist: Luftgewehr, Luftpistole, Freie Pistole.

### Disziplin anpassen / hinzufügen

Alles steckt in **`disciplines.js`**, in der Liste `LISTE` (wird automatisch in Katalog + Reihenfolge überführt). Eine neue Disziplin = ein Objekt mit `id`, `nummer`, `name`, `kategorie`, `beschreibung` und `teile`. Für die Programme gibt es Bausteine:

- `einzel(schuss, serie)` – ein durchgehender Block (z. B. Luftgewehr, Liegendkampf)
- `stellung(proStellung)` – Dreistellungskampf (Kniend / Liegend / Stehend)
- `praezisionDuell(proTeil)` – 25-m-Pistole (Präzision + Duell, Serien à 5)

`schuetzenProTeam` (5) und `ringMax` (10) werden automatisch gesetzt und können je Eintrag überschrieben werden.

## Funktionen

- Auswahlseite mit Disziplin-Karten
- 5 Heim- + 5 Gast-Stände mit Schützenname
- Fester **Ziffernblock 1–10** (plus 0 und Löschen), Touch-optimiert
- Auto-Sprung zum nächsten Schuss, Vor/Zurück, fortlaufende Schuss-Nummerierung über Serien
- Physische Tastatur am Desktop (Ziffern, Enter, Pfeile, Löschen)
- Summen je Serie/Block, je Stand und je Mannschaft + Begegnung gesamt
- **Auto-Speichern im Browser** (localStorage) – **je Disziplin getrennt**
- CSV-Export für Excel/LibreOffice (mit BOM für Umlaute)

## Hinweis

Daten liegen nur im jeweiligen Browser (localStorage). Für mehrere Geräte den CSV-Export nutzen oder Firebase Hosting anbinden (`firebase.json` liegt bereit).
