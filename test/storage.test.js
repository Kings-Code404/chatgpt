'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const test = require('node:test');
const { getUploadRoot, resolveStoredFile } = require('../src/utils/storage');

test('resolves files inside the configured upload directory', () => {
  const root = path.join(os.tmpdir(), 'slwa-storage-test');
  const uploadRoot = getUploadRoot(root, 'uploads');
  const file = path.join(uploadRoot, 'lesson.pdf');
  assert.equal(resolveStoredFile(file, root, 'uploads'), file);
});

test('rejects paths outside the configured upload directory', () => {
  const root = path.join(os.tmpdir(), 'slwa-storage-test');
  assert.equal(resolveStoredFile(path.join(root, 'private.txt'), root, 'uploads'), null);
});

test('rejects the upload directory itself as a file', () => {
  const root = path.join(os.tmpdir(), 'slwa-storage-test');
  assert.equal(resolveStoredFile(path.join(root, 'uploads'), root, 'uploads'), null);
});
