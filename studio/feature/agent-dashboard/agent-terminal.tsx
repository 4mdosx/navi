'use client'

import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'

import '@xterm/xterm/css/xterm.css'

export type AgentTerminalHandle = {
  write: (chunk: string) => void
  clear: () => void
  fit: () => void
}

export const AgentTerminal = forwardRef<AgentTerminalHandle, object>(
  function AgentTerminal(_props, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const termRef = useRef<Terminal | null>(null)
    const fitRef = useRef<FitAddon | null>(null)

    useImperativeHandle(ref, () => ({
      write: (chunk: string) => {
        termRef.current?.write(chunk)
      },
      clear: () => {
        termRef.current?.clear()
      },
      fit: () => {
        fitRef.current?.fit()
      },
    }))

    useEffect(() => {
      const el = containerRef.current
      if (!el) return

      const term = new Terminal({
        disableStdin: true,
        cursorBlink: false,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: 12,
        theme: {
          background: '#0a0a0a',
          foreground: '#e4e4e7',
        },
        allowProposedApi: true,
      })
      const fit = new FitAddon()
      term.loadAddon(fit)
      term.open(el)
      fit.fit()
      termRef.current = term
      fitRef.current = fit

      const ro = new ResizeObserver(() => {
        fit.fit()
      })
      ro.observe(el)

      return () => {
        ro.disconnect()
        term.dispose()
        termRef.current = null
        fitRef.current = null
      }
    }, [])

    return (
      <div
        ref={containerRef}
        className="h-full min-h-[12rem] w-full min-w-0 overflow-hidden rounded-md border border-neutral-200 bg-neutral-950 dark:border-neutral-800"
      />
    )
  }
)

AgentTerminal.displayName = 'AgentTerminal'
