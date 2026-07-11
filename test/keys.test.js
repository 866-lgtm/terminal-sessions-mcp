// Tests for named-key decoding and sendInput byte assembly.
// Runs against the compiled output: `npm test` (builds first, then node --test).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { decodeKey, buildInputData, NAMED_KEYS } = require('../dist/src/server/keys');

test('decodeKey: named keys', () => {
  assert.equal(decodeKey('Enter'), '\r');
  assert.equal(decodeKey('enter'), '\r'); // case-insensitive
  assert.equal(decodeKey('Tab'), '\t');
  assert.equal(decodeKey('Shift-Tab'), '\x1b[Z');
  assert.equal(decodeKey('Esc'), '\x1b');
  assert.equal(decodeKey('Escape'), '\x1b'); // alias
  assert.equal(decodeKey('Space'), ' ');
  assert.equal(decodeKey('Backspace'), '\x7f');
  assert.equal(decodeKey('Delete'), '\x1b[3~');
  assert.equal(decodeKey('Up'), '\x1b[A');
  assert.equal(decodeKey('Down'), '\x1b[B');
  assert.equal(decodeKey('Right'), '\x1b[C');
  assert.equal(decodeKey('Left'), '\x1b[D');
  assert.equal(decodeKey('Home'), '\x1b[H');
  assert.equal(decodeKey('End'), '\x1b[F');
  assert.equal(decodeKey('PageUp'), '\x1b[5~');
  assert.equal(decodeKey('PageDown'), '\x1b[6~');
});

test('decodeKey: function keys', () => {
  assert.equal(decodeKey('F1'), '\x1bOP');
  assert.equal(decodeKey('F5'), '\x1b[15~');
  assert.equal(decodeKey('F12'), '\x1b[24~');
});

test('decodeKey: Ctrl+letter (C-a..C-z)', () => {
  assert.equal(decodeKey('C-a'), '\x01');
  assert.equal(decodeKey('C-c'), '\x03');
  assert.equal(decodeKey('C-z'), '\x1a');
  assert.equal(decodeKey('C-C'), '\x03'); // case-insensitive
});

test('decodeKey: Meta/Alt (M-<char>)', () => {
  assert.equal(decodeKey('M-x'), '\x1bx');
  assert.equal(decodeKey('M-b'), '\x1bb');
  assert.equal(decodeKey('M-.'), '\x1b.');
});

test('decodeKey: unknown key throws with vocabulary', () => {
  assert.throws(() => decodeKey('Bogus'), /Unknown key 'Bogus'/);
  assert.throws(() => decodeKey('Bogus'), /enter/); // lists valid keys
  assert.throws(() => decodeKey('C-1'), /Unknown key/); // Ctrl only with letters
  assert.throws(() => decodeKey(''), /Unknown key/);
});

test('buildInputData: plain text appends Enter (\\r) by default', () => {
  assert.equal(buildInputData('ls -la'), 'ls -la\r');
  assert.equal(buildInputData('ls -la', undefined), 'ls -la\r');
  assert.equal(buildInputData('ls -la', true), 'ls -la\r');
});

test('buildInputData: appendNewline false sends text verbatim', () => {
  assert.equal(buildInputData('partial input', false), 'partial input');
  assert.equal(buildInputData('', false), '');
});

test('buildInputData: keys are decoded and appended after text', () => {
  assert.equal(buildInputData('hello', undefined, ['Enter']), 'hello\r');
  assert.equal(buildInputData('', undefined, ['C-c']), '\x03');
  assert.equal(buildInputData('', undefined, ['Esc', 'Down', 'Down']), '\x1b\x1b[B\x1b[B');
});

test('buildInputData: keys suppress the default Enter', () => {
  // With keys, the caller controls exact bytes — no implicit \r.
  assert.equal(buildInputData('text', undefined, ['Tab']), 'text\t');
  // ...unless appendNewline is explicitly true.
  assert.equal(buildInputData('text', true, ['Tab']), 'text\t\r');
  // Explicit false also respected.
  assert.equal(buildInputData('text', false, ['Tab']), 'text\t');
});

test('buildInputData: empty keys array behaves like no keys', () => {
  assert.equal(buildInputData('cmd', undefined, []), 'cmd\r');
  assert.equal(buildInputData('cmd', false, []), 'cmd');
});

test('buildInputData: multi-line text passes embedded newlines through verbatim', () => {
  assert.equal(buildInputData('line1\nline2', false), 'line1\nline2');
});

test('NAMED_KEYS: all names are lowercase (lookup contract)', () => {
  for (const name of Object.keys(NAMED_KEYS)) {
    assert.equal(name, name.toLowerCase());
  }
});
