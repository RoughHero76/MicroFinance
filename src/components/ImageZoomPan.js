import React, { useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { PinchGestureHandler, PanGestureHandler, State } from 'react-native-gesture-handler';

const ImageZoomPan = ({ imageUri }) => {
  const [panEnabled, setPanEnabled] = useState(false);

  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const pinchRef = useRef();
  const panRef = useRef();

  const onPinchEvent = Animated.event(
    [{ nativeEvent: { scale: scale } }],
    { useNativeDriver: true }
  );

  const onPanEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { useNativeDriver: true }
  );

  const handlePinchStateChange = ({ nativeEvent }) => {
    if (nativeEvent.oldState === State.ACTIVE) {
      setPanEnabled(nativeEvent.scale > 1);
      scale.flattenOffset();
    }
  };

  const handlePanStateChange = ({ nativeEvent }) => {
    if (nativeEvent.oldState === State.ACTIVE) {
      translateX.extractOffset();
      translateY.extractOffset();
    }
  };

  return (
    <PanGestureHandler
      ref={panRef}
      onGestureEvent={onPanEvent}
      onHandlerStateChange={handlePanStateChange}
      enabled={panEnabled}
      simultaneousHandlers={[pinchRef]}
    >
      <Animated.View>
        <PinchGestureHandler
          ref={pinchRef}
          onGestureEvent={onPinchEvent}
          onHandlerStateChange={handlePinchStateChange}
          simultaneousHandlers={[panRef]}
        >
          <Animated.Image
            source={{ uri: imageUri }}
            style={[
              styles.image,
              {
                transform: [
                  { scale },
                  { translateX },
                  { translateY },
                ],
              },
            ]}
            resizeMode="contain"
          />
        </PinchGestureHandler>
      </Animated.View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
});

export default ImageZoomPan;