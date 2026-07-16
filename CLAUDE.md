# SiV-verktøy — Forløpsbygger + Behovsanalyse

To frittstående HTML-verktøy for arbeid med pasientforløp og behovsbasert
tjenesteutvikling ved Sykehuset i Vestfold (medisinsk klinikk) og
helsefellesskapet (Tønsberg m.fl.). Norsk språk i all UI og alle commits.

## Arkitekturprinsipper (ikke forhandlingsbare)

1. **Begge verktøy forblir enkeltstående HTML-filer uten byggverktøy.**
   Ingen npm-avhengigheter i selve verktøyene, ingen rammeverk-oppgradering,
   ingen server. React + runtime er allerede inlinet. De skal kunne åpnes
   med dobbeltklikk fra en filserver eller deployes som statiske filer.
2. **`felles/schema.json` er kilden til sannhet** for forløpssteg,
   konsekvens-/tallstatuser, trinnstigen og bro-formatet. Lag et lite
   Node-skript `sync.js` (kjøres manuelt: `node sync.js`) som injiserer
   schema-innholdet i begge HTML-filene mellom markørkommentarer
   `<!-- SCHEMA:START -->…<!-- SCHEMA:END -->`. Aldri rediger schema-data
   direkte i HTML-filene.
3. **Arbeidsdeling mellom verktøyene — unngå duplisering:**
   - *Forløpsbygger* = observasjon på MØTENIVÅ: dagens situasjon, verdistrøm
     (lead time/kontakttid), oppgaveflytting, røde friksjonsflagg.
     «Ny situasjon»-scenarioet brukes til å SIMULERE en valgt løsning på
     møtenivå — aldri til å beslutte den.
   - *Behovsanalyse* = analyse og beslutning på BEHOVSNIVÅ: A→K→T→B med
     porter, tallkjede, løsningstrinn, SSU-rapport.
   - Broen: friksjonsflagg (Forløpsbygger) → konsekvens-utkast (Behovsanalyse)
     via JSON, status «observert».
   - Ikke gjenskap verdistrøm/møtekartlegging i Behovsanalysen, og ikke
     legg konsekvens/tall/porter inn i Forløpsbyggeren.
4. **Portene skal HÅNDHEVES i kode, ikke bare beskrives.** Eksisterende
   portlogikk i Behovsanalysen (aComplete, trinn2Unlocked, trinn3Unlocked,
   losMissing) er fasit for stilen: rene funksjoner, hengelås-UI som alltid
   viser HVA som mangler. Tomme/ugjorte felt skal SYNES i rapporten —
   de er funn, ikke feil.

## Status: hva som allerede er på plass (verifisert i kode)

Behovsanalyse (`behovsanalyse/index.html`):
- A→K→T→B med porter: A krever problemstilling + ≥1 behovslinje + ansvar +
  volum (eller volumStatus 'hentes'); K låst til A; B låst til ≥1 konsekvens.
- Trinn 2 låst til omforent konsekvens ELLER konsekvens med har/bestilt tall.
- Trinn 3 låst til konsekvens med faktisk tall OG volumStatus ≠ 'hentes'.
- Løsning krever linjeeier, landingssone, revurderingsdato før «aktiv»;
  probe krever målepunkt + stopp/videre; trinn ≥2 krever finansiering/nedtak.
- Behovslinjer per aktør (pasient/pårørende/helsepersonell m/rolle/andre)
  med provenans sagt/antatt og «vet ikke».
- Konsekvenser med rammer (pasient/personell/system) og status
  omforent/påstått.
- Tall med status har/bestilles/finnesikke, kilde/eier/frist, og koblinger
  konsIds/behovIds/losIds (= tallkjeden behov→konsekvens→løsning).
- Rapport med synlige hull; bibliotek; trinn 0–3.

Forløpsbygger (`forlopsbygger/index.html`):
- Møter i faser med varighet, ventetid, kostnad, roller, bak-kulissene-
  oppgaver, informasjon «foreligger/hentes», «kan flyttes?», beslutninger
  med beslutningsgrunnlag, friksjonsflagg (rødt), dagens vs. ny situasjon,
  verdistrømtall, workshop-modus, JSON-eksport/-import, PDF.

## Bestilling: oppgaver i prioritert rekkefølge

### 1. Forløpssteg i Behovsanalysen (ryggraden)
- Obligatorisk felt per behov: forløpssteg (velges fra schema-listen).
  A er ikke komplett uten steg.
- Hjelpetekst ved valg: «Passer ikke behovet på ett steg? Da er det trolig
  to behov — bruk Del i to.»
- Oversiktsvisning: alle behov plottet langs forløpsaksen (ni steg som
  kolonner/svimlane, behovskort under sitt steg).
- Rapporten ordnes langs forløpsaksen (steg-rekkefølgen fra schema),
  ikke etter opprettelsesrekkefølge.

### 2. «Del i to»
- Knapp på behovskortet: kloner behovet, åpner en fordelings-dialog der
  bruker flytter behovslinjer, konsekvenser og tall mellom de to kortene.
- Krav: de to resulterende behovene må ha ulikt forløpssteg ELLER ulik
  tittel før dialogen kan lukkes.

### 3. JSON-bro fra Forløpsbygger
- Behovsanalysen får «Eksporter JSON» og «Importer …» (hele datasett), samt
  egen knapp «Importer friksjonspunkter (Forløpsbygger-JSON)».
- Import leser forlop[].moter[] der `flagg` er utfylt, oppretter
  konsekvens-UTKAST med ny tredje status `observert`
  («Observert i forløpskartlegging — ikke omforent», egen farge),
  kildeNote «Observert i møte: <tittel>», og steg via faseTilSteg-tabellen
  i schema. Ukjent fase → mapping-dialog der bruker velger steg.
- Importerte utkast legges på et valgt eksisterende behov ELLER i en
  «Innboks»-liste hvorfra de kan dras/knyttes til behov. Ingen konsekvens
  skal kunne oppstå «fra løse luften» uten kilde eller status.
- `observert` teller IKKE som `omforent` i trinn 2-porten (den teller som
  påstått inntil den omforenes).

### 4. Trinn 4 — Mobilisering / strukturell nyskaping
Dette trinnet dekker «helt nytenkning på tvers av aktørene» (eksempler:
kombinert eldrehjem + legevakt + KAD-observasjonsplass; felles
utskrivnings-/oppfølgingsenhet SiV + kommune). Regler:
- Trinn 3 beholder hintet «innenfor dagens struktur» (fjern «siste utvei»).
- Trinn 4-løsninger er ALLTID probe (kunnskap='probe' låst), aldri plan.
- Obligatorisk ekstra felt: **aktørlandskap** — liste av (aktør fra
  bibliotek + «hva må denne aktøren lykkes med»), minst to aktører,
  minst én fra hver side (SiV-side og kommune-side).
- Trinn 4 låses opp på én av to måter (begge implementeres):
  a) **Terskelport:** et koblet tall (konsIds/behovIds) med numerisk
     terskel + dato — «hvis <tall> ikke er under/over <terskel> innen
     <dato>, åpnes trinn 4 for dette behovet». Vises som nedtelling.
  b) **Beskyttet veddemål:** bruker kan manuelt åpne ETT trinn 4-veddemål
     totalt i hele datasettet uavhengig av porter (merkes «beskyttet
     veddemål»). Maks ett aktivt om gangen — velges et nytt, må det gamle
     avsluttes med utfall (videreført/lagt ned) først.
  Begrunnelse: en ren «kun hvis lavere trinn feiler»-port åpner aldri,
  fordi lavere trinn alltid «holder litt» — det dreper all fornyelse.
- Rapporten viser trinn 4-veddemål i egen seksjon med aktørlandskap,
  målepunkt, stoppkriterium og revurderingsdato.

### 5. Småting
- Konsekvensens «rammer»: legg til `parorende` (Pårørende) som avkryssing.
- Forløpsbyggeren: verifiser at `flagg` alltid følger med i JSON-eksporten
  (den skal), og legg faseTilSteg-mappingen synlig i eksport-dialogen.
- Behovsanalysen: behovslinje-provenans får tredje verdi `belagt`
  («belagt med tall») som settes AUTOMATISK når et tall med status 'har'
  kobles til linjen via behovIds — aldri manuelt.

## Testkrav
Skriv en liten testfil (Node + jsdom eller Playwright) som minimum dekker:
- portlogikken (A-komplett, K-lås, B-lås, trinn 2/3/4-opplåsing,
  «beskyttet veddemål»-eksklusivitet)
- friksjonsimport: gyldig eksportfil → riktig antall utkast, status
  'observert', riktig steg-mapping, ukjent fase → dialogkrav
- «Del i to»: fordeling bevarer alle linjer/konsekvenser/tall (ingenting
  mistes), og steg/tittel-kravet håndheves
Kjør testene før hver commit som rører portlogikk eller broen.

## Deploy
Vercel som statiske filer (`vercel.json` med to ruter: /forlop og /behov).
Ikke innfør autentisering eller database — data lever i localStorage per
bruker; deling skjer via JSON-eksport og PDF-rapporten.

## Eierskap
Verktøyene skal overleveres ved rollebytte høsten 2026. Hold README.md
oppdatert slik at en arvtaker uten utviklerbakgrunn kan: åpne verktøyene,
eksportere/importere JSON, skrive ut rapport, og be Claude Code om endringer
ved å peke på denne filen.
