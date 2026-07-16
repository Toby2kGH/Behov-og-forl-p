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

## Oppgave 6: Brukerhistorie-innboks (høsting, ikke portal)

Formål: Behov skal kunne spores tilbake til det pasienter, pårørende og
helsepersonell faktisk har sagt — ordrett — uten at verktøyet blir en åpen
innmeldingskanal. Verktøyet er fortsatt et analyseinstrument for et lite
team; høstingen skjer muntlig i eksisterende arenaer (morgenmøter,
vaktskifter, workshops, brukerrepresentanter i samarbeidsutvalg), og den
som høstet taster inn.

### 6.1 Utvid innboksen fra oppgave 3
Innboksen (som i dag tar imot friksjonspunkter fra Forløpsbygger-import)
utvides til å ta imot en andre korttype: **brukerhistorie**. Felles
innboks, to kilder, tydelig merket med opphav (chip: «friksjon» /
«brukerhistorie»).

### 6.2 Brukerhistorie-kortet
Felter (alle obligatoriske unntatt merket valgfri):
- **sitat** — ordrett hva personen sa. Fritekst. Hjelpetekst: «Skriv det
  de sa, ikke det du tolket.»
- **hvem** — aktørtype: pasient / pårørende / helsepersonell (m/ aktør+
  rolle fra bibliotek) / andre
- **høstet hvor/når** — arena (fritekst eller velger: morgenmøte,
  vaktskifte, workshop, samarbeidsutvalg, annet) + dato
- **tastet inn av** — navn
- **kontekst** (valgfri) — kort note

Ingen persondata om pasienten skal registreres: legg en fast, synlig
advarsel på kortet: «Ikke skriv navn, fødselsdato eller opplysninger som
kan identifisere pasient/pårørende.» Ingen felter for identitet skal
finnes.

### 6.3 Grooming-flyt (innboks → behov)
- Fra innbokskortet: «Knytt til behov …» (velger blant eksisterende) eller
  «Opprett nytt behov fra denne».
- Ved knytting opprettes en behovslinje på målbehovet der:
  - formuleringen fylles ut av bruker i behovsformatet
    («trenger [å kunne hva] for å [oppnå hva]»)
  - **originalsitatet følger med og vises side om side** med
    oversettelsen (ekspanderbart på behovslinjen), slik at oversettelsen
    er etterprøvbar
  - provenans settes AUTOMATISK til «sagt» — og kan ikke settes til
    «sagt» manuelt andre veier: «sagt» krever heretter et koblet sitat
    eller en eksplisitt kildeNote (hvem sa det, hvor). Eksisterende
    behovslinjer med provenans «sagt» uten kilde beholdes, men merkes
    «kilde mangler».
- Et innbokskort kan knyttes til flere behov (samme sitat kan belyse to
  behov), men beholder én kilde-post.
- Kort som vurderes irrelevante arkiveres med kort begrunnelse — aldri
  slettes. Arkivet er søkbart.

### 6.4 WIP-grense og forpliktelse
- Innboksen har en synlig WIP-grense (standard 15, konfigurerbar).
  Overskrides den, vises et tydelig banner: «Innboksen er full — groom
  før dere høster mer.» Ny registrering er fortsatt mulig (aldri blokker
  innsamling av det noen faktisk sa), men banneret består.
- Innboks-oversikten viser alder per kort (dager siden høstet) og
  fremhever kort eldre enn 30 dager. Begrunnelse: en høstingskanal uten
  synlig behandling brenner tillit — forsinkelsen skal være pinlig synlig.

### 6.5 Rapport
- Behovslinjer med koblet sitat viser sitatet i rapporten (kursiv, med
  arena og dato — aldri navn på den som sa det).
- Rapporten får en sluttseksjon «Ubehandlede innspill»: antall kort i
  innboks, eldste kort, antall arkiverte med begrunnelse. Dette er en del
  av leveransen til SSU, ikke noe som skjules.

### 6.6 Tester
- «sagt»-provenans kan ikke oppstå uten sitat/kildeNote.
- Grooming til to behov gir to behovslinjer, én kildepost.
- Arkivering krever begrunnelse; arkiverte kort telles i rapporten.
- WIP-banner utløses ved grensen; registrering blokkeres ikke.

### Avgrensning (skal IKKE bygges)
Ingen innmeldingsskjema for pasienter/pårørende, ingen delt lenke for
innmelding, ingen lagring utenfor localStorage. Hvis en digital
innmeldingskanal senere ønskes, er det en egen sak til linjen med eier,
DPIA og personvernombud — noter dette som kommentar øverst i koden for
innboks-modulen.

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
