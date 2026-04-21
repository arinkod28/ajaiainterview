const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const mammoth = require('mammoth');
const { run, get, query } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.txt', '.md', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}. Supported: .txt, .md, .docx`));
    }
  }
});

// Convert markdown to basic HTML
function markdownToHtml(md) {
  // Basic markdown conversion
  let html = md
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Unordered lists
    .replace(/^[*-] (.+)$/gm, '<li>$1</li>')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    // Paragraphs (lines that aren't already wrapped)
    .split('\n\n')
    .map(block => {
      block = block.trim();
      if (!block) return '';
      if (block.startsWith('<h') || block.startsWith('<li') || block.startsWith('<ul') || block.startsWith('<ol')) {
        // Wrap consecutive <li> items in <ul>
        if (block.includes('<li>')) {
          return `<ul>${block}</ul>`;
        }
        return block;
      }
      // Replace single newlines with <br> within paragraphs
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');

  return html;
}

// Upload file and create new document from it
router.post('/import', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const filePath = req.file.path;
    let content = '';
    let title = path.basename(req.file.originalname, ext);

    switch (ext) {
      case '.txt': {
        const text = fs.readFileSync(filePath, 'utf-8');
        content = `<p>${text.split('\n\n').join('</p><p>').replace(/\n/g, '<br>')}</p>`;
        break;
      }
      case '.md': {
        const md = fs.readFileSync(filePath, 'utf-8');
        content = markdownToHtml(md);
        break;
      }
      case '.docx': {
        const result = await mammoth.convertToHtml({ path: filePath });
        content = result.value;
        if (result.messages.length > 0) {
          console.log('Mammoth warnings:', result.messages);
        }
        break;
      }
    }

    // Create document
    const docId = uuidv4();
    run(
      'INSERT INTO documents (id, title, content, owner_id) VALUES (?, ?, ?, ?)',
      [docId, title, content, req.session.userId]
    );

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    const doc = get(
      'SELECT d.*, u.username as owner_name FROM documents d JOIN users u ON d.owner_id = u.id WHERE d.id = ?',
      [docId]
    );

    res.status(201).json(doc);
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: err.message || 'Failed to import file' });
  }
});

// Upload attachment to existing document
router.post('/attach/:docId', requireAuth, upload.single('file'), (req, res) => {
  try {
    const { docId } = req.params;
    const userId = req.session.userId;

    const doc = get('SELECT * FROM documents WHERE id = ?', [docId]);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const isOwner = doc.owner_id === userId;
    const hasEdit = get("SELECT * FROM shares WHERE document_id = ? AND shared_with_id = ? AND permission = 'edit'", [docId, userId]);
    if (!isOwner && !hasEdit) return res.status(403).json({ error: 'Access denied' });

    const attachId = uuidv4();
    run(
      'INSERT INTO attachments (id, document_id, filename, original_name, mime_type, size) VALUES (?, ?, ?, ?, ?, ?)',
      [attachId, docId, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size]
    );

    res.status(201).json({
      id: attachId,
      original_name: req.file.originalname,
      mime_type: req.file.mimetype,
      size: req.file.size
    });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
