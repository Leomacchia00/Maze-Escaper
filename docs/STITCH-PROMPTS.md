# Stitch — Prompt per le schermate di Maze Escaper

Da usare con il connettore Stitch MCP (`stitch_*`) in una nuova sessione.
Flusso: `create_project` (titolo "Maze Escaper") → generare le schermate con i
prompt sotto → leggere HTML/screenshot → allineare token a `docs/DESIGN.md`.

## Impostazioni comuni (DesignTheme)

- `colorMode`: DARK
- `customColor`: `#22d3ee` (accent ciano, hue OKLCH 205)
- `headlineFont`: SPACE_GROTESK, `bodyFont`: INTER
- `deviceType`: MOBILE (il gioco è mobile-first, target 360px)
- Lingua contenuti: italiano

## 1. Lobby (Home)

```
Dark arcade game lobby for "Maze Escaper", a minimal maze-timer web game.
Top: gradient wordmark "MAZE ESCAPER" in cyan, short subtitle.
Primary action: large filled cyan button "▶ Gioca" full width.
Below: 2x1 grid of neutral menu tiles with icon, name and hint:
"⚡ Skill — Migliora il giocatore" and "⚙ Impostazioni — Vibrazione, dati".
Then two stat panels: "Livello corrente" with big cyan number, "Monete" with
big cyan number. Bottom: 3-column stats row (Giocate / Vinte / Perse) with
tabular numbers. Cool dark blue-gray background (#070b14 family), cyan glow
accents, generous spacing, rounded 20px panels, no images.
```

## 2. Run (gioco)

```
Dark mobile game screen "Partita in corso" for a maze escape game.
Top HUD row: back arrow button, pill chip "Livello 3", cyan pill timer chip
"42.1s" right-aligned, square pause button. Center: large square canvas area
showing a glowing cyan-walled maze grid on near-black background, one green
player dot, one orange pulsing exit tile, subtle fog-of-war darkening outside
a 3-cell radius. Bottom hint text: "Frecce/WASD · swipe su mobile · Esc per
la pausa". Minimal, high contrast, neon arcade style.
```

## 3. Pausa (overlay)

```
Pause menu overlay for the maze game screen: the maze behind is dimmed and
blurred by a 92% dark scrim. Centered dialog card with title "In pausa" and
three stacked buttons: primary cyan "Riprendi", neutral "Ricomincia",
neutral "Menu". Small caption below: "Esc per riprendere".
```

## 4. Risultato (vittoria e sconfitta)

```
Dark result screen for the maze game. Top header: back arrow and large title
"Vittoria!" in mint green (or "Tempo scaduto" in red for the losing variant).
Big centered score "1 240" in cyan with label "PUNTEGGIO". Breakdown panel
with three rows: "Tempo residuo +180", "Labirinto +121", "Bonus efficienza
+60". Gold/green record badge "★ Nuovo record per il livello 3!".
Below: small maze preview canvas. Bottom actions: primary cyan "Prossimo
livello" and neutral "Riprova", "Menu". Two variants: win and loss.
```

## 5. Skill tree

```
Dark meta-progression screen "Skill" for the maze game. Top header: back
arrow, title "Skill", cyan pill chip "Monete: 85" right-aligned.
Vertical list of 4 skill cards, each with: name, short description,
level dots (filled = owned level, max 3), and an upgrade button
"Migliora — 20 monete" (disabled state when unaffordable, with prerequisite
note). Cards: "Tempo extra +5% tempo base", "Timer lento — il tempo scorre
più piano", "Visione +1 raggio fog", "Bussola — freccia verso l'uscita".
One card shows "✔ Livello massimo" in green.
```

## 6. Impostazioni

```
Dark settings screen "Impostazioni" for the maze game. Top header with back
arrow and title. Two setting panels: "Vibrazione — Feedback tattile su
mobile" with an iOS-style toggle switch (on, cyan); "Reset progressi —
Cancella livello, record e statistiche" with an outlined red "Reset" button.
Footer centered muted caption "Maze Escaper v0.2".
```

## Dopo la generazione

1. Leggere `htmlCode` + `screenshot` di ogni schermata.
2. Confrontare con i token di `docs/DESIGN.md`: i colori Stitch vanno mappati
   sui token semantici, mai copiati come hex nei componenti.
3. Proporre le modifiche al layout (`index.html` + `styles.css`) solo dopo
   approvazione dell'utente sulle schermate scelte.
