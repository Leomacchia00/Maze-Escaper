# Come scegliere i tile — istruzioni

## I 3 fogli di contatto

1. **cont_dungeon.png** — tile dungeon (muri, pavimenti pietra, decorazioni)
2. **cont_floors.png** — pavimenti (erba, legno, pietra, acqua)
3. **cont_wall.png** — muri in mattoni (25x25 varianti)

## Come scegliere

Ogni tile ha un'etichetta gialla con le sue coordinate **riga,colonna**.

Rispondimi con un messaggio tipo:

```
Pavimento prato:    F0,1  e  F2,0
Pavimento dungeon:  D14,12  e  D14,14
Muro (faccia):      W2,4
Muro (cappello):    W12,0
```

(io le monto direttamente nell'atlas di gioco)

## Regole pratiche

- **Pavimenti**: scegli 2 varianti per bioma (una liscia + una decorata
  va benissimo) — vengono alternati a scacchiera
- **Muri**: servono 2 tile — la FACCIA (il mattone verticale che vedi
  di fronte) e il CAPPELLO (la parte scura vista dall'alto)
- Se un tile ti sembra vuoto o strano, non sceglierlo
- Gli oggetti (casse, torce, monete, portali, gemme) per ora restano
  quelli procedurali che hai già visto in gioco
