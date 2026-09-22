'use client'

import { useSyncExternalStore } from 'react'

function subscribe(query: string, onChange: () => void) {
  const media = window.matchMedia(query)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => subscribe(query, onChange),
    () => window.matchMedia(query).matches,
    () => false,
  )
}

export function usePhoneLayout() {
  return useMediaQuery('(max-width: 767px)')
}

export function useNoHover() {
  return useMediaQuery('(hover: none), (max-width: 767px)')
}
