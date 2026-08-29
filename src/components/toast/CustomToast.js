// src/components/toast/CustomToast.js

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Toast, { BaseToast } from 'react-native-toast-message';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, radii, spacing, type } from '../../theme/tokens';

export const showToast = (type, text1, text2) => {
  Toast.show({ type, text1, text2 });
};

const ToastMessage = ({ type, text1, text2 }) => {
  const offset = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    offset.value = withSpring(0, { damping: 15, stiffness: 100 });
    opacity.value = withTiming(1, { duration: 300, easing: Easing.ease });
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: offset.value }],
      opacity: opacity.value,
    };
  });

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <MaterialCommunityIcons name="check-circle-outline" size={24} color="white" />;
      case 'error':
        return <MaterialCommunityIcons name="alert-circle-outline" size={24} color="white" />;
      case 'info':
        return <MaterialCommunityIcons name="information-outline" size={24} color="white" />;
      default:
        return null;
    }
  };

  return (
    <Animated.View style={[styles.toastContainer, styles[`${type}Toast`], animatedStyle]}>
      <View style={styles.iconContainer}>{getIcon()}</View>
      <View style={styles.textContainer}>
        <Text style={styles.toastText1}>{text1}</Text>
        {text2 && <Text style={styles.toastText2}>{text2}</Text>}
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
    padding: spacing.lg,
    borderRadius: radii.md,
    marginHorizontal: spacing.lg,
    marginTop: 0,
    shadowColor: colors.night,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 99999,
  },
  successToast: {
    backgroundColor: colors.success,
  },
  errorToast: {
    backgroundColor: colors.danger,
  },
  infoToast: {
    backgroundColor: colors.info,
  },
  iconContainer: {
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  toastText1: {
    color: colors.white,
    fontWeight: type.weights.bold,
    fontSize: type.sizes.md + 1,
  },
  toastText2: {
    color: colors.white,
    opacity: 0.92,
    fontSize: type.sizes.sm + 1,
    marginTop: spacing.xs,
  },
});

export default CustomToast;