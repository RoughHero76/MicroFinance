// Renders the kit gallery in every palette × mode × language (W0 "done
// when", minus the on-device screenshots, which need a phone).

import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import KitGallery from '@/dev/KitGallery';
import i18n from '@/i18n';
import { ThemeProvider, paletteIds } from '@/theme';

describe('kit gallery', () => {
  for (const palette of paletteIds) {
    for (const mode of ['light', 'dark'] as const) {
      for (const lang of ['en', 'hi'] as const) {
        it(`renders in ${palette} · ${mode} · ${lang}`, async () => {
          await i18n.changeLanguage(lang);
          const screen = render(
            <SafeAreaProvider>
              <ThemeProvider initial={{ palette, mode }}>
                <NavigationContainer>
                  <KitGallery />
                </NavigationContainer>
              </ThemeProvider>
            </SafeAreaProvider>,
          );
          expect(screen.getByText('UI kit')).toBeTruthy();
          expect(screen.getAllByText(lang === 'hi' ? 'बकाया' : 'Overdue').length).toBeGreaterThan(0);
          screen.unmount();
        });
      }
    }
  }
});
