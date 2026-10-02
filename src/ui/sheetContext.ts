// True inside a BottomSheet. Text fields there must use the sheet library's
// own input, or Android can close the sheet when the keyboard opens (seen on
// some phones: tapping the rejection reason dismissed the sheet).

import {createContext} from 'react';

export const InSheet = createContext(false);
