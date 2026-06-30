/** One 15-minute slot row min height (matches legacy hourly row height). */
export const CURRICULUM_SCHEDULE_CELL_MIN_HEIGHT_REM = 4

/** Grid snaps to this many minutes per row. */
export const SCHEDULE_SLOT_MINUTES = 15

export const SCHEDULE_SLOTS_PER_HOUR = 60 / SCHEDULE_SLOT_MINUTES

/** Matches the schedule inner row `min-w-[640px]`. */
export const CURRICULUM_SCHEDULE_ROW_MIN_WIDTH_PX = 640

/** Time column uses Tailwind `w-14` (3.5rem). */
export const CURRICULUM_SCHEDULE_TIME_GUTTER_REM = 3.5

/**
 * One day-column width when the schedule row is at {@link CURRICULUM_SCHEDULE_ROW_MIN_WIDTH_PX}
 * and root font size is 16px (so 3.5rem gutter === 56px). Cards in the sidebar use this to match
 * the week grid at default scale.
 */
export function curriculumScheduleDayColumnMinWidthPx(
  rootFontPx = 16
): number {
  const gutterPx = CURRICULUM_SCHEDULE_TIME_GUTTER_REM * rootFontPx
  return (CURRICULUM_SCHEDULE_ROW_MIN_WIDTH_PX - gutterPx) / 7
}
