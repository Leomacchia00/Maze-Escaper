# plan.md — Base di progetto Maze Escaper

> **Documento vivo**: questa è la base condivisa da cui partiamo da ora in avanti.
> Ogni nuova iterazione aggiorna questo file (stato, roadmap, domande).
> Ultimo aggiornamento: dopo il commit buio dinamico (`8e27507`), test 73/73 verdi, deploy Pages verde.

---

## 1. Visione

**Maze Escaper** è un dungeon-maze incrementale "cozy" (stile *Prato Soleggiato*: allegro, pastello, ispirato a Pokémon / Stardew Valley), in italiano, giocabile da browser e installabile (PWA) su PC e mobile.

**Loop di gioco:**

```
run (1-3 min) → esplora dungeon a stanze → raccogli bottino (monete/gemme/casse)
  → combatti/evita creature → torna all'uscita prima che finisca l'aria
  → monete → skill tree / (futuro: shop, pet) → dungeon successivo più grande e più buio
```

**Pillars (non negoziabili):**
1. **Tensione gentile** — l'aria/maschera che scende + il buio che crescono creano urgenza senza frustrazione.
2. **Esplorazione vera** — buio, fog of war, mini-mappa: orientarsi è una skill.
3. **Meta che attacca** — skill tree oggi; domani shop, pet idle, prestige (stile WellDiver).
4. **Allegria** — pastello, tondo, cozy. Mai dark/tron.
5. **Zero attrito** — PWA offline, zero dipendenze runtime, mobile 360px + desktop.

---

## 2. Stato attuale

- **Commit:** `8e27507` (buo dinamico) + tuning luci in working tree.
- **Test:** 73/73 verdi (`npm test`).
- **Deploy:** GitHub Pages verde, service worker `maze-escaper-v5` (stale-while-revalidate sugli asset).
- **Rendering:** 2.5D ortogonale (vista Pokémon/Stardew), tileset procedurale 48px cozy pastello, player animato 4 direzioni.
- **Gameplay:** dungeon rooms-and-mazes (21→61), camera + fog of war + mini-mappa, buio dinamico `darknessForLevel(lvl) = min(0.92, 0.45 + (lvl-1)*0.06)` con buchi luce (player 2.6 celle, torce 1.8 flicker, portale pulsante), nemici patrol (slug/bat/wisp) con HP e bounty, attacco ad arco, monete/gemme raccoglibili, casse 3 tipi, donazioni simboliche, audio Web Audio synth, joystick virtuale mobile, skill tree 3×3.

---

## 3. Findings della ricerca (cosa dice il game design)

1. **"The core loop must feel good empty"** — camminare, combattere e raccogliere devono essere soddisfacenti *da soli*, prima di qualsiasi meta-progressione. (Jabali AI / idle design)
2. **Idle games**: premiano l'engagement senza richiedere attenzione costante; rispettano il tempo del giocatore (Machinations, Bugnet).
3. **Fog of war roguelike a 3 stati**: visibile / esplorato (dim) / mai visto. FOV ricalcolato a ogni mossa; **symmetric shadowcasting** (il raycast ingenuo dà visione "che lampeggia" asimmetrica).
4. **Levelup a metà dungeon**: i nemici restano uguali, è il giocatore a diventare più forte → sensazione di crescita costante.
5. **Pressione temporale = tensione**: un "clock" (la nostra aria/maschera) è il modo più pulito per creare urgenza.
6. **Meta idle**: meccaniche multiple che interagiscono, introdotte **gradualmente** (una alla volta, mai tutte insieme).
7. **Regola del prestige** (idle games): si ricomincia quando il prossimo milestone richiede più tempo di quanto ci metteresti a rifare da zero col bonus.
8. **Marcatore visivo di progresso**: il progresso deve vedersi (non solo numeri: il buio che arretra, luci più ampie, ecc.).
9. **Accessibilità**: opzioni anti-frustrazione (in idle: autoclick; per noi: es. difficoltà/buio opzionale).
10. **Dungeon crawler classico**: stanze speciali riconoscibili, casse di tipi diversi, passaggi segreti, boss per ambiente (ispirazione Twilight Forest).

**References grafiche**: Pokémon (prospettiva 3/4, tileset caldo), Stardew Valley (cozy, animazioni morbide), Anokolisa "Pixel Crawler" (palette pastello), WellDiver (loop incrementale + pet idle + ads soft).

---

## 4. Roadmap (priorità proposte)

| # | Fase | Contenuto | Stato |
|---|------|-----------|-------|
| 0 | Buio + luci | Buio crescente per livello, torce/portale bucano la nebbia | ✅ fatto |
| 1 | Feedback combattimento | hit-stop, shake, popup danno, knockback leggero | ⬜ prossimo |
| 2 | HP giocatore / salute | alternativa o complemento all'aria; kit medici dalle casse | ⬜ decisione (D2) |
| 3 | Boss per bioma | un boss per bioma (Prato/Caverne/Galassia), pattern semplici | ⬜ |
| 4 | Fog 3 stati sulla mini-mappa | visibile / esplorato dim / mai visto | ⬜ |
| 5 | Shop + sink monete | consumabili in-run (ricarica aria, torcia extra) oltre alle skill | ⬜ |
| 6 | Pet idle (stile WellDiver) | pet che raccolgono monete offline, "amore" da feeding | ⬜ |
| 7 | Prestige | restart con bonus quando conviene (regola del punto 7) | ⬜ |
| 8 | Audio file CC0 (Kenney) | sostituire/affiancare ai synth | ⬜ decisione D6 |
| 9 | Stanze speciali | stanze riconoscibili (tesoro, trappola, segreto) nel generatore | ⬜ |
| 10 | Polish grafico | juice, squash & stretch, particelle, transizioni bioma | ⬜ |

---

## 5. DOMANDE PER TE (da rispondere per definire il progetto)

> Rispondi anche solo con il numero e la scelta (es. "1B, 2A, …").

1. **Curva del buio**: ora parte da 0.45 e arriva a 0.92 (cap). Ti sembra giusto, o vuoi un inizio più dolce (es. 0.35) / una salita più lenta?
2. **Salita del giocatore**: vuoi che il giocatore abbia HP propri (oltre all'aria) con cure dalle casse, oppure resta "solo aria" e i nemici tolgono solo aria?
3. **Meta-monete**: oltre alle skill, vuoi uno shop/consumabili (ricarica aria, torce extra) come sink delle monete?
4. **Pet idle**: vuoi i pet stile WellDiver (raccolta offline + "amore" da feeding)? È la priorità o rimandiamo?
5. **Prestige**: vuoi un sistema di prestige (ricominciare con bonus) o per ora basta il progression lineare dei livelli?
6. **Audio**: teniamo i synth Web Audio (leggeri, zero asset) o integriamo i file CC0 di Kenney (più caldi, +peso)?
7. **Boss**: vuoi un boss per bioma (3 boss) come obiettivo di fine tier? Che feeling: puzzle, dps-race o evasione?
8. **Mappa**: crescita +2 per livello fino a 61 va bene, oppure preferisci salti più grandi (es. 21→35→51→71)?
9. **Nemici**: aggiungiamo più specie e comportamenti (chase quando ti vedono, nemici veloci/tank)? Quali biomi dovrebbero avere quali nemici?
10. **Mini-mappa**: vuoi anche sulla mini-mappa i 3 stati (visibile/esplorato/mai visto) o resta semplice?
11. **Condizione di vittoria**: solo uscire vivi, oppure obiettivi extra per run (es. "apri 3 casse", "uccidi tutti") con ricompense?
12. **Joystick mobile**: ti va bene posizione/dimensione attuale (sotto a sinistra, R=36) o vuoi configurazione diversa?
13. **Lore del tempo/aria**: la lore scelta è "la maschera filtra la nebbia velenosa". La teniamo così o vogliamo una piccola narrazione introduttiva (schermata iniziale)?
14. **Donazioni beneficiarie**: teniamo le donazioni simboliche nelle casse come lore "buona"? Vuoi che siano tracciabili (es. contatore "X donazioni fatte")?

---

## Vincoli permanenti (da ogni iterazione)

- Push su GitHub + deploy Pages a ogni iterazione.
- In ogni risposta: comandi PowerShell completi da PowerShell vuoto per il server locale.
- `npm test` verde prima di ogni push; commit diretti su `main`.
- Zero dipendenze runtime; core testabile senza DOM; mobile 360px; copy italiano.
