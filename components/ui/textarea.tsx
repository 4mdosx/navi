'use client'

import * as React from "react"
import { cn } from "@/lib/utils"

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

function assignRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value)
  else if (ref) (ref as React.MutableRefObject<T | null>).current = value
}

function autosize(el: HTMLTextAreaElement) {
  el.style.height = "auto"
  const border = el.offsetHeight - el.clientHeight
  el.style.height = `${el.scrollHeight + border}px`
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, onChange, onInput, value, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement>(null)

    const syncSize = React.useCallback(() => {
      const el = innerRef.current
      if (el) autosize(el)
    }, [])

    const setRefs = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        innerRef.current = node
        assignRef(ref, node)
        if (node) autosize(node)
      },
      [ref]
    )

    React.useLayoutEffect(() => {
      syncSize()
    }, [syncSize, value, props.defaultValue])

    React.useEffect(() => {
      const el = innerRef.current
      const parent = el?.parentElement
      if (!el) return

      let lastWidth = parent?.getBoundingClientRect().width ?? 0
      const observer = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect.width ?? lastWidth
        if (width === lastWidth) return
        lastWidth = width
        syncSize()
      })
      if (parent) observer.observe(parent)
      window.addEventListener("resize", syncSize)
      return () => {
        observer.disconnect()
        window.removeEventListener("resize", syncSize)
      }
    }, [syncSize])

    return (
      <textarea
        {...props}
        className={cn(
          "flex min-h-[80px] w-full resize-none overflow-hidden rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={setRefs}
        value={value}
        onChange={(event) => {
          autosize(event.currentTarget)
          onChange?.(event)
        }}
        onInput={(event) => {
          autosize(event.currentTarget)
          onInput?.(event)
        }}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
