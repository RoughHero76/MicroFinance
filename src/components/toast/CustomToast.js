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
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  successToast: {
    backgroundColor: '#4CAF50',
  },
  errorToast: {
    backgroundColor: '#F44336',
  },
  infoToast: {
    backgroundColor: '#2196F3',
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  toastText1: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  toastText2: {
    color: 'white',
    fontSize: 14,
    marginTop: 4,
  },
});

export default CustomToast;