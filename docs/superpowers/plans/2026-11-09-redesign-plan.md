# Piano di implementazione — Maze Escaper Redesign

Spec di riferimento: `docs/superpowers/specs/2026-11-09-maze-escaper-redesign-design.md`

## Fase 1 — Il cuore (questa iterazione)

1. **Maschera come timer**
   - [ ] Rinominare il concetto "tempo" in "aria della maschera" nell'HUD (barra + icona)
   - [ ] La barra si svuota; a zero → morte ("Il labirinto ti ha preso")
2. **Morte e bottino**
   - [x] A fine run: riepilogo bottino con vendita dei tesori in monete
   - [ ] Morte per maschera vuota → bottino dimezzato (con offerta ad segnaposto)
3. **Renderer isometrico 2.5D**
   - [ ] Pareti con altezza (proiezione isometrica o 3/4 con volume)
   - [ ] Sprite con ombra, Y-sorting
   - [ ] Personaggio blob animato (camminata, direzione)
4. **Review visiva continua** con Playwright (screenshot a ogni fase)

## Fase 2 — L'economia

- [ ] Monete persistite (già esistenti in storage.ts, estendere)
- [ ] Skill tree estesa: maschera, velocità, fortuna chest
- [ ] Chest: legno/oro/ornata con loot table

## Fase 3 — Gli Scappatori (idle)

- [ ] Reclutare Scappatori con monete
- [ ] Produzione offline = quantità × livello × amore
- [ ] Nutrirli (monete → amore)

## Fase 4 — Biomi

- [ ] Prato → Caverne → Galassia: palette + decorazioni
- [ ] Luogotenenti-boss per bioma (ogni 5 livelli)

## Fase 5 — PWA

- [ ] manifest.json + icone
- [ ] Service worker (offline completo)
- [ ] Segnaposto "sponsor" (ad simulato) per salvare il bottino

## Verifica continua

- `npm test` verde prima di ogni push (36 test attuali + nuovi)
- Screenshot Playwright a ogni fase (home, run, result)
- Review visiva: contrasto, leggibilità a 360px, focus visibile
