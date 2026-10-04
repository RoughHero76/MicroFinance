import type {ModeId} from '@/theme/palettes';
import {brand, logo, logoDark} from './current';

export {brand};
export type {Brand, Lang} from './types';

/** The logo for a mode. Dark mode uses logo-dark.png when the brand has one. */
export function brandLogo(mode: ModeId): {source: number; needsPlate: boolean} {
  if (mode === 'dark') {
    return logoDark != null ? {source: logoDark, needsPlate: false} : {source: logo, needsPlate: true};
  }
  return {source: logo, needsPlate: false};
}
