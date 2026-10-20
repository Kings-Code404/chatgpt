'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ejs = require('ejs');

function listEjsFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listEjsFiles(fullPath) : fullPath.endsWith('.ejs') ? [fullPath] : [];
  });
}

const viewFiles = listEjsFiles(path.join(__dirname, '..', 'views'));

test('all EJS templates compile', () => {
  assert.ok(viewFiles.length > 0);
  for (const filename of viewFiles) {
    assert.doesNotThrow(() => ejs.compile(fs.readFileSync(filename, 'utf8'), { filename }), filename);
  }
});
