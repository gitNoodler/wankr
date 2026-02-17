import { getRestoreScrollTop } from '../src/components/SpectatorView/scrollRestore.js';

const tests = [
  { saved: 500, scrollHeight: 2000, clientHeight: 400, expected: 500, name: 'preserve position' },
  { saved: 2000, scrollHeight: 2000, clientHeight: 400, expected: 1600, name: 'clamp to maxScroll' },
  { saved: -100, scrollHeight: 2000, clientHeight: 400, expected: 0, name: 'clamp negative to 0' },
  { saved: 0, scrollHeight: 1000, clientHeight: 500, expected: 0, name: 'keep at top' },
];

let failed = 0;
for (const t of tests) {
  const got = getRestoreScrollTop(t.saved, t.scrollHeight, t.clientHeight);
  if (got !== t.expected) {
    console.error(`FAIL ${t.name}: expected ${t.expected}, got ${got}`);
    failed++;
  } else {
    console.log(`OK ${t.name}`);
  }
}
if (failed) process.exit(1);
console.log('Scroll restore tests passed.');
