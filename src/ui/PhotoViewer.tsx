// P-12: any photo or document opens full screen with pinch-zoom, swipe to
// the next one, and Download.

import React, {useState} from 'react';
import {Dimensions, FlatList, Image, StyleSheet, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {runOnJS, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AppModal} from './AppModal';
import {IconButton} from './IconButton';
import {Text} from './Text';

export interface Photo {
  uri: string;
  title?: string;
}

const {width: SCREEN_W} = Dimensions.get('window');

function ZoomableImage({uri, onZoomChange}: {uri: string; onZoomChange: (zoomed: boolean) => void}) {
  const scale = useSharedValue(1);
  const saved = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const reset = () => {
    'worklet';
    scale.value = withTiming(1);
    saved.value = 1;
    x.value = withTiming(0);
    y.value = withTiming(0);
    savedX.value = 0;
    savedY.value = 0;
    runOnJS(onZoomChange)(false);
  };

  const pinch = Gesture.Pinch()
    .onUpdate(e => {
      scale.value = Math.max(1, Math.min(5, saved.value * e.scale));
    })
    .onEnd(() => {
      saved.value = scale.value;
      if (scale.value <= 1.01) reset();
      else runOnJS(onZoomChange)(true);
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onUpdate(e => {
      if (saved.value <= 1) return;
      x.value = savedX.value + e.translationX;
      y.value = savedY.value + e.translationY;
    })
    .onEnd(() => {
      savedX.value = x.value;
      savedY.value = y.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (saved.value > 1) {
        reset();
      } else {
        scale.value = withTiming(2.5);
        saved.value = 2.5;
        runOnJS(onZoomChange)(true);
      }
    });

  const style = useAnimatedStyle(() => ({
    transform: [{translateX: x.value}, {translateY: y.value}, {scale: scale.value}],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, doubleTap)}>
      <Animated.View style={[styles.page, style]}>
        <Image source={{uri}} style={styles.image} resizeMode="contain" accessibilityIgnoresInvertColors />
      </Animated.View>
    </GestureDetector>
  );
}

export function PhotoViewer({
  photos,
  index = 0,
  visible,
  onClose,
  onDownload,
}: {
  photos: Photo[];
  index?: number;
  visible: boolean;
  onClose: () => void;
  onDownload?: (photo: Photo) => void;
}) {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(index);
  const [zoomed, setZoomed] = useState(false);
  const photo = photos[current];

  return (
    <AppModal visible={visible} onRequestClose={onClose} transparent>
      <View style={styles.backdrop}>
        <FlatList
          data={photos}
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed}
          initialScrollIndex={index}
          getItemLayout={(_, i) => ({length: SCREEN_W, offset: SCREEN_W * i, index: i})}
          keyExtractor={(item, i) => `${item.uri}-${i}`}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={e => setCurrent(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))}
          renderItem={({item}) => <ZoomableImage uri={item.uri} onZoomChange={setZoomed} />}
        />
        <View style={[styles.top, {paddingTop: insets.top + 8}]}>
          <IconButton icon="close" label="Close" variant="plain" color="white" onPress={onClose} />
          <View style={styles.title}>
            {photo?.title ? (
              <Text variant="bodyLg" color="white" numberOfLines={1}>
                {photo.title}
              </Text>
            ) : null}
            {photos.length > 1 ? (
              <Text variant="caption" color="white">
                {current + 1} / {photos.length}
              </Text>
            ) : null}
          </View>
          {onDownload && photo ? (
            <IconButton
              icon="download"
              label="Download"
              variant="plain"
              color="white"
              onPress={() => onDownload(photo)}
            />
          ) : null}
        </View>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  // A photo viewer is always dark, whatever the theme.
  backdrop: {flex: 1, backgroundColor: 'black'},
  page: {width: SCREEN_W, flex: 1, justifyContent: 'center'},
  image: {width: '100%', height: '100%'},
  top: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 8,
  },
  title: {flex: 1},
});
