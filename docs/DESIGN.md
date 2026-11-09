# Maze Escaper — Design System (v1)

Documento di riferimento per lo stile del sito. Deriva dalle skill vendorate in
`skills/better-colors`, `skills/better-typography`, `skills/better-layout` e
`skills/better-ui` (fonti in `skills/SOURCES.md`).

## Principi

1. **Due livelli di token**: primitive (ramp per hue) → semantici (ruolo).
   I componenti referenziano SOLO il livello semantico (`--color-*`, `--text-*`,
   `--space-*`). Le primitive non si usano mai direttamente nei componenti.
2. **Un accent, un significato**: un solo ramp accent (ciano). Un colore è usato
   per un solo scopo su tutta l'interfaccia.
3. **Una sola azione primaria per vista**: riempita di accent solo "Gioca"
   (lobby) e "Riprova" (risultato). I peer restano neutrali.
4. **Status solo se renderizzati**: `success` (vittoria, record, skill maxate)
   e `danger` (sconfitta, timer basso, reset). Niente ramp inutilizzati.

## Primitive (OKLCH)

| Ramp | Hue OKLCH | Note |
| --- | --- | --- |
| `--neutral-*` | 255 | Freddo, leggermente tendito verso l'accent (croma 0.006–0.03) |
| `--accent-*` | 205 | Ciano, ramp 300–700 |
| `--success-*` | 155 | ≥15° dall'accent |
| `--danger-*` | 25 | ≥175° dall'accent |

## Semantici (grammatica: `--color-{bg|text|border}-{variant}-{state}`)

| Ruolo | Token |
| --- | --- |
| Superfici | `--color-bg-page`, `--color-bg-surface`, `--color-bg-raised`, `--color-bg-sunken`, `--color-bg-scrim` |
| Testo | `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`, `--color-text-on-accent` |
| Bordi | `--color-border-subtle`, `--color-border-default`, `--color-border-strong`, `--color-focus-ring` |
| Accent | `--color-accent-subtle`, `--color-accent-border`, `--color-accent-solid`, `--color-accent-solid-hover`, `--color-accent-text` |
| Status | `--color-{success|danger}-{subtle|border|text}` |

## Scala tipografica

| Token | Size | Line-height | Weight | Uso |
| --- | --- | --- | --- | --- |
| `--text-display` | 2.25rem | 1.1 | 700 | Titolo brand, punteggio |
| `--text-title` | 1.5rem | 1.2 | 600 | h1, risultato, numeri grandi |
| `--text-heading` | 1.125rem | 1.3 | 600 | h1 di pagina, valori stat |
| `--text-body` | 1rem | 1.5 | 400 | Corpo, bottoni |
| `--text-caption` | 0.8125rem | 1.4 | 400 | Hint, label, chip |

Regole: `tabular-nums` sui valori che cambiano (timer, punteggi, monete);
letter-spacing `-0.01em`/`-0.02em` solo su titoli ≥24px, `0.06em` su etichette
uppercase piccole; peso ≥400 sotto 18px.

## Spaziatura e raggi

- Scala: `--space-1..8` = 4/8/12/16/24/32/48/64px. Il gap tra gruppi è ≥2× il
  gap dentro un gruppo.
- Raggi concentrici: `--radius-sm` 8px (interni), `--radius-md` 12px (bottoni,
  canvas result), `--radius-lg` 20px (pannelli con padding 16px).
- Bottoni: min-height 48px (44px per icone), insettati dai margini del layout.

## Regole di vista

- Una sola azione primaria per vista, riempita di accent.
- Controlli sempre distinti dal contenuto: background, bordo o zona dedicata.
- `:focus-visible` su ogni controllo interattivo; `prefers-reduced-motion`
  disattiva fade, blink e transizioni.
- Il canvas usa la stessa palette via costanti in `src/render.ts` (`COLORS`),
  allineate ai ramp accent/neutral.
