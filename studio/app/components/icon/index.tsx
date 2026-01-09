'use client'

import { Icon } from '@iconify/react'
import { CSSProperties } from 'react'

interface IconProps {
  icon: string
  style?: CSSProperties
  className?: string
}

export default function IconComponent({ icon, style, className }: IconProps) {
  return <Icon icon={icon} className={className} style={style} />
}
