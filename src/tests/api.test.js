const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');

const BASE = 'http://localhost:3001/api';

// We need a cookie jar for session persistence
let sessionCookie = '';
let aliceDocId = '';
let bobSessionCookie = '';

async function req(path, options = {}) {
  const headers = {
    ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    ...(options.cookie ? { Cookie: options.cookie } : {}),
  };

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    body: options.body && typeof options.body === 'object' && !(options.body instanceof FormData)
      ? JSON.stringify(options.body)
      : options.body,
  });

  // Capture set-cookie
  const setCookie = res.headers.get('set-cookie');

  const data = await res.json().catch(() => null);
  return { status: res.status, data, setCookie };
}

describe('DocEdit API', () => {

  describe('Auth', () => {
    it('should reject invalid credentials', async () => {
      const { status } = await req('/auth/login', {
        method: 'POST',
        body: { email: 'wrong@test.com', password: 'wrong' },
      });
      assert.strictEqual(status, 401);
    });

    it('should login with valid credentials', async () => {
      const { status, data, setCookie } = await req('/auth/login', {
        method: 'POST',
        body: { email: 'alice@demo.com', password: 'password123' },
      });
      assert.strictEqual(status, 200);
      assert.ok(data.user);
      assert.strictEqual(data.user.email, 'alice@demo.com');
      assert.strictEqual(data.user.username, 'Alice');
      sessionCookie = setCookie?.split(';')[0] || '';
    });

    it('should return current user with session', async () => {
      const { status, data } = await req('/auth/me', { cookie: sessionCookie });
      assert.strictEqual(status, 200);
      assert.strictEqual(data.user.email, 'alice@demo.com');
    });

    it('should reject unauthenticated requests', async () => {
      const { status } = await req('/auth/me');
      assert.strictEqual(status, 401);
    });
  });

  describe('Documents', () => {
    it('should create a document', async () => {
      const { status, data } = await req('/documents', {
        method: 'POST',
        body: { title: 'Test Document', content: '<p>Hello world</p>' },
        cookie: sessionCookie,
      });
      assert.strictEqual(status, 201);
      assert.ok(data.id);
      assert.strictEqual(data.title, 'Test Document');
      aliceDocId = data.id;
    });

    it('should list documents', async () => {
      const { status, data } = await req('/documents', { cookie: sessionCookie });
      assert.strictEqual(status, 200);
      assert.ok(Array.isArray(data.owned));
      assert.ok(data.owned.length >= 1);
    });

    it('should get a specific document', async () => {
      const { data } = await req(`/documents/${aliceDocId}`, { cookie: sessionCookie });
      assert.strictEqual(data.title, 'Test Document');
      assert.strictEqual(data.content, '<p>Hello world</p>');
      assert.strictEqual(data.is_owner, 1);
    });

    it('should update a document', async () => {
      const { data } = await req(`/documents/${aliceDocId}`, {
        method: 'PUT',
        body: { title: 'Updated Title', content: '<h1>Updated</h1>' },
        cookie: sessionCookie,
      });
      assert.strictEqual(data.title, 'Updated Title');
    });

    it('should preserve formatting in content', async () => {
      const richContent = '<h2>Heading</h2><p><strong>Bold</strong> and <em>italic</em></p><ul><li>Item 1</li><li>Item 2</li></ul>';
      await req(`/documents/${aliceDocId}`, {
        method: 'PUT',
        body: { content: richContent },
        cookie: sessionCookie,
      });
      const { data } = await req(`/documents/${aliceDocId}`, { cookie: sessionCookie });
      assert.strictEqual(data.content, richContent);
    });
  });

  describe('Sharing', () => {
    it('should login as Bob', async () => {
      const { data, setCookie } = await req('/auth/login', {
        method: 'POST',
        body: { email: 'bob@demo.com', password: 'password123' },
      });
      assert.strictEqual(data.user.username, 'Bob');
      bobSessionCookie = setCookie?.split(';')[0] || '';
    });

    it('should deny Bob access to Alice\'s doc before sharing', async () => {
      const { status } = await req(`/documents/${aliceDocId}`, { cookie: bobSessionCookie });
      assert.strictEqual(status, 403);
    });

    it('should allow Alice to share with Bob', async () => {
      const { status, data } = await req(`/documents/${aliceDocId}/share`, {
        method: 'POST',
        body: { userEmail: 'bob@demo.com', permission: 'edit' },
        cookie: sessionCookie,
      });
      assert.strictEqual(status, 200);
      assert.ok(data.shares.length >= 1);
      assert.ok(data.shares.some(s => s.email === 'bob@demo.com'));
    });

    it('should allow Bob to access shared doc', async () => {
      const { status, data } = await req(`/documents/${aliceDocId}`, { cookie: bobSessionCookie });
      assert.strictEqual(status, 200);
      assert.strictEqual(data.access_type, 'edit');
      assert.strictEqual(data.is_owner, 0);
    });

    it('should show shared doc in Bob\'s list', async () => {
      const { data } = await req('/documents', { cookie: bobSessionCookie });
      assert.ok(data.shared.some(d => d.id === aliceDocId));
    });

    it('should allow Bob to edit the shared doc', async () => {
      const { status } = await req(`/documents/${aliceDocId}`, {
        method: 'PUT',
        body: { content: '<p>Bob was here</p>' },
        cookie: bobSessionCookie,
      });
      assert.strictEqual(status, 200);
    });

    it('should not allow Bob to delete Alice\'s doc', async () => {
      const { status } = await req(`/documents/${aliceDocId}`, {
        method: 'DELETE',
        cookie: bobSessionCookie,
      });
      assert.strictEqual(status, 403);
    });

    it('should allow Alice to remove share', async () => {
      // First get the share ID
      const { data: docData } = await req(`/documents/${aliceDocId}`, { cookie: sessionCookie });
      const bobShare = docData.shares.find(s => s.email === 'bob@demo.com');
      assert.ok(bobShare);

      const { data } = await req(`/documents/${aliceDocId}/share/${bobShare.id}`, {
        method: 'DELETE',
        cookie: sessionCookie,
      });
      assert.ok(!data.shares.some(s => s.email === 'bob@demo.com'));
    });
  });

  describe('Cleanup', () => {
    it('should delete the test document', async () => {
      const { status } = await req(`/documents/${aliceDocId}`, {
        method: 'DELETE',
        cookie: sessionCookie,
      });
      assert.strictEqual(status, 200);
    });
  });
});
