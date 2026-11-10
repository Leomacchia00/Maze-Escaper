# Riferimenti — Maze Escaper

Raccolta di riferimenti per tutti gli elementi del gioco: grafica, ambientazione, movimento, esplorazione e meta-gioco. Da usare come bussola visiva e di design.

---

## 1. Grafica e stile visivo

### Giochi da studiare (vista 3/4 ortogonale)

| Gioco | Cosa guardare |
|---|---|
| **Stardew Valley** | Proporzioni personaggio vs tile, decorazione del pavimento, transizioni tra biomi, palette calde e allegra |
| **Pokémon (gen 3-5, GBA/NDS)** | Leggibilità: muri con faccia frontale, ombre sotto le entità, HUD minimale ma caratterizzato |
| **Enter the Gungeon** | Illuminazione dinamica in un dungeon, "juice" su ogni azione, ombre morbide che creano profondità su vista dall'alto |
| **The Binding of Isaac** | Stanze come "sacche" riconoscibili, ombreggiatura vignette ai bordi, chiarezza item pickup |
| **Crypt of the NecroDancer** | Come il ritmo dà personalità al movimento su griglia |
| **Dungeon Crawl Stone Soup** | Tile 32×32 in prospettiva 3/4 ortogonale — esattamente la nostra proiezione; ottimo per muri e pavimenti |

**Principio chiave (Enter the Gungeon / Isaac):** l'illusione di profondità su una vista dall'alto si crea con *shading* e ombre, non con la proiezione. La nostra vista 3/4 ortogonale ci dà già la faccia frontale dei muri: il resto viene da ombra sotto entità, vignette ai bordi e contrasto pavimento/muro.

### Tileset gratuiti per ispirazione (OpenGameArt / itch.io / CraftPix)

- [Top-down dungeon tileset Zelda-like 16×16 (OpenGameArt)](https://opengameart.org/content/top-down-dungeon-tileset)
- [Pixel Art Top-Down Dungeon (dustdfg, itch.io)](https://dustdfg.itch.io/pixel-art-top-down-dungeon)
- [Anokolisa — pack top-down 16×16 (500+ sprite, 3 eroi, 8 nemici)](https://anokolisa.itch.io/dungeon-crawler-pixel-art) — ottimo per capire come variare nemici con poco
- [Dungeon Crawl 32×32 tiles (OpenGameArt)](https://opengameart.org/content/dungeon-crawl-32x32-tiles) — 3000+ tile 3/4 ortogonale
- [CraftPix — Free 2D Top-Down Dungeon pack](https://craftpix.net/freebies/free-2d-top-down-pixel-dungeon-asset-pack)

> Nota: noi generiamo gli sprite con AI (connector Black Forest) + fallback procedurale, ma questi pack servono da riferimento per proporzioni, palette e leggibilità.

---

## 2. Creazione dei mondi e ambientazione

### Biomi (la nostra regola: un bioma = tileset + palette + mob + musica)

Da **Designing Game Worlds (Grasp)**: ogni bioma deve avere *tileset, musica e mostri propri*. I monti/fiumi/foreste non sono decorazione: sono **muri naturali** che creano choke point e guidano il percorso.

**Twilight Forest (mod Minecraft)** — il nostro riferimento principale per la lore del dungeon:
- **Progressione a cancelli**: ogni bioma ha un boss che sblocca il successivo (Naga → Lich → Idra…). Il boss sta *al centro* del suo bioma.
- **Stanze a tema**: Hedge Maze, Hollow Hills (colline-dome piene di minerali e mostri), torri ramificate. Le casse sono sparse *per tema*: nelle Hollow Hills trovi roba da viaggio, nelle torri roba magica.
- **Struttura vs esplorazione libera**: zone protette finché non uccidi il boss → idea replicabile con la nostra maschera: livelli "sigillati" finché non trovi l'uscita.
- Fonte: [Progression — Twilight Forest Wiki](http://benimatic.com/tfwiki/index.php/Progression)

**Binding of Isaac — generazione delle stanze** ([analisi di BorisTheBrave](https://www.boristhebrave.com/2020/09/12/dungeon-generation-in-binding-of-isaac/)):
- Floorplan su griglia 9×8, poi designazione di stanze speciali (tesoro, boss, negozio, segreta)
- Le stanze speciali sono *sempre riconoscibili*: da noi → stanze con cassa dorata/ornata, stanza dell'uscita, (futuro) stanza del negozio
- La segreta è *nascosta*: idea per livelli bonus con più bottino

### I nostri biomi (coerenza con docs/DESIGN.md)

| Bioma | Livelli | Mood visivo | Pericolo/lore |
|---|---|---|---|
| Prato Incantato | 1-5 | verde/giallo, allegro, fiori | il "tutorial" naturale |
| Caverne Profonde | 6-10 | terra/ambra, torce | aria più pesante → maschera consuma più? |
| Galassia | 11+ | viola/rosa, stelline | sogno/etere, gravità leggera |

---

## 3. Movimento e game feel

**Riferimento teorico:** Steve Swink, *Game Feel: A Guide to Virtual Sensation* (2008) — [panoramica Wikipedia](https://en.wikipedia.org/wiki/Game_feel). Le 6 aree: **input, response, context, polish, metaphor, rules**. Definizione: *"controllo in tempo reale di oggetti virtuali in uno spazio simulato, con interazioni enfatizzate dal polish"*.

**Celeste** è lo studio di caso perfetto (movimento 2D più celebrato in assoluto):
- Dash di 0,15s che percorre esattamente 5 larghezze del personaggio: **numeri precisi, non "a occhio"**
- *Coyote time* (~0,1s) e *input buffering* (~0,1s): il gioco perdona imperfezioni dell'input
- Ogni azione ha suono + particelle + (su controller) rumble — feedback **moltiplicato** su più canali

**Cosa applichiamo a Maze Escaper:**
1. **Coyote time analogo**: non abbiamo salti, ma il joystick mobile merita una dead-zone morbida (curva non lineare: micro-movimenti = passo lento, non stop/scatto)
2. **Numeri precisi**: velocità 4.5 celle/s, raggio 0.3 — documentarli e testarli (li abbiamo già in `game.ts`)
3. **Feedback multi-canal**: pickup cassa = popup moneta (✓) + shake leggero (✓) + manca **suono** e **flash** sul giocatore
4. **Anticipazione e follow-through**: il giocatore potrebbe "spingersi" leggermente oltre / squash & stretch quando cambia direzione repentina
5. **Hit-stop** (freeze di 30-50ms) all'apertura di una cassa ornata: rende il momento "pesante"

Fonti: [Guida completa al game feel (MyGameDesign)](https://mygamedesign.com/the-complete-guide-to-game-feel-making-games-that-feel-amazing-to-play), [Pichlmair & Johansen — Designing Game Feel survey (arXiv)](https://arxiv.org/pdf/2011.09201)

---

## 4. Esplorazione del labirinto

**Cosa rende memorabile l'esplorazione nei migliori dungeon:**

1. **Landmark e orientamento** (Zelda): ogni stanza/corridoio deve avere *un qualcosa* che lo rende riconoscibile — una decorazione, un colore, un'insidia. Nel nostro caso: decorazioni procedurali già presenti → rafforzarle con "landmark" unici per seed (una statua, un albero cavo).
2. **Rischi/ricompense sui vicoli ciechi** (Twilight Forest, Hollow Hills): i vicoli ciechi del nostro maze devono contenere le casse migliori. Regola: cassa ornata = vicolo cieco più profondo.
3. **Fog of war / memoria della mappa**: Stardew e Pokémon mostrano solo ciò che vedi; mini-mappe tipo Twilight Magic Map aiutano l'orientamento. Noi abbiamo `visited[]` — potremmo disegnare una mini-mappa delle celle esplorate.
4. **Tensione del ritorno**: l'uscita è raggiungibile ma l'aria scende — il labirinto "serpeggiante" (fattore winding > 1.2 già testato) fa sì che tornare indietro non sia mai banale.
5. **Progressione a cancelli** (Twilight Forest): biomi successivi sbloccati da vittorie → già implicito nel nostro sistema livelli.

---

## 5. Loop incrementale e meta-gioco

**Principi dall'analisi del genere** ([Machinations: idle games design](https://machinations.io/articles/idle-games-and-how-to-design-them), [TechGuide: anatomy of incremental games](https://techguide.com.au/news/internet-news/the-core-anatomy-of-an-incremental-game)):
- **Barriera d'ingresso bassissima** al core loop (una run = 1-2 minuti), meta-loop sofisticato sopra
- **Contatore visibile** di risorse/progressi (le stats chips della home vanno potenziata: streak, casse totali aperte, donazioni fatte)
- **Progresso offline / idle**: i pet "Scappatori" (ispirazione WellDiver) generano monete lentamente anche a gioco chiuso — dipende da quantità, livello e "amore" (feed)
- **Pacing della curva**: gli upgrade devono rallentare *appena abbastanza* da spingere verso la prossima scelta, senza punire
- **Ricompense variabili**: il loot roll (legno/oro/ornata 60/25/15) è già variable-ratio reinforcement — da mantenere e amplificare con animazioni di rarità

**Riferimenti incrementali da studiare**: Cookie Clicker (la referencia eterna), NGU Idle (sistemi indipendenti che si potenziano a vicenda), Idle Loops (run che si accodano), Gnorp Apologue (pulizia estrema della UI).

---

## Come usare questo documento

1. Prima di lavorare a una feature, rileggi la sezione corrispondente
2. Ogni fase del roadmap (nemici, shop, pet, audio) cita qui i riferimenti che la guidano
3. Aggiorna il documento quando scopri nuovi riferimenti o ne scarti alcuni (con motivo)
