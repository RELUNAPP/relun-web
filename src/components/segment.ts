import { useApp } from '../data/store';
import { segmentColors, type SegmentColors } from '../theme';

/** The signed-in user's accent set; Android's `Relun.segment`. */
export const useSegment = (): SegmentColors => segmentColors(useApp((s) => s.segment));
