# Maze Escaper — Specifica di gioco (v1)

> **Nota (v0.4):** il gioco è evoluto rispetto a questa specifica: niente più "punteggio/tempo" — oggi c'è la maschera con l'aria, le casse con bottino e le skill. Le sezioni §2-5 sono superate; restano validi i pillar (§1), i criteri di qualità (§9) e l'idea della bussola (§12). Per il futuro fare riferimento a **`docs/ROADMAP.md`**.

Documento di base per lo sviluppo. Da usare come brief per l'agente di coding. La v1 è il **loop minimo onesto**: labirinto + timer + punteggio. Skill tree, oggetti speciali e donazioni entrano nelle fasi successive, ma la struttura va pensata per contenerli dal giorno uno.

## 1. Visione

Gioco web maze escaper ibrido con incremental. Ogni partita è "un po' di più della precedente": sessioni brevi con timer, labirinti che crescono in dimensione e difficoltà, meta-progressione con skill tree, e un'identità benefica — oggetti speciali "buoni regalo" che generano donazioni reali a enti benefici e badge visibili sull'hub del gioco.

- **Pillastro ludico**: run brevi (2–5 min) con tensione da timer e progressione tra le run.
- **Pillastro identitario**: giocare fa bene a qualcuno altro, in modo verificabile e trasparente.
- **Non negoziabile**: il sistema di donazioni resta nel progetto (fase dedicata, dopo la v1).
- **Motivazione**: modello "in cui tutti guadagnano qualcosa" — giocatore, enti benefici, sviluppatore.

## 2. Scope v1 (ciò che si costruisce ora)

### Dentro la v1 — ✅ IMPLEMENTATA (PR #1)
1. **Labirinto procedurale** generato a ogni run (algoritmo: perfect maze, recursive backtracker; no dead-end insolubili).
2. **Uscita** posizionata nel punto più lontano dall'ingresso (BFS sul maze generato).
3. **Timer di sessione**: la partita ha una durata massima (vedi §4). Il tempo residuo è la valuta principale del punteggio.
4. **Punteggio**: calcolato a fine run in base a tempo residuo, dimensione del labirinto ed efficienza del percorso (vedi §5).
5. **Progressione di difficoltà**: ogni run completata sblocca il livello successivo — labirinto più grande (griglia più ampia) e tempo leggermente più stretto rispetto alla dimensione.
6. **Persistenza locale**: livello raggiunto, miglior punteggio per livello, statistiche base (run giocate, vinte, perse). Salvataggio in `localStorage`.
7. **Tre schermate**: Home (menu + statistiche), Run (gioco), Risultato (punteggio + riepilogo).

### Fuori dalla v1 (fasi successive)
- ~~Skill tree e valuta meta~~ → **v1.1, in scope ora** (vedi §12).
- Oggetti speciali e "buoni regalo" benefici (v2).
- Hub con badge, leaderboard mensile, account/online (v2.1).
- Donazioni reali, sponsor, monetizzazione, ads (v2+, fase dedicata).
- Audio, effetti, animazioni complesse (v1 essenziale ma leggibile).

## 3. Struttura del labirinto

- Griglia quadrata NxN di celle con muri sui quattro lati.
- **Dimensioni per livello**: `N = 11 + (livello - 1) * 2`, con tetto a 41 (v1: livelli 1–15). Dispari per una generazione pulita.
- **Complessità visiva crescente**: dal livello 4 la vista si restringe (fog of war raggio di 3 celle; raggio 2 dal livello 8).
- **Uscita**: cella più lontana dall'ingresso per distanza di Manhattan (o BFS sul maze generato).
- Rappresentazione raccomandata: celle con bitmask dei muri (`N,S,E,W`), per rendering canvas e pathfinding veloce.

## 4. Timer

- **Tempo base**: funzione della dimensione, es. `tempo = N * 2.5` secondi (da calibrare in playtest; valore iniziale abbondante, si stringe con i livelli).
- Il timer **parte quando il giocatore fa il primo movimento**, non al caricamento.
- **Bonus tempo in-run** (preparazione per gli oggetti): ogni cella visitata per la prima volta aggiunge +0,2 s. In v1 è una meccanica di esplorazione pura.
- **Fine run**: uscita raggiunta = vittoria; tempo scaduto = sconfitta (il labirinto resta visibile per la revisione).

## 5. Punteggio

```
punteggio = (tempo_residuo * 10) + (N * N) + bonus_efficienza
bonus_efficienza = (celle_totali - celle_visitate) * 5   // solo se positivo
```

- Il punteggio premia: labirinti grandi, vittorie rapide, percorsi efficienti.
- **Record per livello** salvato in `localStorage` e mostrato in Home e Risultato.
- In futuro: questo punteggio diventa la base della valuta meta (§7, §12).

## 6. Controlli e input

- **Desktop**: frecce / WASD. Movimento cella-per-cellla (no sliding), con risposta immediata.
- **Mobile**: swipe nella direzione. Griglia adattiva al viewport, canvas ridimensionabile.
- Pausa con `Esc` o tap sul pulsante pausa (in pausa il labirinto si oscura per evitare lo studio gratis del percorso).

## 7. Modello dati (v1.1, estendibile per il futuro)

```typescript
interface PlayerState {
  level: number;                        // livello corrente
  bestScores: Record<number, number>;   // per livello
  stats: { runs: number; wins: number; losses: number };
  currency: number;                     // valuta meta (v1.1: guadagnata dalle run)
  skills: Record<string, number>;       // nodi skill sbloccati: id -> livello (v1.1)
  // FASI FUTURE (non implementare ora, solo tenere il tipo):
  // charityTokens: Record<string, number>; // badge/oggetti benefici trovati (v2)
}
```

## 8. Architettura raccomandata

- **Tipo**: web app statica, zero dipendenze dove possibile, offline-first.
- **Rendering**: `<canvas>` 2D per il labirinto; UI (home/risultato) in DOM normale.
- **Linguaggio**: TypeScript vanilla, nessun framework necessario in v1.
- **Moduli**: `maze.ts` (generazione), `game.ts` (loop e stato di run), `render.ts` (canvas), `storage.ts` (persistenza), `ui.ts` (schermate), `skills.ts` (v1.1: skill tree e valuta meta).
- Il core (`maze.ts`, `skills.ts`, calcolo punteggio, stato) deve essere **puro e testabile** senza DOM: prima la logica, poi la grafica.

## 9. Criteri di "fatto" (verificabili, non dichiarabili)

1. Completare una run vinta e una persa: entrambe mostrano la schermata risultato corretta. ✅
2. Chiudere e riaprire il browser: livello, record e statistiche sono intatti (localStorage). ✅
3. Un labirinto generato è sempre risolvibile (test automatico: BFS ingresso→uscita su 100 labirinti generati). ✅
4. Il gioco è giocabile con la sola tastiera e con il solo swipe su mobile. ✅
5. Nessun layout rotto a 360px di larghezza (mobile-first). ✅
6. Il punteggio mostrato corrisponde alla formula (test automatico del calcolo). ✅

## 10. Fasi future (per contesto)

- **v1.1 — Skill tree** ✅ (in scope, vedi §12): valuta meta dalle run, nodi (tempo extra, visione, timer lento, bussola).
- **v2 — Oggetti speciali e "buoni regalo"**: oggetti nel labirinto legati a enti benefici (es. caschetto da vigile del fuoco). Al ritrovamento il sito devolve l'importo all'ente. Serve: dashboard donazioni pubblica, ricevute, partenariati con enti verificabili, regole anti-abuso.
- **v2.1 — Hub e badge**: profilo con badge per categoria, leaderboard mensile "più buono" con premio.
- **Monetizzazione**: da decidere dopo che la v1 trattiene; direzione preferita: rewarded ads + sponsor matched-donations (modello Freerice/Gamindo), no pay-to-win.

## 11. Fonti di ispirazione e vincoli

- Loop di riferimento: Lost in Labyrinth (maze run-based browser); modello benefico: Freerice, Gamindo (dettagli nel canvas di ricerca competitor).
- Trasparenza donazioni obbligatoria quando la v2 esiste (Codice del Terzo Settore: rendicontazione pubblica delle raccolte fondi).
- Il caschetto da vigile del fuoco e le categorie di enti sono esempi: la scelta finale degli enti è aperta.

## 12. v1.1 — Skill tree e valuta meta (ricerca dal web)

Principi emersi dalla ricerca (r/incremental_games, r/gamedesign, GDKeys, devlog di maze rogue-lite):

- **Pochi nodi, impatto reale**: meglio pochi upgrade che cambiano come si gioca la run, non piccoli bonus percentuali incrementali ("numbers go up" è la critica più comune).
- **Trade-off leggibile**: visione vs velocità è la scelta centrale nei maze con fog of war (meccanica provata: "Players must choose whether to upgrade their Vision or their Speed to handle the darkness").
- **L'ordine conta**: l'ordine di acquisto dei nodi deve cambiare come si gioca la run, non solo quanto è facile.
- **Costi crescenti, niente rimborsi** nel loop principale: sbagliare un acquisto non deve essere catastrofico, ma non si "rivende".

### Nodo per nodo (3 livelli ciascuno)

| Nodo | Effetto per livello | Requisito |
|---|---|---|
| **Tempo extra** | +5% sul tempo base della run (`baseTime *= 1 + 0.05 * lvl`) | — |
| **Timer lento** | il tempo scorre il 5% più lento (`dt *= 1 - 0.05 * lvl`) | Tempo extra ≥ 1 |
| **Visione** | +1 al raggio del fog of war | — |
| **Bussola** | freccia verso l'uscita sempre visibile sul canvas | Visione ≥ 1 |

Due rami (Tempo / Visione) con prerequisiti interni: l'ordine di acquisto all'interno di un ramo cambia il feel della run.

### Valuta

- **Guadagno**: vittoria → `10 + livello * 2` monete; sconfitta → 2 monete (sempre qualcosa, mai zero).
- **Costi per nodo**: livello 1 = 20, livello 2 = 50, livello 3 = 120 (crescenti; un ramo completo costa 190).
- La valuta è persistita in `localStorage` insieme a livello, record e statistiche.
