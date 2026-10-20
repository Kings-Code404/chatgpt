'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const csrfProtection = require('../src/middleware/csrf');

function makeResponse() {
  return {
    locals: {},
    status(code) { this.statusCode = code; return this; },
    render(view, locals) { this.view = view; this.renderLocals = locals; return this; },
    json(body) { this.body = body; return this; }
  };
}

test('allows safe requests and creates a session token', () => {
  const req = { session: {}, method: 'GET', path: '/auth/login', get: () => undefined, body: {} };
  const res = makeResponse();
  let proceeded = false;
  csrfProtection(req, res, () => { proceeded = true; });
  assert.equal(proceeded, true);
  assert.match(req.session.csrfToken, /^[a-f0-9]{64}$/);
  assert.equal(res.locals.csrfToken, req.session.csrfToken);
});

test('accepts state-changing requests with the session token', () => {
  const token = 'a'.repeat(64);
  const req = { session: { csrfToken: token }, method: 'POST', get: () => token, body: {} };
  const res = makeResponse();
  let proceeded = false;
  csrfProtection(req, res, () => { proceeded = true; });
  assert.equal(proceeded, true);
});

test('rejects state-changing requests with a missing or invalid token', () => {
  const req = { session: { csrfToken: 'a'.repeat(64) }, method: 'POST', get: () => '', body: {}, accepts: type => type === 'html' ? 'html' : false };
  const res = makeResponse();
  csrfProtection(req, res, () => assert.fail('invalid request must not continue'));
  assert.equal(res.statusCode, 403);
  assert.equal(res.view, 'errors/403');
});
