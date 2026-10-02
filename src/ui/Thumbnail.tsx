// A square photo or document thumbnail, through the shared image cache.

import React, {useEffect, useState} from 'react';
import {Image, View} from 'react-native';
import {cachedImage, cachedPathSync} from '@/lib/imageCache';
import {makeStyles} from '@/theme';
import {Icon} from './Icon';

export function Thumbnail({uri, size = 96}: {uri?: string | null; size?: number}) {
  const s = useStyles();
  const [source, setSource] = useState<string | null>(uri ? cachedPathSync(uri) ?? uri : null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    if (!uri) {
      setSource(null);
      return;
    }
    setSource(cachedPathSync(uri) ?? uri);
    cachedImage(uri).then(path => {
      if (alive && path) {
        setSource(path);
      }
    });
    return () => {
      alive = false;
    };
  }, [uri]);

  const box = {width: size, height: size};
  if (!source || failed) {
    return (
      <View style={[s.box, box]}>
        <Icon name="file-image-outline" size={28} color="muted" />
      </View>
    );
  }
  return (
    <Image
      source={{uri: source}}
      style={[s.box, box]}
      onError={() => setFailed(true)}
      accessibilityIgnoresInvertColors
    />
  );
}

const useStyles = makeStyles(t => ({
  box: {borderRadius: t.radius.md, backgroundColor: t.colors.surface2, alignItems: 'center', justifyContent: 'center'},
}));
