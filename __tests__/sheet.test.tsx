// Sheets belong to their screen: a tap that lands while the screen is going
// away doesn't open one (it used to outlive the screen and block every touch),
// and an open sheet closes when its screen loses focus.

import React from 'react';
import {afterEach, describe, expect, it, jest} from '@jest/globals';
import {act, render} from '@testing-library/react-native';
import {NavigationContainer, createNavigationContainerRef} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {BottomSheetModal} from '@gorhom/bottom-sheet';
import {ThemeProvider} from '@/theme';
import {BottomSheet, Text, type SheetHandle} from '@/ui';

afterEach(() => {
  jest.restoreAllMocks();
});

const Stack = createNativeStackNavigator();
const nav = createNavigationContainerRef<Record<string, undefined>>();
const sheetRef = React.createRef<SheetHandle>();

function First() {
  return (
    <BottomSheet ref={sheetRef} title="Sheet">
      <Text>Inside</Text>
    </BottomSheet>
  );
}
const Second = () => <Text>Second</Text>;

function renderStack() {
  return render(
    <SafeAreaProvider>
      <ThemeProvider initial={{palette: 'evi', mode: 'light'}}>
        <NavigationContainer ref={nav}>
          <Stack.Navigator screenOptions={{headerShown: false}}>
            <Stack.Screen name="First" component={First} />
            <Stack.Screen name="Second" component={Second} />
          </Stack.Navigator>
        </NavigationContainer>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('BottomSheet and its screen', () => {
  it('opens on a focused screen, closes when the screen is covered, and then refuses to open', () => {
    const present = jest.spyOn(BottomSheetModal.prototype as {present: () => void}, 'present');
    const dismiss = jest.spyOn(BottomSheetModal.prototype as {dismiss: () => void}, 'dismiss');
    renderStack();

    act(() => sheetRef.current?.open());
    expect(present).toHaveBeenCalledTimes(1);

    act(() => nav.navigate('Second'));
    expect(dismiss).toHaveBeenCalled();

    act(() => sheetRef.current?.open());
    expect(present).toHaveBeenCalledTimes(1);
  });
});
