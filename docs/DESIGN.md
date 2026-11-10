# Maze Escaper — Design System "Prato Soleggiato" v2

Riferimento di stile per sito e gioco. Il gioco è un dungeon-maze allegra:
niente dark-mode "tron", tutto caldo, luminoso e giocoso.

## Principi

1. **Allegria prima di tutto**: palette calda (crema, verde prato, giallo sole).
   Il gioco deve far sorridere chi lo apre.
2. **Un'azione primaria per vista**: "Gioca" (home) e "Riprova" (risultato)
   sono gli unici bottoni verdi pieni; tutto il resto resta neutro.
3. **Giocoso ma leggibile**: bottoni "toy" con bordo inferiore spesso (effetto
   pressa), pill HUD morbide, angoli molto arrotondati.
4. **Mobile-first**: tutto funziona a 360px; target touch ≥ 44px (i bottoni
   sono alti ≥ 52px); safe-area rispettata con `env(safe-area-inset-*)`.

## Token colore (styles.css `:root`)

| Token | Valore | Uso |
|---|---|---|
| `--bg-page` | `#fdf8ec` | sfondo pagina (crema caldo) |
| `--bg-surface` | `#ffffff` | card, pill, bottoni neutri |
| `--ink` | `#35402a` | testo primario (verde-moscio scuro) |
| `--ink-muted` | `#7a8465` | testo secondario, hint |
| `--green` | `#58b64c` | azione primaria, tema PWA |
| `--green-deep` | `#2e7d32` | bordo inferiore bottoni, titolo |
| `--sunny` | `#ffc93c` | focus ring, accento sole, anello medio icona |
| `--danger` | `#f87171` | barra aria critica |

Il canvas usa le stesse famiglie di colore tramite le palette `BIOMES` in
`src/render.ts` (Pavimento crema/verde, muri verde fresco, accent giallo sole).

## Biomi (palette canvas, `src/render.ts`)

| Bioma | Livelli | Pavimento | Muri | Accent |
|---|---|---|---|---|
| Prato Incantato | 1–5 | `#eaf6d8` / `#d9eec2` | verde `#7ed957` | giallo sole |
| Caverne Profonde | 6–10 | `#e7e0d2` / `#d8cfbd` | terra `#b08d5f` | ambra |
| Galassia | 11+ | `#e4e1f5` / `#d3cfee` | viola `#a78bfa` | rosa |

## Tipografia e spaziatura

- Un solo family: `ui-rounded, "SF Pro Rounded", "Segoe UI", system-ui` —
  arrotondato = giocoso, zero font esterni (offline-first).
- Titolo home 2.5rem peso 800, ombra gialla 3px (effetto adesivo).
- Valori che cambiano (aria, monete) con `font-variant-numeric: tabular-nums`.
- Raggi: 14px chip, 22px pannelli e canvas, 999px bottoni e pill.
- Ombre morbide `rgba(53,64,42,.12)`, mai nero puro.

## Motion & juice (skill game-feel)

- Il giocatore ha bob continuo; popup `+N💰` fluttuanti sulle casse aperte.
- Screen shake (trauma², decadimento) solo alla sconfitta.
- `prefers-reduced-motion` disattiva transizioni.
- HUD aggiornato solo quando il valore cambia (niente polling visivo).

## PWA

- `manifest.webmanifest` con `start_url: ./` (compatibile con GitHub Pages
  in sottocartella), icone 192/512 generate da `scripts/gen-icons.mjs`.
- Service worker (`sw.js`): network-first per HTML/JS/CSS (aggiornamenti subito visibili, fallback cache offline), cache-first per sprite/icone. La cache (`maze-escaper-v3`) va incrementata solo quando cambia la lista PRECACHE.
EOF
echo OK