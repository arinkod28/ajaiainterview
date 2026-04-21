import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { api } from './api';

function htmlToMarkdown(html) {
  function convert(node) {
    if (node.nodeType === 3) return node.textContent;
    if (node.nodeType !== 1) return '';
    const ch = Array.from(node.childNodes).map(convert).join('');
    switch (node.tagName) {
      case 'H1': return `# ${ch}\n\n`;
      case 'H2': return `## ${ch}\n\n`;
      case 'H3': return `### ${ch}\n\n`;
      case 'P':  return `${ch}\n\n`;
      case 'STRONG': case 'B':  return `**${ch}**`;
      case 'EM':     case 'I':  return `*${ch}*`;
      case 'U':                 return `_${ch}_`;
      case 'S':                 return `~~${ch}~~`;
      case 'UL': return Array.from(node.children).map(li => `- ${convert(li).trim()}`).join('\n') + '\n\n';
      case 'OL': return Array.from(node.children).map((li, i) => `${i + 1}. ${convert(li).trim()}`).join('\n') + '\n\n';
      case 'LI': return ch;
      case 'BLOCKQUOTE': return ch.trim().split('\n').map(l => `> ${l}`).join('\n') + '\n\n';
      case 'HR': return `---\n\n`;
      case 'BR': return '\n';
      default:   return ch;
    }
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return convert(doc.body).trim();
}

const ToolbarIcon = ({ path, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {typeof path === 'string' ? <path d={path} /> : path}
  </svg>
);

function Toolbar({ editor }) {
  if (!editor) return null;

  const btnClass = (active) => `toolbar-btn ${active ? 'active' : ''}`;

  return (
    <div className="editor-toolbar">
      {/* Text type selector */}
      <select
        className="toolbar-select"
        value={
          editor.isActive('heading', { level: 1 }) ? 'h1' :
          editor.isActive('heading', { level: 2 }) ? 'h2' :
          editor.isActive('heading', { level: 3 }) ? 'h3' :
          'paragraph'
        }
        onChange={(e) => {
          const val = e.target.value;
          if (val === 'paragraph') {
            editor.chain().focus().setParagraph().run();
          } else {
            const level = parseInt(val.replace('h', ''));
            editor.chain().focus().toggleHeading({ level }).run();
          }
        }}
      >
        <option value="paragraph">Paragraph</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
      </select>

      <div className="toolbar-divider" />

      {/* Bold */}
      <button
        className={btnClass(editor.isActive('bold'))}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold (Ctrl+B)"
      >
        <ToolbarIcon path="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6zM6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
      </button>

      {/* Italic */}
      <button
        className={btnClass(editor.isActive('italic'))}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic (Ctrl+I)"
      >
        <ToolbarIcon path={<><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></>} />
      </button>

      {/* Underline */}
      <button
        className={btnClass(editor.isActive('underline'))}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Underline (Ctrl+U)"
      >
        <ToolbarIcon path={<><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></>} />
      </button>

      {/* Strikethrough */}
      <button
        className={btnClass(editor.isActive('strike'))}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
      >
        <ToolbarIcon path={<><path d="M16 4H9a3 3 0 0 0-3 3v0a3 3 0 0 0 3 3h6a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3H7"/><line x1="4" y1="12" x2="20" y2="12"/></>} />
      </button>

      <div className="toolbar-divider" />

      {/* Bullet list */}
      <button
        className={btnClass(editor.isActive('bulletList'))}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet List"
      >
        <ToolbarIcon path={<><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>} />
      </button>

      {/* Ordered list */}
      <button
        className={btnClass(editor.isActive('orderedList'))}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered List"
      >
        <ToolbarIcon path={<><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></>} />
      </button>

      <div className="toolbar-divider" />

      {/* Blockquote */}
      <button
        className={btnClass(editor.isActive('blockquote'))}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Quote"
      >
        <ToolbarIcon path={<><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z"/></>} />
      </button>

      {/* Horizontal rule */}
      <button
        className="toolbar-btn"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal Rule"
      >
        <ToolbarIcon path={<line x1="3" y1="12" x2="21" y2="12"/>} />
      </button>

      <div className="toolbar-divider" />

      {/* Undo */}
      <button
        className="toolbar-btn"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo (Ctrl+Z)"
      >
        <ToolbarIcon path={<><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></>} />
      </button>

      {/* Redo */}
      <button
        className="toolbar-btn"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo (Ctrl+Shift+Z)"
      >
        <ToolbarIcon path={<><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></>} />
      </button>
    </div>
  );
}

export default function Editor({ doc, docId, onUpdate, onRemoteUpdate, readOnly = false }) {
  const [saveStatus, setSaveStatus] = useState('saved');
  const saveTimerRef = useRef(null);
  const lastSavedContent = useRef(doc.content);
  const lastTypedAtRef = useRef(0);
  const isSavingRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Placeholder.configure({
        placeholder: 'Start typing...',
      }),
    ],
    content: doc.content || '',
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      if (readOnly) return;
      lastTypedAtRef.current = Date.now();
      setSaveStatus('unsaved');

      // Debounced auto-save
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        const html = editor.getHTML();
        if (html === lastSavedContent.current) return;

        isSavingRef.current = true;
        setSaveStatus('saving');
        try {
          await api.updateDoc(docId, { content: html });
          lastSavedContent.current = html;
          setSaveStatus('saved');
          onUpdate();
        } catch (err) {
          console.error('Save failed:', err);
          setSaveStatus('error');
        } finally {
          isSavingRef.current = false;
        }
      }, 800);
    },
  });

  // Update editor content when doc changes (switching documents)
  useEffect(() => {
    if (editor && doc.content !== undefined) {
      const currentContent = editor.getHTML();
      if (currentContent !== doc.content) {
        editor.commands.setContent(doc.content || '');
        lastSavedContent.current = doc.content;
        setSaveStatus('saved');
      }
    }
  }, [docId]); // Only re-run when docId changes

  // Poll for remote changes every 5 seconds
  useEffect(() => {
    if (!editor || readOnly) return;

    const id = setInterval(async () => {
      if (isSavingRef.current) return;
      if (Date.now() - lastTypedAtRef.current < 3000) return;

      try {
        const data = await api.getDoc(docId);
        const remote = data.content || '';
        if (remote !== editor.getHTML()) {
          editor.commands.setContent(remote, false); // false = skip onUpdate
          lastSavedContent.current = remote;
          onRemoteUpdate?.();
        }
      } catch {
        // Ignore transient poll failures
      }
    }, 5000);

    return () => clearInterval(id);
  }, [docId, editor]);

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const handleExportMd = useCallback(() => {
    if (!editor) return;
    const md = htmlToMarkdown(editor.getHTML());
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title || 'document'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [editor, doc.title]);

  const statusLabels = {
    saved: '✓ Saved',
    saving: 'Saving...',
    unsaved: 'Unsaved changes',
    error: '✕ Save failed',
  };

  return (
    <>
      {!readOnly && <Toolbar editor={editor} />}
      <div className="editor-header-status" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '4px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)'
      }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleExportMd}
          title="Export as Markdown"
          style={{ fontSize: '12px' }}
        >
          ↓ Export .md
        </button>
        {!readOnly && (
          <span className={`save-status ${saveStatus}`}>
            {statusLabels[saveStatus]}
          </span>
        )}
      </div>
      <div className="editor-container">
        <div className="editor-paper">
          <EditorContent editor={editor} />
        </div>
      </div>
    </>
  );
}
