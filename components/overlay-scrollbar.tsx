'use client'

import { useEffect } from 'react'

const THUMB = 6
const MIN_THUMB = 28
const INSET = 2

type Axis = 'x' | 'y'

type Box = {
  top: number
  left: number
  width: number
  height: number
  scrollTop: number
  scrollLeft: number
  scrollHeight: number
  scrollWidth: number
  clientHeight: number
  clientWidth: number
}

function isViewport(el: HTMLElement) {
  return el === document.scrollingElement || el === document.documentElement || el === document.body
}

function readBox(el: HTMLElement): Box {
  if (isViewport(el)) {
    const scroller = document.scrollingElement instanceof HTMLElement ? document.scrollingElement : document.documentElement
    return {
      top: 0,
      left: 0,
      width: window.innerWidth,
      height: window.innerHeight,
      scrollTop: scroller.scrollTop,
      scrollLeft: scroller.scrollLeft,
      scrollHeight: scroller.scrollHeight,
      scrollWidth: scroller.scrollWidth,
      clientHeight: window.innerHeight,
      clientWidth: window.innerWidth,
    }
  }

  const rect = el.getBoundingClientRect()
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    scrollTop: el.scrollTop,
    scrollLeft: el.scrollLeft,
    scrollHeight: el.scrollHeight,
    scrollWidth: el.scrollWidth,
    clientHeight: el.clientHeight,
    clientWidth: el.clientWidth,
  }
}

function canScroll(el: HTMLElement, axis: Axis) {
  const style = getComputedStyle(el)
  const overflow = axis === 'y' ? style.overflowY : style.overflowX
  if (isViewport(el)) return true
  return overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay'
}

function isExposed(el: HTMLElement, box: Box) {
  const x = Math.min(Math.max(box.left + box.width - INSET - THUMB - 8, box.left + 1), window.innerWidth - 1)
  const y = Math.min(Math.max(box.top + box.height / 2, 0), window.innerHeight - 1)
  const hit = document.elementFromPoint(x, y)
  return Boolean(hit && (hit === el || el.contains(hit)))
}

export default function OverlayScrollbars() {
  useEffect(() => {
    const layer = document.createElement('div')
    layer.dataset.overlayScrollbars = ''
    layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:70;'
    document.body.appendChild(layer)

    const thumbs = new Map<HTMLElement, Record<Axis, HTMLDivElement>>()
    const watched = new Set<HTMLElement>()
    const observed = new Set<HTMLElement>()
    let dragging: HTMLElement | null = null
    let frame = 0
    let scanTimer = 0
    const pending = new Set<HTMLElement>()

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.target instanceof HTMLElement) enqueue(entry.target)
      }
    })

    const hide = (node: HTMLDivElement) => {
      node.style.display = 'none'
    }

    const createThumb = (axis: Axis) => {
      const node = document.createElement('div')
      node.dataset.overlayThumb = axis
      node.setAttribute('aria-hidden', 'true')
      node.style.display = 'none'
      layer.appendChild(node)
      return node
    }

    const ensure = (el: HTMLElement) => {
      let pair = thumbs.get(el)
      if (!pair) {
        pair = { y: createThumb('y'), x: createThumb('x') }
        thumbs.set(el, pair)
        bindDrag(el, pair.y, 'y')
        bindDrag(el, pair.x, 'x')
      }
      if (!observed.has(el)) {
        observed.add(el)
        resizeObserver.observe(el)
      }
      return pair
    }

    const place = (node: HTMLDivElement, el: HTMLElement, axis: Axis, box: Box) => {
      const horizontal = axis === 'x'
      if (!canScroll(el, axis)) {
        hide(node)
        return
      }

      const scrollSize = horizontal ? box.scrollWidth : box.scrollHeight
      const clientSize = horizontal ? box.clientWidth : box.clientHeight
      const scrollPos = horizontal ? box.scrollLeft : box.scrollTop
      const overflow = scrollSize - clientSize
      if (overflow <= 1 || box.width < 8 || box.height < 8) {
        hide(node)
        return
      }

      const origin = horizontal ? box.left : box.top
      const extent = horizontal ? box.width : box.height
      const viewLimit = horizontal ? window.innerWidth : window.innerHeight
      const viewStart = Math.max(origin, 0)
      const viewEnd = Math.min(origin + extent, viewLimit)
      const viewSize = viewEnd - viewStart
      if (viewSize < 16) {
        hide(node)
        return
      }

      const otherOverflow = horizontal
        ? box.scrollHeight - box.clientHeight > 1
        : box.scrollWidth - box.clientWidth > 1
      const endInset = otherOverflow ? THUMB + INSET * 2 : INSET
      const thumbSize = Math.min(viewSize - endInset, Math.max(MIN_THUMB, (clientSize / scrollSize) * viewSize))
      const travel = Math.max(viewSize - endInset - thumbSize, 0)
      const offset = (scrollPos / overflow) * travel
      const cross = horizontal
        ? Math.min(box.top + box.height, window.innerHeight) - THUMB - INSET
        : Math.min(box.left + box.width, window.innerWidth) - THUMB - INSET

      if ((dragging !== el && !isExposed(el, box)) || cross < 0) {
        hide(node)
        return
      }

      node.style.display = 'block'
      if (horizontal) {
        node.style.top = `${cross}px`
        node.style.left = `${viewStart + offset}px`
        node.style.width = `${thumbSize}px`
        node.style.height = `${THUMB}px`
      } else {
        node.style.left = `${cross}px`
        node.style.top = `${viewStart + offset}px`
        node.style.width = `${THUMB}px`
        node.style.height = `${thumbSize}px`
      }
    }

    function update(el: HTMLElement) {
      if (!el.isConnected) {
        const pair = thumbs.get(el)
        pair?.y.remove()
        pair?.x.remove()
        thumbs.delete(el)
        watched.delete(el)
        return
      }
      if (el.closest('.scrollbar-hide')) {
        const pair = thumbs.get(el)
        if (pair) {
          hide(pair.y)
          hide(pair.x)
        }
        return
      }

      const pair = ensure(el)
      const box = readBox(el)
      place(pair.y, el, 'y', box)
      place(pair.x, el, 'x', box)
    }

    function enqueue(el: HTMLElement) {
      pending.add(el)
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        const items = [...pending]
        pending.clear()
        for (const item of items) update(item)
      })
    }

    function bindDrag(el: HTMLElement, node: HTMLDivElement, axis: Axis) {
      node.addEventListener('pointerdown', event => {
        if (event.button !== 0) return
        event.preventDefault()
        event.stopPropagation()
        dragging = el
        node.setPointerCapture(event.pointerId)

        const horizontal = axis === 'x'
        const startPointer = horizontal ? event.clientX : event.clientY
        const startScroll = horizontal ? el.scrollLeft : el.scrollTop
        const box = readBox(el)
        const scrollSize = horizontal ? box.scrollWidth : box.scrollHeight
        const clientSize = horizontal ? box.clientWidth : box.clientHeight
        const overflow = scrollSize - clientSize
        const origin = horizontal ? box.left : box.top
        const extent = horizontal ? box.width : box.height
        const viewLimit = horizontal ? window.innerWidth : window.innerHeight
        const viewSize = Math.min(origin + extent, viewLimit) - Math.max(origin, 0)
        const thumbSize = node.getBoundingClientRect()[horizontal ? 'width' : 'height']
        const travel = Math.max(viewSize - thumbSize - INSET, 1)

        const move = (ev: PointerEvent) => {
          const current = horizontal ? ev.clientX : ev.clientY
          const next = startScroll + ((current - startPointer) / travel) * overflow
          if (horizontal) el.scrollLeft = next
          else el.scrollTop = next
        }
        const end = () => {
          dragging = null
          node.removeEventListener('pointermove', move)
          node.removeEventListener('pointerup', end)
          node.removeEventListener('pointercancel', end)
          update(el)
        }
        node.addEventListener('pointermove', move)
        node.addEventListener('pointerup', end)
        node.addEventListener('pointercancel', end)
      })
    }

    function scan() {
      const found = new Set<HTMLElement>()
      const scroller = document.scrollingElement
      if (scroller instanceof HTMLElement) found.add(scroller)

      for (const node of document.body.querySelectorAll<HTMLElement>('*')) {
        if (node === layer || layer.contains(node)) continue
        const className = node.getAttribute('class') || ''
        const styleAttr = node.getAttribute('style') || ''
        if (!className.includes('overflow') && !styleAttr.includes('overflow')) continue
        const style = getComputedStyle(node)
        const overflows = [style.overflowY, style.overflowX].some(value => value === 'auto' || value === 'scroll' || value === 'overlay')
        if (overflows) found.add(node)
      }

      for (const el of found) watched.add(el)
      for (const el of watched) enqueue(el)
    }

    const onScroll = (event: Event) => {
      const target = event.target
      if (target === document) {
        const scroller = document.scrollingElement
        if (scroller instanceof HTMLElement) enqueue(scroller)
        return
      }
      if (target instanceof HTMLElement && !layer.contains(target)) {
        watched.add(target)
        enqueue(target)
      }
    }

    const onResize = () => scan()

    document.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    const mutationObserver = new MutationObserver(() => {
      window.clearTimeout(scanTimer)
      scanTimer = window.setTimeout(scan, 80)
    })
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    })
    document.addEventListener('load', scan, true)
    scan()

    return () => {
      document.removeEventListener('scroll', onScroll, true)
      document.removeEventListener('load', scan, true)
      window.removeEventListener('resize', onResize)
      mutationObserver.disconnect()
      resizeObserver.disconnect()
      window.clearTimeout(scanTimer)
      if (frame) window.cancelAnimationFrame(frame)
      layer.remove()
    }
  }, [])

  return null
}
