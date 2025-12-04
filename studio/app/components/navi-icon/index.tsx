'use client'

import { Icon } from '@iconify/react'
import { CSSProperties } from 'react'

export default function NaviIcon({ icon, style, className }: { icon: string, style?: CSSProperties, className?: string }) {
  return <Icon icon={icon} className={className} style={style} />
}
