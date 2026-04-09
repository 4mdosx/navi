'use client'

import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-inside mb-2 space-y-1 ml-2">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-inside mb-2 space-y-1 ml-2">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="ml-1 leading-relaxed">{children}</li>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-lg font-bold mb-3 mt-4 first:mt-0 text-foreground">
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-base font-bold mb-2 mt-4 first:mt-0 text-foreground">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-sm font-semibold mb-2 mt-3 first:mt-0 text-foreground">
      {children}
    </h3>
  ),
  h4: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="text-sm font-semibold mb-1.5 mt-2.5 first:mt-0 text-foreground">
      {children}
    </h4>
  ),
  h5: ({ children }: { children?: React.ReactNode }) => (
    <h5 className="text-xs font-semibold mb-1 mt-2 first:mt-0 text-foreground">
      {children}
    </h5>
  ),
  h6: ({ children }: { children?: React.ReactNode }) => (
    <h6 className="text-xs font-medium mb-1 mt-2 first:mt-0 text-foreground">
      {children}
    </h6>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
      {children}
    </code>
  ),
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="bg-muted p-2 rounded overflow-x-auto mb-2 text-xs">
      {children}
    </pre>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-2 border-muted-foreground/30 pl-3 italic mb-2">
      {children}
    </blockquote>
  ),
  a: ({
    children,
    href,
  }: {
    children?: React.ReactNode
    href?: string
  }) => (
    <a
      href={href}
      className="text-primary underline hover:text-primary/80"
    >
      {children}
    </a>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic">{children}</em>
  ),
}

interface WeekMarkdownContentProps {
  content: string
}

/** 周内容区域的 Markdown 渲染 */
export function WeekMarkdownContent({ content }: WeekMarkdownContentProps) {
  return (
    <div className="text-muted-foreground markdown-content">
      <ReactMarkdown rehypePlugins={[rehypeRaw]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
