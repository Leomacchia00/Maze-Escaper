---
name: tilesets
description: >
  Come funzionano i tileset e come usarli davvero: atlas, terrain sets,
  autotiling (blob/Wang, marching squares, dual grid), transizioni tra
  terreni, convenzioni di griglia e integrazione con la generazione
  procedurale. Use when the task involves tilesets, tilemaps, autotiling,
  terrain transitions, sprite sheets for terrain, or "why does my tile art
  look wrong".
---

# Tileset: come funzionano davvero

Un tileset non è "un'immagine con dei pezzi": è un **contratto** tra tre cose —
la griglia dell'atlas, le convenzioni geometriche del rendering e i dati di
mappa. Quasi tutti i bug visivi ("i pezzi non combaciano", "c'è un bordo
strano", "le transizioni sono sbagliate") nascono dal mescolare convenzioni
incompatibili tra questi tre livelli. Questa skill definisce i concetti e le
regole per non sbagliare.

## Concetti fondamentali

### 1. Atlas e metadati

Un tileset è un'immagine (atlas) + metadati che la rendono interpretabile:

- **Tile size**: dimensione della cella in pixel (es. 16×16, 32×32). Deve
  coincidere con la dimensione logica usata dal motore.
- **Spacing/gutter**: pixel trasparenti tra i tile per evitare bleeding
  quando si usano filtri o compressione texture.
- **Margin**: bordo vuoto attorno all'atlas.
- **firstgid** (nomenclatura Tiled): l'ID del primo tile; gli ID sono
  consecutivi in ordine row-major (sinistra→destra, poi riga successiva).

Se importi un atlas da una fonte esterna, verifica SEMPRE questi parametri
prima di usarlo: la maggior parte degli errori ("il pavimento ha un pixel
sbagliato") è un problema di spacing/margin o di tile size errato.

### 2. Autotiling (perché serve)

Disegnare a mano ogni combinazione di bordi tra terreni è impraticabile.
L'autotiling sceglie automaticamente quale variante di tile disegnare in base
ai vicini. Le tre famiglie principali (fonte: [Excalibur.js — Dual Tilemap
Autotiling Technique](https://excaliburjs.com/blog/Dual%20Tilemap%20Autotiling%20Technique/)):

| Tecnica | Come funziona | Costo |
|---|---|---|
| **Blob / bitmask** | Ogni tile guarda i 4 vicini ortogonali + 4 diagonali (8 bit → 256 casi, ridotti a ~47 unici) | Ricco visivamente, ma 47+ varianti da disegnare e mappare |
| **Marching squares** | Solo 4 vicini ortogonali (N/E/S/W) → 16 casi | Semplice, ma meno varietà nei bordi |
| **Wang tiles** | Bordini/angoli codificano la transizione | Elegante, ma ogni terreno aggiunge varianti |

### 3. Dual grid: la tecnica moderna

Invece di un atlante con 47 varianti, si disegna la logica su una griglia e i
**vertici** tra le celle diventano i punti di decisione grafica. Il rendering
usa una griglia **offset di mezzo tile** rispetto alla griglia logica; ogni
cella di rendering copre gli angoli di 4 celle logiche e sceglie la grafica in
base a quelle 4 (fonti: [jess::codes — dual grid
tilemap](https://github.com/jess-hammer/dual-grid-tilemap-system-godot),
[Excalibur blog](https://excaliburjs.com/blog/Dual%20Tilemap%20Autotiling%20Technique/)).

Vantaggi:

- Serve solo **1 tile per tipo di terreno + poche varianti di transizione**
  (non 47).
- La logica di gioco (collisioni, pathfinding) resta separata dalla grafica.
- Le transizioni sono automaticamente coerenti in tutte le direzioni.

Svantaggi: richiede di pensare la mappa come "griglia logica + griglia
visiva" e di gestire correttamente l'offset di mezzo tile.

### 4. Terrain sets (Godot 4)

In Godot 4 i "terrain sets" sono il meccanismo nativo di autotiling: definisci
un set di terreno (es. "grass", "stone"), assegni a ogni variante dell'atlas
quali vicini richiede (peering bits), e il motore sceglie la variante giusta
(fonte: [Godot docs — Using
TileSets](https://docs.godotengine.org/en/stable/tutorials/2d/using_tilesets.html)).
Non serve per questo repo (canvas 2D custom), ma il **modello mentale è lo
stesso**: ogni tile dichiarato con "in quali condizioni compare".

## Regole pratiche

1. **Prima l'atlas, poi la logica.** Scegli (o disegna) l'atlas con un
   layout noto e documentalo: quante colonne, quante righe, cosa rappresenta
   ogni cella. Non inventare layout a runtime.
2. **Una sola fonte di verità per la griglia.** La dimensione della cella
   logica (es. 48 px nel canvas) e la dimensione dell'atlas (es. 16×16) sono
   cose diverse: usa un solo fattore di scala e non rimescolare.
3. **Separa logica e visual.** La griglia logica (dove sono muri, pavimenti,
   pickup) è indipendente dalla grafica; la grafica la si sovrappone. Questo
   permette di cambiare tileset senza toccare la logica.
4. **Transizioni = varianti.** Se un terreno confina con un altro, servono
   varianti grafiche (bordo, angolo interno, angolo esterno). Non provare a
   "disegnare sopra" con overlay ad hoc: genera artefatti.
5. **Valida visivamente con screenshot.** Dopo ogni modifica a tileset o
   rendering, fai uno screenshot e controlla: bordi continui, nessun pixel
   fuori posto, nessun "salto" tra celle adiacenti.
6. **Non mescolare pack incompatibili.** Pack diversi hanno scale, palette e
   convenzioni di griglia diverse; mescolarli produce incoerenza visiva.

## Errori comuni (e come evitarli)

- **Bordi tagliati o "zaccati"**: tile size o spacing sbagliati nell'atlas.
- **Transizioni mancanti**: si è usata una sola variante invece di gestire i
  bordi con varianti dedicate.
- **Offset sbagliati**: la griglia logica e quella visiva sono sfalsate di
  mezzo tile (o di un pixel) senza volerlo.
- **Artefatti di compressione**: file PNG salvati con ottimizzazione aggressiva
  che sfuma i colori piatti tipici del pixel art.

## Come si applica in questo repo

- La mappa è generata proceduralmente (vedi `src/dungeon.ts`); le celle sono
  pavimento/muro. Il rendering è in `src/render.ts`, con l'atlas caricato da
  `assets/tiles.png`.
- Quando aggiungi tile o varianti:
  1. Decidi prima il **layout dell'atlas** (quale cella = quale stato).
  2. Aggiorna il rendering per puntare alle celle giuste.
  3. Verifica visivamente con uno screenshot prima di considerare la
     modifica completa.

## Fonti verificate

- [Godot docs — Using TileSets](https://docs.godotengine.org/en/stable/tutorials/2d/using_tilesets.html) — terrain sets, peering bits, autotiling.
- [Godot docs — TileMapLayer](https://docs.godotengine.org/en/stable/tutorials/2d/using_tilemaps.html) — come i layer mappano le celle.
- [Excalibur.js — Dual Tilemap Autotiling Technique](https://excaliburjs.com/blog/Dual%20Tilemap%20Autotiling%20Technique/) — dual grid, transizioni, algoritmo passo-passo.
- [jess::codes — dual grid tilemap system (Godot)](https://github.com/jess-hammer/dual-grid-tilemap-system-godot) — implementazione di riferimento del dual grid.
- [Oskar Stålberg — Townscaper / Bad North](https://twitter.com/OskSta) — autore della tecnica dual-grid usata in produzione.
