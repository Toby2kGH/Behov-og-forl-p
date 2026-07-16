# SiV-verktøy

To verktøy for behovsbasert utvikling av pasientforløp (SiV × helsefellesskapet):

| Verktøy | Fil | Brukes til |
|---|---|---|
| **Forløpsbygger** | `forlopsbygger/index.html` | Kartlegge dagens forløp møte for møte i workshop; sette røde friksjonsflagg; simulere ny situasjon (verdistrøm) |
| **Behovsanalyse** | `behovsanalyse/index.html` | Løfte friksjon til behov → konsekvenser → tall → løsninger, med porter; lage rapporten til SSU |

**Flyt:** Workshop i Forløpsbyggeren → Eksporter JSON → Importer friksjonspunkter
i Behovsanalysen → analyser → Skriv ut rapport (PDF) til SSU.

**Åpne:** Dobbeltklikk på `index.html`, eller bruk den deployede lenken.
Data lagres lokalt i nettleseren din (localStorage) — del arbeid via
JSON-eksport, ikke ved å sende HTML-filen.

**Endre verktøyene:** Åpne denne mappen i Claude Code og beskriv endringen.
Claude Code leser `CLAUDE.md` for regler og arkitektur. Forløpssteg og
felles formater ligger i `felles/schema.json` — endres de, kjør `node sync.js`.

**Eier:** _(navn settes ved overlevering, høst 2026)_
