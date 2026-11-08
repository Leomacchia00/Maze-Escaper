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
- `src/skills.ts` — skill tree e valuta meta (v1.1)
- `src/render.ts` — disegno del labirinto su canvas (inclusa la bussola)
- `src/storage.ts` — persistenza localStorage (livello, record, statistiche, monete, skill)
- `src/ui.ts` — schermate Home / Run / Risultato / Skill
- `src/main.ts` — input (frecce/WASD, swipe, Esc pausa) e loop rAF
- `src/tests/` — test automatici (`npm test`)
- `docs/SPEC.md` — specifica di gioco (documento base del progetto)

## Regole v1

- `N = 11 + (livello-1)*2`, tetto 41 (livelli 1–15)
- Tempo base `N * 2.5s`, parte al primo movimento; +0.2s per cella nuova
- Punteggio (solo vittoria): `tempo_residuo*10 + N*N + (celle_totali - celle_visitate)*5`
- Fog of war: raggio 3 dal livello 4, raggio 2 dal livello 8
- Alla sconfitta il labirinto resta visibile nella schermata risultato

## v1.1 — Skill tree e valuta meta

- Vittoria: `10 + livello * 2` monete; sconfitta: 2 monete
- 4 skill (3 livelli ciascuna, costi 20/50/120), due rami con prerequisiti:
  - **Tempo extra**: +5% tempo base per livello → sblocca **Timer lento** (tempo scorre 5% più lento per livello)
  - **Visione**: +1 raggio fog per livello → sblocca **Bussola** (freccia verso l'uscita sul canvas)
- Acquisti dalla schermata Skill (Home → Skill), persistiti in localStorage
- Design e fonti: `docs/SPEC.md` §12

## Test

```bash
npm test
```

Copre: 100 labirinti tutti risolvibili (BFS), formula del punteggio, timer/visite, pausa, fog of war, valuta e skill (effetti, costi, prerequisiti, reload), persistenza, smoke test DOM.
