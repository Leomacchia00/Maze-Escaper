# Maze Escaper — Documento di Design

Data: 2026-11-09 · Stato: bozza per approvazione · Titolo di lavoro: **Maze Escaper**

## Intento e perché

Maze Escaper è un **dungeon-maze incrementale** in cui sei un ladro nel labirinto vivo del
Minotauro: gareggi contro il tempo per rubare i tesori del labirinto, potenziarti, e
scendere sempre più a fondo nelle sue ali. Il gioco deve essere **leggero** (PWA
installabile, poche decine di KB, offline-first), **fluido** su qualsiasi dispositivo, e
**allegro** — mai cupo: la minaccia è parte del gioco, l'estetica resta solare.

Perché: il gioco esiste già come solida base tecnica (movimento libero, labirinti
procedurali, economia base). Manca il **loop incrementale** che trattiene: risorse,
equipaggiamento, idle. Questo documento definisce quel completamento.

## Obiettivi e non-obiettivi

**Obiettivi**
- Loop corto irresistibile: run di 30–90 secondi che si incastrano in un loop meta lungo
- Progressione che si *vede*: biomi nuovi, equipaggiamento visibile, Scappatori che lavorano
- PWA installabile: un codice per telefono e PC, offline-first
- Zero dipendenze runtime; canvas 2D puro; core di gioco DOM-free e testato

**Non-obiettivi (anti-goal)**
- Vero 3D / WebGL: tradirebbe la leggerezza
- Multiplayer, account, server: tutto è locale
- Pubblicità intrusive: solo il modello WellDiver (opzionale, mai bloccante)
- Pay-to-win: le monete reali non esistono; solo ads opzionali e donazioni

## Approcci considerati

| Decisione | Opzioni | Scelto | Perché |
|---|---|---|---|
| Vista | Flat 2D / **isometrico 2.5D** / 3D raycast / 3D vero | 2.5D | Leggibilità del top-down + profondità visiva; leggero |
| Timer | Cronometro astratto / **maschera** / nebbia che scende | Maschera | Diegetico, upgradeabile, la morte è sempre responsabilità del giocatore |
| Combattimento | Nessuno / **contatto con statistiche** / direzionale | Contatto | Zero nuovi controlli; i numeri dell'equipaggiamento fanno la differenza |
| Morte | Perdi tutto / **dimezzato** / salvi con ad | Dimezzato + ad opzionale | Tensione reale, mai punitivo ingiusto |

## Lore (il perché di tutto)

Il labirinto è **vivo**: è la tana del Minotauro, e reagisce agli intrusi. Sei un ladro
entrato per il suo tesoro. L'aria è velenosa — la tua **maschera** la filtra, ma il filtro
si consuma. Le chest sono l'accumulo del mostro; i mob-sentinelle sono creature nate dalle
sue mura. Gli **Scappatori** sono altri ladri fuggiti con te: scavano nei labirinti che hai
già visto anche mentre il gioco è chiuso. Ogni 5 livelli, un **luogotenente** presidia
l'ala: il Minotauro in persona nella prima (il Prato), poi i signori dei biomi profondi.

Quando la maschera si svuota: il labirinto ti ha preso. Il bottino di quella run si
dimezza — e un'offerta (guardare un annuncio) lo restituisce intero. Mai puniti due volte.

## Loop di gioco

```
RUN (30–90s)                    META (giorni/settimane)
┌──────────────┐  monete+tesori  ┌──────────────────┐
│ Corri, ruba, │────────────────▶│ Potenzia maschera, │
│ evita i mob  │◀────────────────│ equipaggiamento,   │
└──────────────┘    upgrade      │ recluta Scappatori │
       ▲                         └──────────────────┘
       └──── biomi nuovi = traguardi visivi ────┘
```

### Durante la run
- **Maschera** (timer): barra che si svuota. Ogni cella nuova la risparmia un soffio (+0,2s)
- **Tesori**: nei vicoli ciechi e nelle chest — raccolti, non pesano (zaino illimitato finché non upgradi il contrario)
- **Mob**: sentinelle a contatto = scambio di colpi (la tua arma vs la loro resistenza)
- **Chest**: nei depositi — legno (monete), oro (tesori rari), ornata (equipaggiamento/donazioni)
- **Uscita**: incassi tutto. Maschera vuota: bottino dimezzato, offerta ad per salvarlo

### Dopo la run
- **Vendita**: i tesori diventano monete (auto, con riepilogo soddisfacente)
- **Scappatori**: lavorano offline; la produzione = quantità × livello × amore (nutrirli)
- **Skill tree**: potenziamenti permanenti (già esistente, si estende)

## Economia

| Valuta | Si ottiene | Si spende |
|---|---|---|
| **Monete** | Vendita tesori, run vinte | Potenziamenti, reclutare Scappatori |
| **Tesori** | Chest e mob rari | Venduti in monete; i rari sbloccano cosmetiche |
| **Donazioni** | Certificate nelle chest ornate | Pool visibile: milestone → donazioni reali dell'autore |

## Biomi (traguardi visivi)

1. **Prato incantato** (start) — siepi, fiori, sole
2. **Caverne** — cristalli, funghi bioluminescenti
3. **Galassia** — il fondo: cielo stellato sotto i piedi

Ogni bioma cambia palette, decorazioni e luogotenente. Il primo Minotauro resta il boss
del Prato; i successivi sono i suoi pari, non copie.

## Piattaforma

PWA: manifest, service worker, icone. Installabile su telefono (home screen, fullscreen)
e desktop. Un solo codice. Offline-first già in essere: si completa con il service worker.

## Priorità di implementazione

1. **Fase 1 — Il cuore**: maschera come timer, morte con dimezzamento, vendita botino
2. **Fase 2 — L'economia**: monete, skill tree estesa, prima chest
3. **Fase 3 — Gli Scappatori**: idle, nutrimento, amore
4. **Fase 4 — I biomi**: Prato → Caverne → Galassia, con luogotenenti
5. **Fase 5 — PWA completa**: manifest, service worker, installazione

## Vincoli tecnici (invariati)

- Zero dipendenze runtime; TypeScript; core di gioco DOM-free
- Mobile-first 360px; `npm test` verde prima di ogni push
- Direct commit su `main` consentiti dal proprietario
