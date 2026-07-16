#!/usr/bin/env node
/*
 * Enkle tester for Behovsanalysens portlogikk og forløpssteg (oppgave 1).
 * Null avhengigheter — kjøres med:  node test/behovsanalyse.test.js
 *
 * Testen henter ut <script data-dc-script>-klassen fra HTML-filen og kjører
 * den slik dc-runtime gjør (new Function med DCLogic/React som argumenter),
 * med window.SIV_SCHEMA satt fra felles/schema.json. Da tester vi den FAKTISKE
 * koden som kjører i verktøyet — ikke en kopi.
 *
 * Dekker (jf. CLAUDE.md «Testkrav», den delen som gjelder etter oppgave 1):
 *  - A-komplett krever nå forløpssteg
 *  - forløpssteg leses fra schema (stegNavn/stegIndex/FORLOPSSTEG)
 *  - rapporten ordnes langs forløpsaksen (steg-rekkefølgen fra schema)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'behovsanalyse', 'index.html'), 'utf8');
const SCHEMA = JSON.parse(fs.readFileSync(path.join(ROOT, 'felles', 'schema.json'), 'utf8'));

// --- hent ut logikk-klassen ---
function extractDcScript(html) {
  // Den faktiske logikk-tag-en (ikke runtime-koden som nevner selektoren som streng).
  const m = /<script[^>]*\btype=["']text\/x-dc["'][^>]*\bdata-dc-script\b[^>]*>/.exec(html);
  if (!m) throw new Error('Fant ikke <script type="text/x-dc" data-dc-script> i HTML');
  const open = m.index + m[0].length;
  const close = html.indexOf('</script>', open);
  return html.slice(open, close);
}

// Minimal DCLogic-stubb: nok til å instansiere Component og kalle rene metoder.
class DCLogicStub {
  constructor() { this._state = this.state || {}; }
  setState(patch) {
    const next = typeof patch === 'function' ? patch(this._state) : patch;
    this._state = Object.assign({}, this._state, next);
  }
}

// window.SIV_SCHEMA slik sync.js injiserer det.
global.window = { SIV_SCHEMA: SCHEMA };

const src = extractDcScript(HTML);
const factory = new Function('DCLogic', 'StreamableLogic', 'React',
  src + '\n;return (typeof Component!=="undefined"&&Component)||undefined;');
const Component = factory(DCLogicStub, DCLogicStub, {});

// --- pytteliten test-runner ---
let passed = 0, failed = 0;
function ok(name, cond) {
  if (cond) { passed++; console.log('  ✓ ' + name); }
  else { failed++; console.error('  ✗ ' + name); }
}
function eq(name, a, b) { ok(name + ' (' + JSON.stringify(a) + ' === ' + JSON.stringify(b) + ')', a === b); }

const c = new Component();

// gyldig behov (A komplett) — med steg
function gyldig(extra) {
  return Object.assign({
    id: 'x', title: 'T', group: '', steg: 'vurdering',
    problemstilling: Component.af('noe skjer', 'sagt'),
    behov: [Component.bf('b1', 'pasient', 'trenger noe', 'antatt')],
    volum: '~2/dag', volumStatus: 'har', ansvar: 'SiV',
    konsekvenser: [], tall: [], losninger: []
  }, extra || {});
}

console.log('Forløpssteg fra schema:');
eq('FORLOPSSTEG har 9 steg', Component.FORLOPSSTEG().length, 9);
eq('stegNavn(utskrivning)', Component.stegNavn('utskrivning'), 'Utskrivning');
eq('stegNavn(ukjent) er tom', Component.stegNavn('finnesikke'), '');
ok('stegIndex(hjemme) < stegIndex(forstedogn)', Component.stegIndex('hjemme') < Component.stegIndex('forstedogn'));
ok('stegIndex(uvalgt) sist', Component.stegIndex('') > Component.stegIndex('forstedogn'));

console.log('A-komplett-porten krever forløpssteg:');
// aComplete returnerer truthy/falsy (ikke ren boolean) — vi sjekker truthiness.
ok('gyldig behov er A-komplett', !!c.aComplete(gyldig()));
ok('uten steg → IKKE A-komplett', !c.aComplete(gyldig({ steg: '' })));
ok('uten problemstilling → IKKE A-komplett', !c.aComplete(gyldig({ problemstilling: Component.af('') })));
ok('uten behovslinje → IKKE A-komplett', !c.aComplete(gyldig({ behov: [] })));
ok('volumStatus=hentes uten volum → A-komplett (steg satt)', !!c.aComplete(gyldig({ volum: '', volumStatus: 'hentes' })));

console.log('Standard-behovene har steg og er A-komplett:');
const defs = Component.defaults();
ok('alle standard-behov har steg', defs.every(n => !!n.steg));
ok('alle standard-behov er A-komplett', defs.every(n => c.aComplete(n)));

console.log('Rapport ordnes langs forløpsaksen:');
// scrambled steg-rekkefølge → skal sorteres til schema-rekkefølge, uplasserte sist, stabilt.
const scrambled = [
  { steg: 'forstedogn', i: 0 }, { steg: '', i: 1 }, { steg: 'hjemme', i: 2 },
  { steg: 'vurdering', i: 3 }, { steg: 'hjemme', i: 4 }
];
const sorted = scrambled.map((n, idx) => ({ n, idx }))
  .sort((a, b) => (Component.stegIndex(a.n.steg) - Component.stegIndex(b.n.steg)) || (a.idx - b.idx))
  .map(o => o.n.steg + '#' + o.n.i);
eq('sortert rekkefølge', sorted.join(','), 'hjemme#2,hjemme#4,vurdering#3,forstedogn#0,#1');

console.log('Del i to (oppgave 2):');
(() => {
  const orig = gyldig({
    id: 'norig', title: 'Stort behov', steg: 'vurdering',
    behov: [Component.bf('b1', 'pasient', 'x'), Component.bf('b2', 'parorende', 'y')],
    konsekvenser: [{ id: 'k1', text: 'kons1', rammer: {}, status: 'pastatt' }, { id: 'k2', text: 'kons2', rammer: {}, status: 'pastatt' }],
    tall: [{ id: 't1', text: 'tall1', status: 'bestilles', konsIds: ['k1'], behovIds: ['b1'], losIds: [] }]
  });
  let del = Component.delInit(orig, 'nny');
  eq('A starter med alle behovslinjer', del.a.behov.length, 2);
  eq('B starter tom', del.b.behov.length + del.b.konsekvenser.length + del.b.tall.length, 0);
  ok('B har ny id', del.b.id !== del.a.id);
  // flytt én behovslinje, én konsekvens og tallet til B
  del = Component.delFlytt(del, 'a', 'behov', 'b2');
  del = Component.delFlytt(del, 'a', 'konsekvenser', 'k2');
  del = Component.delFlytt(del, 'a', 'tall', 't1');
  const totalBehov = del.a.behov.length + del.b.behov.length;
  const totalKons = del.a.konsekvenser.length + del.b.konsekvenser.length;
  const totalTall = del.a.tall.length + del.b.tall.length;
  eq('ingen behovslinje mistet', totalBehov, 2);
  eq('ingen konsekvens mistet', totalKons, 2);
  eq('ingen tall mistet', totalTall, 1);
  eq('b2 havnet på B', del.b.behov[0].id, 'b2');
  // steg/tittel-kravet
  ok('lik steg + lik tittel → kan IKKE lukke', !Component.delKanLukkes({ steg: 'vurdering', title: 'Samme' }, { steg: 'vurdering', title: 'Samme' }));
  ok('ulik tittel → kan lukke', Component.delKanLukkes({ steg: 'vurdering', title: 'A' }, { steg: 'vurdering', title: 'B' }));
  ok('ulikt steg → kan lukke', Component.delKanLukkes({ steg: 'hjemme', title: 'Samme' }, { steg: 'vurdering', title: 'Samme' }));
})();

console.log('Friksjonsimport (oppgave 3):');
(() => {
  const eksport = {
    navn: 'Testforløp',
    faser: [{ id: 'fase1', navn: 'Fase 1' }, { id: 'fase2', navn: 'Fase 2' }, { id: 'faseX', navn: 'Egendefinert fase' }],
    moter: [
      { tittel: 'Møte A', fase: 'fase1', flagg: 'Pasienten venter for lenge' },
      { tittel: 'Møte B', fase: 'fase2', flagg: '' },
      { tittel: 'Møte C', fase: 'fase2', flagg: 'Info mangler' },
      { tittel: 'Møte D', fase: 'faseX', flagg: 'Ukjent fase-friksjon' }
    ]
  };
  const kort = Component.parseFriksjon(eksport);
  eq('antall utkast (kun møter med flagg)', kort.length, 3);
  eq('fase1 → varsling', kort[0].steg, 'varsling');
  eq('fase2 → vurdering', kort[1].steg, 'vurdering');
  ok('ukjent fase flagges (dialogkrav)', kort[2].ukjentFase === true && kort[2].steg === '');
  ok('kjent fase er ikke ukjent', kort[0].ukjentFase === false);
  // aksepterer også {forlop:[...]} og array
  eq('parser {forlop:[...]}', Component.parseFriksjon({ forlop: [eksport] }).length, 3);
  eq('parser array av forløp', Component.parseFriksjon([eksport]).length, 3);
})();

console.log('Innboks: arkiv + WIP (oppgave 6):');
(() => {
  const card = { id: 'i1', type: 'brukerhistorie', arkivert: false };
  ok('arkivering uten begrunnelse gjør ingenting', Component.arkiver(card, '   ').arkivert === false);
  const ark = Component.arkiver(card, 'ikke relevant nå');
  ok('arkivering med begrunnelse arkiverer', ark.arkivert === true && ark.arkivBegrunnelse === 'ikke relevant nå');
  const innboks = [{ id: 'a', arkivert: false }, { id: 'b', arkivert: false }, { id: 'c', arkivert: true }];
  eq('aktive teller ikke arkiverte', Component.innboksAktive(innboks).length, 2);
  eq('arkiverte telles', Component.innboksArkiverte(innboks).length, 1);
  ok('WIP: under grensen → ikke full', !Component.wipOver([{ arkivert: false }], 15));
  const femten = []; for (let i = 0; i < 15; i++) femten.push({ arkivert: false });
  ok('WIP: ved grensen (15) → full', Component.wipOver(femten, 15));
})();

console.log('Grooming: «sagt» får kilde (oppgave 6):');
(() => {
  // En behovslinje groomet fra brukerhistorie har sitat i kilde → 'sagt' er lovlig.
  const groomet = Component.bf('bg', 'pasient', 'trenger x for å y', 'sagt', { kilde: { sitat: 'Jeg klarer ikke å ...', note: '', arena: 'morgenmøte', dato: '2026-03-01', innboksIds: ['i1'] } });
  ok('groomet linje kan være «sagt» (har sitat)', Component.kanVaereSagt(groomet));
  const uten = Component.bf('bu', 'pasient', 'noe', 'sagt');
  ok('«sagt» uten kilde er ulovlig (kilde mangler)', !Component.kanVaereSagt(uten));
  // belagt auto: et 'har'-tall koblet til linja gir provDisp 'belagt'
  const need = { tall: [{ status: 'har', behovIds: ['bx'] }] };
  eq('koblet har-tall → belagt (auto)', Component.provDisp(need, { id: 'bx', prov: 'antatt' }), 'belagt');
  eq('uten har-tall → beholder prov', Component.provDisp({ tall: [] }, { id: 'bx', prov: 'antatt' }), 'antatt');
})();

console.log('Trinn 4 — mobilisering (oppgave 4):');
(() => {
  ok('<2 aktører → aktørlandskap ikke ok', !Component.t4LandskapOk({ aktorlandskap: [{ aktor: 'SiV', side: 'siv' }] }));
  ok('2 fra samme side → ikke ok', !Component.t4LandskapOk({ aktorlandskap: [{ aktor: 'A', side: 'siv' }, { aktor: 'B', side: 'siv' }] }));
  ok('2 fra hver side → ok', Component.t4LandskapOk({ aktorlandskap: [{ aktor: 'A', side: 'siv' }, { aktor: 'B', side: 'kommune' }] }));
  // trinn 4 er alltid probe: losMissing på trinn 4 uten probe-felt inkluderer probe-krav
  const t4 = { trinn: 4, kunnskap: 'probe', linjeeier: 'X', landingssone: 'Y', revurdering: '2026-01-01', malepunkt: '', stopp: '', finans: 'Z', aktorlandskap: [{ aktor: 'A', side: 'siv' }, { aktor: 'B', side: 'kommune' }] };
  const miss = c.losMissing(t4);
  ok('trinn 4 krever målepunkt + stopp (probe)', miss.indexOf('målepunkt') !== -1 && miss.indexOf('stopp/videre') !== -1);
  // terskelport
  const needFremtid = { tall: [{ id: 't1', verdi: '10' }], terskel: { tallId: 't1', retning: 'under', verdi: '5', dato: '2999-01-01' } };
  ok('terskel før frist → nedtelling, ikke åpen', Component.terskelStatus(needFremtid).open === false && Component.terskelStatus(needFremtid).dager > 0);
  const needForfaltIkkeNadd = { tall: [{ id: 't1', verdi: '10' }], terskel: { tallId: 't1', retning: 'under', verdi: '5', dato: '2000-01-01' } };
  ok('forfalt + mål ikke nådd (10 ikke < 5) → åpner trinn 4', Component.terskelStatus(needForfaltIkkeNadd).open === true);
  const needForfaltNadd = { tall: [{ id: 't1', verdi: '3' }], terskel: { tallId: 't1', retning: 'under', verdi: '5', dato: '2000-01-01' } };
  ok('forfalt + mål nådd (3 < 5) → porten åpner ikke', Component.terskelStatus(needForfaltNadd).open === false);
  // beskyttet veddemål — eksklusivitet
  const needs4 = [
    { id: 'n1', losninger: [{ trinn: 4, beskyttet: true, utfall: '' }] },
    { id: 'n2', losninger: [{ trinn: 4, beskyttet: true, utfall: 'lagt ned' }] }
  ];
  const aktiv = Component.aktivtBeskyttet(needs4);
  ok('kun ett aktivt beskyttet (avsluttet teller ikke)', aktiv && aktiv.needId === 'n1');
  ok('avsluttet beskyttet frigir slotten', Component.aktivtBeskyttet([{ id: 'x', losninger: [{ trinn: 4, beskyttet: true, utfall: 'videreført' }] }]) === null);
})();

console.log('\n' + passed + ' passerte, ' + failed + ' feilet.');
process.exit(failed ? 1 : 0);
