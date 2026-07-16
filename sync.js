#!/usr/bin/env node
/*
 * sync.js — injiserer felles/schema.json i begge HTML-verktøyene.
 *
 * Kjøres manuelt:  node sync.js
 *
 * felles/schema.json er kilden til sannhet for forløpssteg, konsekvens-/
 * tallstatuser, trinnstigen og bro-formatet (se CLAUDE.md, prinsipp 2).
 * Dette skriptet leser schemaet og skriver det inn mellom markørene
 *   <!-- SCHEMA:START --> … <!-- SCHEMA:END -->
 * i behovsanalyse/index.html og forlopsbygger/index.html, som et globalt
 * objekt window.SIV_SCHEMA. Rediger ALDRI schema-data direkte i HTML-filene —
 * endre schema.json og kjør dette skriptet på nytt.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SCHEMA_PATH = path.join(ROOT, 'felles', 'schema.json');
const TARGETS = [
  path.join(ROOT, 'behovsanalyse', 'index.html'),
  path.join(ROOT, 'forlopsbygger', 'index.html')
];

const START = '<!-- SCHEMA:START -->';
const END = '<!-- SCHEMA:END -->';

function main() {
  const rawSchema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  // Valider at det faktisk er gyldig JSON før vi injiserer.
  const schema = JSON.parse(rawSchema);
  const pretty = JSON.stringify(schema, null, 2);

  const block =
    START + '\n' +
    '<script>window.SIV_SCHEMA = ' + pretty + ';</script>\n' +
    END;

  let changed = 0;
  for (const file of TARGETS) {
    if (!fs.existsSync(file)) {
      console.warn('  hopper over (finnes ikke): ' + path.relative(ROOT, file));
      continue;
    }
    const html = fs.readFileSync(file, 'utf8');
    const s = html.indexOf(START);
    const e = html.indexOf(END);
    if (s === -1 || e === -1 || e < s) {
      throw new Error(
        'Fant ikke markørene ' + START + ' … ' + END + ' i ' +
        path.relative(ROOT, file) + '. Legg dem inn i <head> først.'
      );
    }
    const next = html.slice(0, s) + block + html.slice(e + END.length);
    if (next !== html) {
      fs.writeFileSync(file, next);
      changed++;
      console.log('  oppdatert: ' + path.relative(ROOT, file));
    } else {
      console.log('  uendret:   ' + path.relative(ROOT, file));
    }
  }
  console.log('Ferdig — schema injisert i ' + changed + ' fil(er).');
}

main();
