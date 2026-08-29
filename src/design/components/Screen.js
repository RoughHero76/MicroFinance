import React from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../tokens';

/**
 * Screen
 * ------
 * Base page container: app background + top safe-area, optional scrolling,
 * optional in-content header, and keyboard handling for forms.
 *
 *   <Screen> ... </Screen>
 *   <Screen scroll keyboardAvoid> ... </Screen>
 *   <Screen header={<AppHeader .../>}> ... </Screen>
 */
const Screen = ({
  children,
  scroll = false,
  keyboardAvoid = false,
  header,
  bg = colors.bg,
  contentStyle,
  scrollProps,
  style,
  keyboardShouldPersistTaps = 'handled',
  refreshControl,
}) => {
  const insets = useSafeAreaInsets();
  const top = insets.top;

  const body = (
    <>
      {header ? (
        <View style={{ paddingTop: top, backgroundColor: bg }}>{header}</View>
      ) : null}
      {scroll ? (
        <ScrollView
          contentContainerStyle={[
            {
              flexGrow: 1,
              paddingBottom: Math.max(insets.bottom, spacingPad(insets)),
            },
            contentStyle,
          ]}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          refreshControl={refreshControl}
          {...scrollProps}
        >
          {children}
        </ScrollView>
      ) : (
        <View
          style={[
            {
              flex: 1,
              paddingBottom: Math.max(insets.bottom, spacingPad(insets)),
            },
            contentStyle,
          ]}
        >
          {children}
        </View>
      )}
    </>
  );

  const frame = (
    <View style={[styles.root, { backgroundColor: bg, paddingTop: header ? 0 : top }, style]}>
      {body}
    </View>
  );

  if (keyboardAvoid) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: bg }}
      >
        {frame}
      </KeyboardAvoidingView>
    );
  }

  return frame;
};

// Small helper so we don't pad the very bottom twice on notched devices.
const spacingPad = (insets) => Math.max(20, insets.bottom);

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default Screen;
