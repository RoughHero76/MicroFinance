// src/components/toast/CustomToast.js
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import MaterialCommunityIcons from '../../design/Icon';
import { colors, radius, shadow, spacing, type } from '../../design/tokens';

export const showToast = (type, text1, text2) => {
  Toast.show({ type, text1, text2 });
};

const TYPE_COLOR = {
  success: colors.success,
  error: colors.danger,
  info: colors.info,
};

const TYPE_ICON = {
  success: 'check-circle-outline',
  error: 'alert-circle-outline',
  info: 'information-outline',
};

const ToastMessage = ({ type, text1, text2 }) => {
  const offset = useSharedValue(-120);
  const opacity = useSharedValue(0);

  useEffect(() => {
    offset.value = withSpring(0, { damping: 16, stiffness: 110 });
    opacity.value = withTiming(1, { duration: 260, easing: Easing.ease });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        { backgroundColor: TYPE_COLOR[type] || TYPE_COLOR.info, shadowColor: '#0F172A' },
        animatedStyle,
      ]}
    >
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name={TYPE_ICON[type] || 'information-outline'} size={22} color="#fff" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.toastText1}>{text1}</Text>
        {text2 ? <Text style={styles.toastText2}>{text2}</Text> : null}
      </View>
    </Animated.View>
  );
};

// Any Modal that can trigger a toast while open needs its own nested <CustomToast/>,
// since RN's Modal renders in a separate native layer above the normal view tree.
export const CustomToast = () => (
  <Toast
    config={{
      success: (props) => <ToastMessage {...props} type="success" />,
      error: (props) => <ToastMessage {...props} type="error" />,
      info: (props) => <ToastMessage {...props} type="info" />,
    }}
  />
);

const styles = StyleSheet.create({
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    marginHorizontal: spacing.md,
    marginTop: 0,
    ...shadow.raised,
    zIndex: 99999,
  },
  iconContainer: {
    marginRight: spacing.sm + 2,
  },
  textContainer: {
    flex: 1,
  },
  toastText1: {
    ...type.bodyBold,
    color: '#fff',
  },
  toastText2: {
    ...type.body,
    color: 'rgba(255,255,255,0.92)',
    marginTop: 2,
  },
});

export default CustomToast;
