// Lets header buttons take the mock's header look without every screen
// passing a variant: inside a Header, a "plain" IconButton is drawn as a
// bordered rounded square, or as frosted glass on a brand band.

import {createContext} from 'react';

export const HeaderSlot = createContext<'header' | 'band' | null>(null);
