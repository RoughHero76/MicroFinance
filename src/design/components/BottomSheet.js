import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  Animated,
  Easing,
  TouchableWithoutFeedback,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, type } from '../tokens';
import Icon from '../Icon';

/**
 * BottomSheet
 * -----------
 * Material-style action sheet with an animated slide-up, backdrop, grabber and
 * scrollable body.
 *
 *   <BottomSheet visible={open} onClose={close} title="Actions">
 *     ...
 *   </BottomSheet>
 */
const BottomSheet = ({
  visible = false,
  onClose,
  title,
  children,
  drag = false,
  scroll = true,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(1)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(1);
      backdrop.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdrop, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      translateY.setValue(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const close = () => {
    if (!visible) return;
    Animated.parallel([
      Animated.timing(translateY, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(backdrop, { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start(() => onClose && onClose());
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <View style={styles.root}>
        <TouchableWithoutFeedback onPress={close}>
          <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#0F172A', opacity: backdrop }]} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) },
            { transform: [{ translateY: translateY.interpolate({ inputRange: [0, 1], outputRange: [0, 760] }) }] },
          ]}
        >
          {drag ? <View style={styles.grabber} /> : null}

          {title ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingBottom: spacing.xs }}>
              <Text style={[type.h2, { color: colors.ink }]}>{title}</Text>
              <Pressable hitSlop={8} onPress={close} accessibilityRole="button" accessibilityLabel="Close">
                <Icon name="close" size={22} color={colors.inkMuted} />
              </Pressable>
            </View>
          ) : null}

          {scroll ? (
            <ScrollView style={{ paddingHorizontal: spacing.md }} contentContainerStyle={{ paddingBottom: spacing.md }} showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          ) : (
            <View style={{ paddingHorizontal: spacing.md }}>{children}</View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    minHeight: 120,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
});

export default BottomSheet;
