# Versilbertes Besteck

Ankaufspreise auslesen und für den Flohmarkt schnelle Höchstpreise pro Stück anzeigen.

## Änderungen
- **Kein lokaler Server mehr:** Die Datei `server.js` wurde entfernt. `npm start` startet jetzt nicht mehr den Server.
- **Abruf nur bei Bedarf:** Die Webseite holt die Daten **erst**, wenn du auf den Button **„Hole aktuelle Daten“** klickst.

## Nutzung
1. Öffne `index.html` im Browser (z. B. per Doppelklick).
2. Klicke auf **„Hole aktuelle Daten“** — die Seite versucht zuerst, die Live‑Seite zu erreichen.
3. Wenn der direkte Abruf im Browser wegen CORS/Netzwerk scheitert, versucht die Seite einen **Proxy‑Fallback** (direkter Fetch → Proxy). 

## Hinweise
- Browser können direkte Abrufe an fremde Seiten aus Sicherheitsgründen (CORS) blockieren. In diesem Fall wird in der UI ein entsprechender Hinweis angezeigt.
- Die automatische Aktualisierung per **GitHub Actions** wurde entfernt: `scripts/fetch-values.js` und der zugehörige Workflow wurden gelöscht. Wenn du automatische Updates wieder möchtest, füge das Script und den Workflow wieder hinzu oder richte einen eigenen Cron‑Job/Runner ein.

