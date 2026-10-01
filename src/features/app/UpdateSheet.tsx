// S5: the update banner becomes a sheet with version, size, what's new and
// download progress. Download or install errors show inside it with Retry.

import React, {useEffect} from 'react';
import {View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {makeStyles} from '@/theme';
import {BottomSheet, Button, Icon, ProgressBar, Text, useSheet} from '@/ui';
import {useUpdates} from './updates';

export default function UpdateSheet() {
  const s = useStyles();
  const {t} = useTranslation();
  const sheet = useSheet();
  const {update, currentVersion, download, install, dismissed, dismiss, required} = useUpdates();
  // Mandatory updates use the full-screen UpdateGate instead.
  const visible = !!update && !dismissed && !required;

  useEffect(() => {
    if (visible) sheet.open();
    else sheet.close();
  }, [visible, sheet]);

  if (!update || required) return null;
  const downloading = download.status === 'downloading';
  const sizeMb = update.size ? (update.size / (1024 * 1024)).toFixed(0) : null;

  return (
    <BottomSheet
      ref={sheet.ref}
      title={t('app.updateTitle')}
      subtitle={[
        t('app.updateVersions', {from: currentVersion, to: update.latestVersion}),
        sizeMb ? t('app.updateSize', {size: sizeMb}) : null,
      ]
        .filter(Boolean)
        .join(' · ')}
      dismissible={!downloading}
      onClose={dismiss}
      footer={
        <>
          <Button title={t('app.later')} variant="text" onPress={dismiss} disabled={downloading} />
          <Button
            title={download.status === 'error' ? t('common.retry') : t('app.install')}
            icon="download"
            onPress={install}
            loading={downloading}
          />
        </>
      }>
      <Text color="muted" style={s.message}>
        {t('app.optionalMessage')}
      </Text>
      {update.notes?.length ? (
        <View style={s.notes}>
          {update.notes.map(note => (
            <View key={note} style={s.note}>
              <Icon name="check" size={16} color="success" />
              <Text variant="small" style={s.noteText}>
                {note}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {downloading ? (
        <View style={s.progress}>
          <Text variant="small" color="muted">
            {t('app.downloading', {percent: Math.round(download.progress * 100)})}
          </Text>
          <ProgressBar value={download.progress} />
        </View>
      ) : null}
      {download.status === 'error' ? (
        <Text variant="small" color="danger">
          {download.message === 'install' ? t('app.installFailed') : t('app.updateFailed')}
        </Text>
      ) : null}
    </BottomSheet>
  );
}

const useStyles = makeStyles(t => ({
  message: {marginBottom: t.space.md},
  notes: {gap: t.space.sm, marginBottom: t.space.md},
  note: {flexDirection: 'row', alignItems: 'flex-start', gap: t.space.sm},
  noteText: {flex: 1},
  progress: {gap: t.space.sm, marginBottom: t.space.sm},
}));
