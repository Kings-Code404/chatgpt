'use strict';

const path = require('path');

function getUploadRoot(root = process.cwd(), configuredDir = process.env.UPLOAD_DIR || './uploads') {
  return path.resolve(root, configuredDir);
}

function resolveStoredFile(filePath, root = process.cwd(), configuredDir = process.env.UPLOAD_DIR || './uploads') {
  const uploadRoot = getUploadRoot(root, configuredDir);
  const absolutePath = path.resolve(root, filePath);
  const relativePath = path.relative(uploadRoot, absolutePath);
  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) return null;
  return absolutePath;
}

module.exports = { getUploadRoot, resolveStoredFile };
