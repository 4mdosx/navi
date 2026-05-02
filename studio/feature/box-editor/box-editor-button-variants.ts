import type { ComponentProps } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ButtonProps = ComponentProps<typeof Button>

const toolbarToolInactive =
  'text-slate-800 hover:bg-slate-100 hover:text-slate-950'

/** 当前工具：浅灰底 + 深色字 + 明显描边（与 ghost 未选中区分） */
const toolbarToolActive = cn(
  'border-2 border-slate-950 bg-slate-200 font-medium text-slate-900 shadow-md',
  'hover:bg-slate-300 hover:text-slate-950'
)

const layerChipMotion =
  'transition-[transform,box-shadow,background-color,border-color,color] duration-150 ease-out'

/** 未选中：浅色字 + 弱边框 */
const layerChipInactive = cn(
  layerChipMotion,
  'border-slate-200 bg-white text-slate-500 shadow-none',
  'hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600 hover:shadow-sm',
  'active:scale-[0.96] active:border-slate-300 active:bg-slate-100 active:text-slate-700',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white'
)

/** 当前层：深色字 + 浅灰底（与 inactive 的浅色字区分） */
const layerChipActive = cn(
  layerChipMotion,
  'border-slate-400 bg-slate-200 font-medium text-slate-900 shadow-sm',
  'hover:border-slate-500 hover:bg-slate-300 hover:text-slate-950 hover:shadow',
  'active:scale-[0.96] active:bg-slate-300 active:border-slate-500',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-600/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white'
)

/** 工具栏：单选工具（选择 / 新建 / 图层） */
export function boxEditorToolbarToolButtonProps(
  active: boolean
): Pick<ButtonProps, 'variant' | 'className'> {
  return {
    variant: active ? 'outline' : 'ghost',
    className: cn(
      'gap-0.5 rounded-md pr-2',
      active ? toolbarToolActive : toolbarToolInactive
    ),
  }
}

/** 图层条：当前层 pill（两处列表共用） */
export function boxEditorLayerChipButtonProps(
  active: boolean
): Pick<ButtonProps, 'variant' | 'className'> {
  return {
    variant: 'outline',
    className: cn('shrink-0 rounded-full', active ? layerChipActive : layerChipInactive),
  }
}

/** 次要操作（新建图层、导出等）：高对比 slate secondary */
export const boxEditorMutedActionButtonClass =
  'bg-slate-200 text-slate-900 shadow-sm hover:bg-slate-300'

/** 线框操作（删除、移动顺序、导入等） */
export const boxEditorOutlineActionButtonClass =
  'border-slate-300 hover:bg-slate-50 hover:text-slate-900'
