'use client'

import { BoxEditor } from '@/feature/box-editor'

export default function BoxEditorPage() {
  return (
    <div className="h-dvh w-full overflow-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <BoxEditor />
    </div>
  )
}
