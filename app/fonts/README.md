# Polices auto-hébergées

Ces polices étaient chargées depuis Google Fonts au moment du `next build`. Quand
Google ne répondait pas, la build Vercel échouait au hasard (`module-not-found` sur
`next/font/google`, constaté le 06/10/2026). Elles sont maintenant dans le dépôt et
chargées avec `next/font/local` : plus aucune dépendance réseau pendant la build.

| Fichier | Police | Sous-ensemble | Source |
| --- | --- | --- | --- |
| `bungee-latin-400-normal.woff2` | Bungee 400 | latin | `@fontsource/bungee` 5.3.0 |
| `sora-latin-wght-normal.woff2` | Sora (variable 100-800) | latin | `@fontsource-variable/sora` 5.3.0 |
| `jetbrains-mono-latin-wght-normal.woff2` | JetBrains Mono (variable 100-800) | latin | `@fontsource-variable/jetbrains-mono` 5.3.0 |

Licence : SIL Open Font License 1.1 (redistribution et auto-hébergement autorisés).
Le sous-ensemble « latin » couvre les caractères accentués du français.
