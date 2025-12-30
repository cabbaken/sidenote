import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownViewProps {
  content: string;
}

const MarkdownView: React.FC<MarkdownViewProps> = ({ content }) => {
  if (!content) {
    return <div className="text-gray-400 dark:text-gray-500 italic">No content to preview...</div>;
  }

  return (
    <div className="prose prose-sm prose-slate dark:prose-invert max-w-none prose-headings:text-gray-800 dark:prose-headings:text-gray-100 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-a:text-blue-600 dark:prose-a:text-blue-400">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-4 border-b pb-2 border-gray-200 dark:border-slate-700" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-xl font-semibold mb-3 mt-6 text-gray-800 dark:text-gray-100" {...props} />,
          h3: ({node, ...props}) => <h3 className="text-lg font-medium mb-2 mt-4 text-gray-800 dark:text-gray-200" {...props} />,
          p: ({node, ...props}) => <p className="mb-4 leading-relaxed" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4 space-y-1" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-4 space-y-1" {...props} />,
          blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500 pl-4 italic my-4 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-800/50 p-2 rounded-r" {...props} />,
          code: ({node, className, children, ...props}) => {
             const match = /language-(\w+)/.exec(className || '')
             const isInline = !match && !String(children).includes('\n');
             return isInline 
                ? <code className="bg-gray-100 dark:bg-slate-800 text-red-500 dark:text-red-400 px-1 py-0.5 rounded text-sm font-mono" {...props}>{children}</code>
                : <pre className="bg-gray-800 dark:bg-slate-950 text-gray-100 p-3 rounded-lg overflow-x-auto text-sm my-4 font-mono not-prose border border-gray-700 dark:border-slate-800"><code className={className} {...props}>{children}</code></pre>
          },
          a: ({node, ...props}) => <a className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer" target="_blank" rel="noopener noreferrer" {...props} />
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownView;