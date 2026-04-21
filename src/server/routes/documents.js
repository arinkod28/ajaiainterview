const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query, run, get } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// List documents (owned + shared with me)
router.get('/', requireAuth, (req, res) => {
  const userId = req.session.userId;
  
  // Owned documents
  const owned = query(
    `SELECT d.*, u.username as owner_name, e.username as last_edited_by_name, 'owner' as access_type
     FROM documents d
     JOIN users u ON d.owner_id = u.id
     LEFT JOIN users e ON d.last_edited_by = e.id
     WHERE d.owner_id = ?
     ORDER BY d.updated_at DESC`,
    [userId]
  );

  // Shared with me
  const shared = query(
    `SELECT d.*, u.username as owner_name, e.username as last_edited_by_name, s.permission as access_type
     FROM documents d
     JOIN shares s ON d.id = s.document_id
     JOIN users u ON d.owner_id = u.id
     LEFT JOIN users e ON d.last_edited_by = e.id
     WHERE s.shared_with_id = ?
     ORDER BY d.updated_at DESC`,
    [userId]
  );

  res.json({ owned, shared });
});

// Create document
router.post('/', requireAuth, (req, res) => {
  const { title, content } = req.body;
  const id = uuidv4();

  run(
    'INSERT INTO documents (id, title, content, owner_id) VALUES (?, ?, ?, ?)',
    [id, title || 'Untitled Document', content || '', req.session.userId]
  );

  const doc = get('SELECT d.*, u.username as owner_name FROM documents d JOIN users u ON d.owner_id = u.id WHERE d.id = ?', [id]);
  res.status(201).json(doc);
});

// Get single document
router.get('/:id', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const docId = req.params.id;

  const doc = get(
    `SELECT d.*, u.username as owner_name, e.username as last_edited_by_name
     FROM documents d
     JOIN users u ON d.owner_id = u.id
     LEFT JOIN users e ON d.last_edited_by = e.id
     WHERE d.id = ?`,
    [docId]
  );

  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  // Check access
  const isOwner = doc.owner_id === userId;
  const share = get('SELECT * FROM shares WHERE document_id = ? AND shared_with_id = ?', [docId, userId]);

  if (!isOwner && !share) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Get shares for this document
  const shares = query(
    `SELECT s.*, u.email, u.username 
     FROM shares s 
     JOIN users u ON s.shared_with_id = u.id 
     WHERE s.document_id = ?`,
    [docId]
  );

  // Get attachments
  const attachments = query(
    'SELECT id, original_name, mime_type, size, created_at FROM attachments WHERE document_id = ?',
    [docId]
  );

  res.json({ 
    ...doc, 
    is_owner: isOwner,
    access_type: isOwner ? 'owner' : share.permission,
    shares, 
    attachments 
  });
});

// Update document
router.put('/:id', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const docId = req.params.id;
  const { title, content } = req.body;

  const doc = get('SELECT * FROM documents WHERE id = ?', [docId]);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  // Check write access
  const isOwner = doc.owner_id === userId;
  const share = get("SELECT * FROM shares WHERE document_id = ? AND shared_with_id = ? AND permission = 'edit'", [docId, userId]);

  if (!isOwner && !share) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const updates = [];
  const params = [];
  
  if (title !== undefined) {
    updates.push('title = ?');
    params.push(title);
  }
  if (content !== undefined) {
    updates.push('content = ?');
    params.push(content);
  }
  
  if (updates.length > 0) {
    updates.push('last_edited_by = ?');
    params.push(userId);
    updates.push("updated_at = datetime('now')");
    params.push(docId);
    run(`UPDATE documents SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  const updated = get(
    `SELECT d.*, u.username as owner_name, e.username as last_edited_by_name
     FROM documents d
     JOIN users u ON d.owner_id = u.id
     LEFT JOIN users e ON d.last_edited_by = e.id
     WHERE d.id = ?`,
    [docId]
  );
  res.json(updated);
});

// Delete document
router.delete('/:id', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const docId = req.params.id;

  const doc = get('SELECT * FROM documents WHERE id = ?', [docId]);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  if (doc.owner_id !== userId) {
    return res.status(403).json({ error: 'Only the owner can delete a document' });
  }

  run('DELETE FROM shares WHERE document_id = ?', [docId]);
  run('DELETE FROM attachments WHERE document_id = ?', [docId]);
  run('DELETE FROM documents WHERE id = ?', [docId]);

  res.json({ ok: true });
});

// Share document
router.post('/:id/share', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const docId = req.params.id;
  const { userEmail, permission } = req.body;

  const doc = get('SELECT * FROM documents WHERE id = ?', [docId]);
  if (!doc || doc.owner_id !== userId) {
    return res.status(403).json({ error: 'Only the owner can share a document' });
  }

  const targetUser = get('SELECT id FROM users WHERE email = ?', [userEmail]);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (targetUser.id === userId) {
    return res.status(400).json({ error: 'Cannot share with yourself' });
  }

  // Upsert share
  const existing = get('SELECT * FROM shares WHERE document_id = ? AND shared_with_id = ?', [docId, targetUser.id]);
  if (existing) {
    run('UPDATE shares SET permission = ? WHERE id = ?', [permission || 'edit', existing.id]);
  } else {
    run(
      'INSERT INTO shares (id, document_id, shared_with_id, permission) VALUES (?, ?, ?, ?)',
      [uuidv4(), docId, targetUser.id, permission || 'edit']
    );
  }

  const shares = query(
    `SELECT s.*, u.email, u.username 
     FROM shares s JOIN users u ON s.shared_with_id = u.id 
     WHERE s.document_id = ?`,
    [docId]
  );

  res.json({ shares });
});

// Remove share
router.delete('/:id/share/:shareId', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const docId = req.params.id;

  const doc = get('SELECT * FROM documents WHERE id = ?', [docId]);
  if (!doc || doc.owner_id !== userId) {
    return res.status(403).json({ error: 'Only the owner can manage shares' });
  }

  run('DELETE FROM shares WHERE id = ? AND document_id = ?', [req.params.shareId, docId]);
  
  const shares = query(
    `SELECT s.*, u.email, u.username 
     FROM shares s JOIN users u ON s.shared_with_id = u.id 
     WHERE s.document_id = ?`,
    [docId]
  );

  res.json({ shares });
});

module.exports = router;
