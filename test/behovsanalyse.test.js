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

console.log('\n' + passed + ' passerte, ' + failed + ' feilet.');
process.exit(failed ? 1 : 0);
