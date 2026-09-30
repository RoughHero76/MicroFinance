// X3: app lock (the phone's fingerprint or PIN when the app opens, with a
// lock timer). Admins only: change my password (PUT /admin/password) and a
// full data backup (GET /admin/database/backup) saved to Downloads.

import React, {useState} from 'react';
import {useMutation} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {brand} from '@/brand';
import {errorMessage} from '@/lib/api';
import {downloadToDownloads} from '@/lib/files';
import {BACKUP_PATH, changeAdminPassword} from '@/features/auth/api';
import {LOCK_AFTER_OPTIONS} from '@/features/auth/lock';
import {useCan, useSession} from '@/features/auth/SessionProvider';
import {makeStyles} from '@/theme';
import {
  BottomSheet,
  Button,
  Card,
  ConfirmSheet,
  OptionRow,
  Screen,
  Section,
  SelectField,
  Text,
  TextField,
  toast,
  useConfirm,
  useSheet,
} from '@/ui';

export default function SecurityScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const can = useCan();
  const {lockSettings, setLockSettings, deviceLockAvailable} = useSession();
  const passwordSheet = useSheet();
  const confirm = useConfirm();
  const [pw, setPw] = useState({current: '', next: '', confirm: ''});
  const [pwError, setPwError] = useState<string | null>(null);

  const lockOptions = LOCK_AFTER_OPTIONS.map(ms => ({
    value: String(ms),
    label: ms === 0 ? t('security.immediately') : t('security.minutes', {count: ms / 60000}),
  }));

  const changePassword = useMutation({
    mutationFn: () => changeAdminPassword(pw.current, pw.next),
    onSuccess: () => {
      passwordSheet.close();
      setPw({current: '', next: '', confirm: ''});
      toast.success(t('security.passwordChanged'));
    },
    onError: error => setPwError(errorMessage(error, t)),
  });

  const submitPassword = () => {
    if (pw.next.length < 8) return setPwError(t('security.passwordHint'));
    if (pw.next !== pw.confirm) return setPwError(t('security.passwordsDontMatch'));
    setPwError(null);
    changePassword.mutate();
  };

  const backup = async () => {
    const stamp = new Date().toISOString().slice(0, 10);
    try {
      await downloadToDownloads(BACKUP_PATH, `backup-${stamp}.zip`, 'application/zip', {
        subfolder: 'Backups',
        onProgress: p => toast.progress('backup', t('common.download'), p),
      });
      toast.hide('backup');
      toast.success(t('security.backupSaved'));
    } catch (error) {
      toast.hide('backup');
      toast.error(t('security.backupFailed'), {message: errorMessage(error, t)});
      throw error;
    }
  };

  return (
    <Screen header={{title: t('security.title')}} scroll>
      <Section>
        <Card padded={false}>
          <OptionRow
            icon="fingerprint"
            title={t('security.appLock')}
            hint={deviceLockAvailable ? t('security.appLockHint') : t('security.appLockUnavailable')}
            toggle={{
              value: lockSettings.enabled && deviceLockAvailable,
              onChange: enabled => setLockSettings({...lockSettings, enabled}),
              disabled: !deviceLockAvailable,
            }}
          />
        </Card>
        {lockSettings.enabled && deviceLockAvailable ? (
          <Card style={s.gap}>
            <SelectField
              label={t('security.lockAfter')}
              hint={t('security.lockAfterHint')}
              value={String(lockSettings.afterMs)}
              options={lockOptions}
              onChange={v => setLockSettings({...lockSettings, afterMs: Number(v)})}
            />
          </Card>
        ) : null}
      </Section>

      {can('security.changePassword') || can('security.backup') ? (
        <Section title={t('security.adminsOnly')}>
          <Card padded={false}>
            {can('security.changePassword') ? (
              <OptionRow icon="key-outline" title={t('security.changePassword')} onPress={passwordSheet.open} />
            ) : null}
            {can('security.backup') ? (
              <OptionRow
                icon="database-arrow-down-outline"
                title={t('security.backup')}
                hint={t('security.backupHint')}
                onPress={() =>
                  confirm.ask({
                    title: t('security.backupConfirm'),
                    message: t('security.backupMessage', {folder: brand.storageFolder}),
                    confirmLabel: t('common.download'),
                    onConfirm: backup,
                  })
                }
              />
            ) : null}
          </Card>
        </Section>
      ) : null}

      <BottomSheet
        ref={passwordSheet.ref}
        title={t('security.changePassword')}
        footer={
          <>
            <Button title={t('common.cancel')} variant="text" onPress={passwordSheet.close} />
            <Button title={t('common.save')} onPress={submitPassword} loading={changePassword.isPending} />
          </>
        }>
        <TextField
          label={t('security.currentPassword')}
          secureToggle
          value={pw.current}
          onChangeText={v => setPw(p => ({...p, current: v}))}
          autoCapitalize="none"
        />
        <TextField
          label={t('security.newPassword')}
          hint={t('security.passwordHint')}
          secureToggle
          value={pw.next}
          onChangeText={v => setPw(p => ({...p, next: v}))}
          autoCapitalize="none"
        />
        <TextField
          label={t('security.confirmPassword')}
          secureToggle
          value={pw.confirm}
          onChangeText={v => setPw(p => ({...p, confirm: v}))}
          autoCapitalize="none"
        />
        {pwError ? (
          <Text variant="small" color="danger">
            {pwError}
          </Text>
        ) : null}
      </BottomSheet>
      <ConfirmSheet ref={confirm.ref} />
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  gap: {marginTop: t.space.md},
}));
