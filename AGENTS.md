# AGENTS.md — Maze Escaper

Istruzioni per qualsiasi agente (Vibe Code, Claude Code, Cursor, Codex…) che lavora su questo repo.

## Skill obbligatorie

Questo repo include skill vendorate in `skills/` (fonti e licenze in `skills/SOURCES.md`). **Prima di ogni task, leggi la skill corrispondente e applicala.** Tabella di routing:

| Task | Leggi prima |
|---|---|
| Modificare UI DOM (index.html, styles.css, ui.ts) | `skills/better-interface/SKILL.md` + `skills/better-ui/SKILL.md` |
| Layout, spaziature, griglie, responsive (360px!) | `skills/better-layout/SKILL.md` |
| Colori, contrasto, tema scuro | `skills/better-colors/SKILL.md` + `skills/better-accessibility/SKILL.md` |
| Testi, copy, microcopy | `skills/better-typography/SKILL.md` (per il testo) — copy in italiano, tono diretto |
| Review di una schermata | `skills/interface-review/SKILL.md` |
| Rendering canvas (render.ts), effetti, animazioni di gioco | `skills/game-engine/SKILL.md` + `skills/game-feel/SKILL.md` |
| Generazione labirinti, algoritmi procedurali (maze.ts) | `skills/procedural-gen/SKILL.md` |
| Menu, HUD, schermate di gioco | `skills/game-ui-ux/SKILL.md` |
| Salvataggio/persistenza (storage.ts, localStorage) | `skills/save-systems/SKILL.md` |
| Input tastiera/swipe (main.ts) | `skills/input-systems/SKILL.md` |
| Prestazioni (canvas 41×41, loop rAF) | `skills/performance-optimization/SKILL.md` |
| Progettare il frontend da zero o restyling | `skills/frontend-design/SKILL.md` |
| Test browser reali (richiede ambiente locale con browser) | `skills/webapp-testing/SKILL.md` |

## Regole del progetto

- **Zero dipendenze runtime**: TypeScript vanilla, nessun framework. DevDependencies solo per compilare/testare.
- **Core puro**: `maze.ts`, `game.ts`, `skills.ts` devono restare testabili senza DOM. Prima la logica, poi la grafica.
- **Mobile-first**: tutto deve funzionare a 360px. Touch target ≥ 44px.
- **Offline-first**: nessuna chiamata di rete dal gioco.
- **Un solo branch**: commit diretti su `main`, niente branch task né PR.
- Test: `npm test` deve passare (28+ test) prima di ogni push.
- La specifica storica è `docs/SPEC.md` (parzialmente superata) e la roadmap delle fasi future è `docs/ROADMAP.md`: leggerli prima di decisioni di design.

## Come usare le skill

1. Identifica il task nella tabella qui sopra.
2. Leggi il `SKILL.md` della skill (e i riferimenti citati, se pertinenti).
3. Applica i principi durante il lavoro; per le skill di review, produci il report ranzato che richiedono e correggi ciò che trova prima di consegnare.
4. Non copiare i file skill altrove: restano in `skills/` e si aggiornano solo aggiornando la fonte (vedi `skills/SOURCES.md`).
