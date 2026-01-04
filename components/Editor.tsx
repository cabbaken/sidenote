import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import { Markdown } from 'tiptap-markdown';

interface EditorProps {
  content: string;
  fontSize: number;
  onChange: (content: string) => void;
}

const EditorComponent: React.FC<EditorProps> = ({ content, fontSize, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Typography,
      Markdown,
      Placeholder.configure({
        placeholder: 'Start typing your markdown note here...',
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none h-full min-h-[calc(100vh-200px)] py-6 px-8 cursor-text leading-normal prose-p:my-1 prose-headings:my-2',
        style: `font-size: ${fontSize}px`,
      },
    },
    onUpdate: ({ editor }) => {
      onChange((editor.storage as any).markdown.getMarkdown());
    },
  });

  // Sync content updates from outside (e.g. switching notes)
  useEffect(() => {
    if (editor && content !== (editor.storage as any).markdown.getMarkdown()) {
       editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Sync font size
  useEffect(() => {
    if (editor) {
      editor.setOptions({
        editorProps: {
          attributes: {
            class: 'prose dark:prose-invert max-w-none focus:outline-none h-full min-h-[calc(100vh-200px)] py-6 px-8 cursor-text leading-normal prose-p:my-1 prose-headings:my-2',
            style: `font-size: ${fontSize}px`,
          }
        }
      });
    }
  }, [fontSize, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="editor-container min-h-full w-full cursor-text" onClick={() => editor.chain().focus().run()}>
      <EditorContent editor={editor} className="min-h-full" />
    </div>
  );
};

export default EditorComponent;
