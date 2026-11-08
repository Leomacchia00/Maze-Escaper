# Maze Escaper (v1 draft)

Gioco web di labirinti procedurali a sessione breve. Bozza minimale e funzionante: TypeScript vanilla, zero dipendenze runtime, rendering su `<canvas>` 2D, UI in DOM.

## Avvio

```bash
npm install        # solo devDependency: typescript
npm run build      # compila src/ in dist/
npm run serve      # http://localhost:8080 (python3 http.server)
```

Il gioco è statico e offline-first: serve solo un server statico (i moduli ES non girano su `file://`).

## Struttura

- `src/maze.ts` — generazione perfect maze (recursive backtracker), BFS, uscita = cella più lontana
- `src/game.ts` — stato di run puro: timer, movimento, punteggio, fog of war
- `src/render.ts` — disegno del labirinto su canvas
- `src/storage.ts` — persistenza localStorage (livello, record per livello, statistiche)
- `src/ui.ts` — schermate Home / Run / Risultato
- `src/main.ts` — input (frecce/WASD, swipe, Esc pausa) e loop rAF
- `src/tests/` — test automatici (`npm test`)

## Regole v1

- `N = 11 + (livello-1)*2`, tetto 41 (livelli 1–15)
- Tempo base `N * 2.5s`, parte al primo movimento; +0.2s per cella nuova
- Punteggio (solo vittoria): `tempo_residuo*10 + N*N + (celle_totali - celle_visitate)*5`
- Fog of war: raggio 3 dal livello 4, raggio 2 dal livello 8
- Alla sconfitta il labirinto resta visibile nella schermata risultato

## Test

```bash
npm test
```

Copre: 100 labirinti tutti risolvibili (BFS), formula del punteggio, timer/visite, pausa, fog of war, persistenza.
