# SiV-verktøy

To verktøy for behovsbasert utvikling av pasientforløp (SiV × helsefellesskapet):

| Verktøy | Fil | Brukes til |
|---|---|---|
| **Forløpsbygger** | `forlopsbygger/index.html` | Kartlegge dagens forløp møte for møte i workshop; sette røde friksjonsflagg; simulere ny situasjon (verdistrøm) |
| **Behovsanalyse** | `behovsanalyse/index.html` | Løfte friksjon til behov → konsekvenser → tall → løsninger, med porter; lage rapporten til SSU |

**Flyt:** Workshop i Forløpsbyggeren → Eksporter JSON → Importer friksjonspunkter
i Behovsanalysen → analyser → Skriv ut rapport (PDF) til SSU.

**Behovsanalysens faner:** Arbeidsflate (A→K→T→B med porter, «Del i to» av
behov, trinn 0–4 der trinn 4 er strukturell nyskaping på tvers av aktørene),
Forløpsoversikt (alle behov plottet langs de ni forløpsstegene), Innboks
(høsting av friksjonspunkter og brukerhistorier — intern kanal, ikke portal),
Bibliotek og Rapport.

**Innboks:** «Ny brukerhistorie» taster inn ordrett hva noen sa (uten
persondata). «Importer friksjonspunkter (Forløpsbygger-JSON)» henter røde
flagg fra en workshop. Kort groomes til behov; sitatet følger med og vises i
rapporten. WIP-grense og alder gjør etterslep synlig.

**Åpne:** Dobbeltklikk på `index.html`, eller bruk den deployede lenken.
Data lagres lokalt i nettleseren din (localStorage) — del arbeid via
JSON-eksport («Eksporter JSON» / «Importer datasett» i Innboks-fanen), ikke
ved å sende HTML-filen.

**Testene:** `node test/behovsanalyse.test.js` kjører portlogikk-, bro- og
innboks-testene (ingen avhengigheter). Kjør dem etter endringer i porter
eller broen.

**Endre verktøyene:** Åpne denne mappen i Claude Code og beskriv endringen.
Claude Code leser `CLAUDE.md` for regler og arkitektur. Forløpssteg og
felles formater ligger i `felles/schema.json` — endres de, kjør `node sync.js`.

**Eier:** _(navn settes ved overlevering, høst 2026)_
