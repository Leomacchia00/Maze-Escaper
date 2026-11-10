# Maze Escaper — Roadmap completa

> Fonte di verità per il futuro del progetto. Aggiornata a **v0.4.0** (commit `3c888e4` + docs).
> La SPEC originale (`SPEC.md`) descrive la v1 storica (punteggio/tempo): il gioco è evoluto verso
> **maschera-aria + bottino + casse**; per il futuro vale questo documento.

---

## Visione

**Sei un esploratore con una maschera che filtra la nebbia velenosa di un dungeon-labirinto.
Saccheggi casse, eviti le creature della nebbia e torni all'uscita prima che finisca l'aria.**

Loop incrementale stile WellDiver:

```
run (1-3 min) → bottino → monete → skill / shop / pet → run più profonde → …
                                    └─ pet idle: monete anche offline ─┘
```

## Pillars (non negoziabili)

1. **Run brevi con tensione**: aria che scende + pericoli attivi. Ogni run è "un po' più" della precedente.
2. **Esplorazione vera**: labirinti serpeggianti, vicoli ciechi ricompensati, orientamento che è una skill.
3. **Meta che attacca**: skill tree, shop, pet idle con "amore" — sempre un motivo per rientrare.
4. **Allegria** (design "Prato Soleggiato") + **lore benefica** (donazioni simboliche finché la v2 non è realizzabile).
5. **Zero attrito**: PWA installabile, offline-first, zero dipendenze runtime, mobile 360px + desktop.

## Stato attuale (v0.4) — cosa c'è, cosa manca

| Area | Stato | Gap verso la visione |
|---|---|---|
| Dungeon | ✅ rooms-and-mazes con vicoli ciechi e anelli, 21→61, stanze 3-7 | landmark per seed, stanze speciali riconoscibili |
| **Camera** | ❌ **tutto il dungeon sempre visibile** (11px/cella a 61) | **camera che segue + fog of war + mini-mappa** |
| Movimento | ✅ libero, cerchio vs celle, slide per assi | juice (squash, hit-stop) |
| Pericolo | ⚠️ solo l'aria che scende | **nemici, boss di bioma** |
| Bottino | ✅ casse 3 tipi, tesori, donazioni simboliche, payout dimezzato | rarità animata, consumabili in-run |
| Meta | ✅ 9 skill (840 monete totali) | **shop, pet idle, statistiche/streak** — le monete "muoiono" dopo le skill |
| Audio | ❌ zero | Web Audio sintetizzato (zero deps) |
| Biomi | ⚠️ solo palette | mob/decor/rischio per bioma |
| Persistenza | ✅ v4 + migrazione | v5 per shop/pet |
| PWA/deploy | ✅ manifest+SW+Pages, push a ogni iterazione | — |

**Scoperta chiave di questa revisione**: il renderer disegna sempre l'intero dungeon
(`geoFor` adatta tutto al canvas). Con mappe fino a 61×61 l'esplorazione è compromessa
e qualunque nemico sarebbe banale da evitare. La camera precede quindi i nemici.

---

## Fasi

Ogni fase è indipendente, shippabile (push + Pages) e con test verdi prima del push.
Ordine = valore per il giocatore e dipendenze tecniche.

### Fase 5 — Camera, fog of war e mini-mappa *(fondamentale, prima dei nemici)*
**Perché**: l'esplorazione è il cuore richiesto ("dungeon maze, non solo stanze"); oggi si vede tutto.
**Cosa**:
- Camera centrata sul giocatore con clamp ai bordi; zoom a tile visibili ~48-64px (mobile) / ~40 (desktop).
- Fog of war *morbido* (coerente col mood allegro): celle mai viste quasi nascoste, viste ma fuori vista attenuate; uscita visibile solo da scoperta (o con bussola).
- Mini-mappa (angolo, celle `visited[]` già in `RunState`): pavimento esplorato + giocatore.
- Performance: il layer statico cachato diventa per-regione visibile; niente redraw di 61×61 celle per frame.
- **Skill da leggere**: `game-engine`, `performance-optimization`, `game-ui-ux`.
- **Fatto quando**: camera clampata testata (pura), fog deterministico dal `visited`, 60fps mobile plausibili (nessun draw di celle fuori viewport), 52+ test verdi.
- **Rischio**: riscrittura significativa di `render.ts` (layer cache statica legata alla camera).

### Fase 6 — Nemici: le creature della nebbia
**Perché**: oggi l'unica tensione è il timer; il dungeon è vuoto (ispirazione Twilight Forest).
**Cosa**:
- `src/mobs.ts` (puro, testabile): stati `patrol → chase → return`; detection a raggio con LOS semplice; patrol sui corridoi (bivi casuali deterministicamente seeded).
- Contatto: perde aria (es. −5s), i-frames ~1,5s, shake + popup. Niente game-over istantaneo: l'aria è già il vincolo.
- Spawn: mai vicino all'ingresso, densità cresce col livello; tipi per bioma (stessa AI, parametri diversi: velocità, raggio vista, danno).
- Rendering: entità interleave per riga già supportato; sprite AI con fallback procedurale.
- **Skill**: `game-engine` (AI/stati), `game-feel` (feedback danno), `procedural-gen` (spawn).
- **Fatto**: test su transizioni AI, i-frames, regole di spawn, determinismo col seed; bilanciamento playtest (aria persa per incontro ~5% della base).
- **Nota lore**: le creature *sono* la nebbia fatta carne — coerente con la maschera.

### Fase 7 — Economia profonda: shop, consumabili, pet (il gancio incrementale)
**Perché**: dopo le 9 skill (840 monete) le monete non servono più → loop morto.
**Cosa**:
- **Shop** (nuova schermata): consumabili per run — bomboletta d'aria (+15s), bussola (freccia verso l'uscita: già prevista in SPEC §12), mappa del piano (rivela mini-mappa completa). Prezzi crescenti, consumati alla run.
- **Pet "Scappatori"**: sbloccabili con monete; generano monete offline (calcolo da timestamp al load, cap per sessione); "amore" (nutrimento con monete) moltiplica la loro velocità — modello WellDiver.
- **Save v5 + migrazione** da v4 (skill: `save-systems`).
- Statistiche home: run giocate/vinte, streak, casse totali, donazioni.
- **Fatto**: migrazione v4→v5 testata; offline earning deterministico e cap-pato; sink di monete permanente.

### Fase 8 — Boss di bioma (stile Twilight Forest)
**Perché**: obiettivo memorabile ogni ~5 livelli; chiude l'arco di ogni bioma.
**Cosa**:
- Stanza-boss riconoscibile alla generazione; boss con pattern semplici (carica, evocare sacche di nebbia densa che consuma aria extra).
- Vittoria → sblocco bioma successivo + bottino grande + badge in home.
- Un boss per bioma (Prato/Caverne/Galassia), sprite AI dedicati.
- Dipende da: Fase 5 (camera) e 6 (sistema mob).
- **Fatto**: boss testabile in logica pura (fasi, danni, condizione vittoria), spawn solo su livelli 5/10/15…

### Fase 9 — Audio e game feel (passata trasversale)
**Cosa**: Web Audio API sintetizzato (zero dipendenze, offline): passi, cassa, moneta, danno, vittoria/sconfitta, jingle boss; toggle audio persistito; juice (hit-stop su casse ornate, flash pickup, squash & stretch). Rispetta `prefers-reduced-motion`.
**Skill**: `game-feel`, `game-engine` (capitolo audio).

### Fase 10 — Beneficio reale e monetizzazione (v2 — decisione dedicata)
**Richiede infrastruttura esterna** (non compatibile con l'attuale "solo statico"):
dashboard trasparente delle donazioni, partnership verificate, eventuale SDK ads rewarded
(modello WellDiver/Freerice: bottino intero guardando un ad; sponsor che matcha le donazioni).
**Non si parte finché** il gioco non trattiene (retention) e non si decide l'infrastruttura.
Nel frattempo le donazioni restano simboliche in-game (già implementate).

### Fuori scope (decisioni già prese)
- ❌ Vista isometrica o 3D/raycasting — vinta la 3/4 ortogonale.
- ❌ Leaderboard/account online — confligge con offline-first; solo badge locali.
- ❌ Framework/dependenze runtime — TypeScript vanilla.
- ❌ Store packaging (TWA/Play Store) — rivalutare dopo Fase 7-8.

---

## Rischi tecnici da tenere a mente

1. **Camera + fog** riscrive il layer caching di `render.ts` → fare prima un spike e misurare su 61×61.
2. **Bilanciamento aria**: ogni aggiunta (danni, boss, consumabili) va calibrata su `baseAirForLevel`; tenere i moltiplicatori centralizzati.
3. **Migrazioni save**: ogni fase che tocca la persistenza aggiunge versione + migrazione testata (v4→v5→…).
4. **Core puro**: mob, shop, pet, boss devono restare moduli senza DOM (regola AGENTS.md) — i test li proteggono.
5. **Deploy**: `dist/` è committato; ogni push rigenera e verifica `npm test` prima del push (regola AGENTS.md).

## Regole operative (valide per ogni fase)

- Push su `main` a ogni iterazione + verifica deploy Pages (`gh run list --limit 1`).
- `npm test` verde prima di ogni push (oggi 52 test; minimo cresce a ogni fase).
- Leggere le skill indicate dalla tabella di `AGENTS.md` prima del task corrispondente.
- Copy in italiano, tono allegro e diretto.
