# Skill importate

Skill vendorate in questo repo (formato `SKILL.md`, standard Agent Skills). Le usa qualsiasi agente lavori al progetto: leggi `AGENTS.md` alla radice per il routing "quale skill per quale task".

| Cartella | Fonte | Commit |
|---|---|---|
| `better-interface`, `better-ui`, `better-layout`, `better-typography`, `better-colors`, `better-accessibility`, `interface-review` | [jakubkrehel/skills](https://github.com/jakubkrehel/skills) | `659cc4e` |
| `frontend-design`, `webapp-testing` | [anthropics/skills](https://github.com/anthropics/skills) | `2c5958e` |
| `game-engine` | [github/awesome-copilot](https://github.com/github/awesome-copilot/tree/main/skills/game-engine) | `b13e55f` |
| `game-feel`, `game-ui-ux`, `procedural-gen`, `save-systems`, `input-systems`, `performance-optimization` | [gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) | `19d93f9` |

Licenze: MIT per jakubkrehel/skills (`LICENSE-jakubkrehel.txt`), Apache 2.0 per anthropics/skills (vedi `LICENSE.txt` dentro ogni cartella di quel repo), MIT per awesome-copilot e awesome-gamedev-agent-skills (vedi repo sorgente).

Non modificare i file importati: per adattarli, crea varianti in una cartella separata (`skills/local/`) e referenziale da `AGENTS.md`.
