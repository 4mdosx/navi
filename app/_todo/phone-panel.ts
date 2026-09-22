type PanelRouter = {
  push: (href: string, options?: { scroll?: boolean }) => void
  back: () => void
  replace: (href: string, options?: { scroll?: boolean }) => void
}

let depth = 0

export function openPhonePanel(router: PanelRouter, href: string) {
  depth += 1
  router.push(href, { scroll: false })
}

export function closePhonePanel(router: PanelRouter) {
  if (depth > 0) {
    depth -= 1
    router.back()
    return
  }
  router.replace('/', { scroll: false })
}
