// A16 Employee profile: photo, contact buttons, 3 numbers (assigned, active,
// payments collected), last login (BE-23), every detail the old screen had
// (email, phone, address, emergency contact, member since); last login
// opens Recent logins (E-13). ⋯ menu: edit,
// reset password, remove (with Undo, BE-19d).

import React, {useRef, useState} from 'react';
import {View} from 'react-native';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {useI18n} from '@/i18n';
import {errorMessage} from '@/lib/api';
import {formatDate, formatDateTime} from '@/lib/format';
import {callPhone, openEmail, openMaps} from '@/lib/messaging';
import {ContactActions} from '@/features/customers/components/CustomerParts';
import {makeStyles} from '@/theme';
import {
  Appear,
  Avatar,
  BottomSheet,
  Button,
  Card,
  ConfirmSheet,
  ErrorState,
  StatGrid,
  IconButton,
  KeyValueRows,
  OptionRow,
  PhotoViewer,
  Screen,
  SkeletonRows,
  StatusBadge,
  Text,
  TextField,
  toast,
  useConfirm,
  type SheetHandle,
  RefreshControl,
} from '@/ui';
import {getEmployeeProfile, removeEmployee, resetEmployeePassword, restoreEmployee, staffKeys} from '../api';
import {passwordOk} from './EmployeeFormScreen';

type Params = {Employee: {uid: string}};

export default function EmployeeProfileScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const {lang} = useI18n();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Params, 'Employee'>>();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const menuRef = useRef<SheetHandle>(null);
  const passwordRef = useRef<SheetHandle>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [pw, setPw] = useState({next: '', confirm: ''});
  const [pwError, setPwError] = useState<string | null>(null);
  const uid = route.params.uid;

  const query = useQuery({
    queryKey: staffKeys.profile(uid),
    queryFn: () => getEmployeeProfile(uid),
    meta: {persist: true},
  });
  const e = query.data;
  const name = e ? `${e.fname} ${e.lname}`.trim() : '';

  const reset = useMutation({
    mutationFn: () => resetEmployeePassword(uid, pw.next),
    onSuccess: () => {
      passwordRef.current?.close();
      setPw({next: '', confirm: ''});
      toast.success(t('staff.passwordReset'), {message: t('staff.resetHint', {name})});
    },
    onError: error => setPwError(errorMessage(error, t)),
  });

  const submitPassword = () => {
    if (!passwordOk(pw.next)) return setPwError(t('staff.passwordRules'));
    if (pw.next !== pw.confirm) return setPwError(t('security.passwordsDontMatch'));
    setPwError(null);
    reset.mutate();
  };

  const askRemove = () => {
    menuRef.current?.close();
    confirm.ask({
      title: t('staff.removeConfirm', {name}),
      message: t('staff.removeHint'),
      confirmLabel: t('staff.remove'),
      destructive: true,
      onConfirm: async () => {
        try {
          await removeEmployee(uid);
        } catch (error) {
          toast.error(errorMessage(error, t));
          throw error;
        }
        queryClient.invalidateQueries({queryKey: staffKeys.all});
        navigation.goBack();
        toast.success(t('staff.removed', {name}), {
          action: {
            label: t('common.undo'),
            onPress: async () => {
              try {
                await restoreEmployee(uid);
                queryClient.invalidateQueries({queryKey: staffKeys.all});
                toast.info(t('staff.restored'));
              } catch (error) {
                toast.error(errorMessage(error, t));
              }
            },
          },
        });
      },
    });
  };

  return (
    <Screen
      header={{
        title: t('staff.profileTitle'),
        right: e ? (
          <IconButton
            icon="dots-vertical"
            label={t('common.more')}
            variant="plain"
            onPress={() => menuRef.current?.open()}
          />
        ) : undefined,
      }}
      scroll
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} />}>
      {query.isPending ? (
        <SkeletonRows count={4} />
      ) : query.isError || !e ? (
        <ErrorState error={query.error} what={t('staff.profileTitle')} onRetry={query.refetch} />
      ) : (
        <>
          {/* Mock A16: photo beside the name, counts as white cards. */}
          <Appear>
            <Card style={s.head}>
              <View style={s.who}>
                <Avatar
                  name={name}
                  uri={e.profilePic}
                  size={64}
                  onPress={e.profilePic ? () => setPhotoOpen(true) : undefined}
                />
                <View style={s.whoText}>
                  <Text variant="h2" weight="bold" numberOfLines={2}>
                    {name}
                  </Text>
                  <Text variant="small" color="muted" numberOfLines={1}>
                    {[
                      e.userName ? `@${e.userName}` : null,
                      e.createdAt ? t('staff.memberSince', {date: formatDate(e.createdAt, lang)}) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                  {e.accountStatus === false ? <StatusBadge tone="neutral" label={t('staff.inactive')} /> : null}
                </View>
              </View>
              <ContactActions phone={e.phoneNumber} address={e.address} name={name} variant="ring" align="start" />
            </Card>
          </Appear>

          <Appear index={1}>
            <StatGrid
              style={s.facts}
              stats={[
                {label: t('staff.assignedLoans'), value: e.stats.assignedLoans},
                {label: t('staff.activeLoans'), value: e.stats.activeLoans},
                {label: t('staff.collected'), value: e.stats.repaymentsCollected},
              ]}
            />
          </Appear>

          {/* Mock A16 (round E): the employee's work and logins. */}
          <Card padded={false} dividers style={s.details}>
            <OptionRow
              icon="history"
              title={t('logins.title')}
              value={e.lastLogin ? formatDateTime(e.lastLogin, lang) : t('staff.never')}
              onPress={() => navigation.navigate('Logins' as never, {uid, name} as never)}
            />
          </Card>

          <Card style={s.details}>
            <KeyValueRows
              rows={[
                {
                  label: t('staff.phone'),
                  copy: true,
                  value: e.phoneNumber,
                  onPress: e.phoneNumber ? () => callPhone(e.phoneNumber!) : undefined,
                },
                {label: t('staff.email'), value: e.email, onPress: e.email ? () => openEmail(e.email!) : undefined},
                {
                  label: t('staff.address'),
                  value: e.address,
                  onPress: e.address ? () => openMaps(e.address!) : undefined,
                },
                {
                  label: t('staff.emergency'),
                  value: e.emergencyContact,
                  onPress: e.emergencyContact ? () => callPhone(e.emergencyContact!) : undefined,
                },
              ]}
            />
          </Card>

          <BottomSheet ref={menuRef} title={name}>
            <OptionRow
              icon="pencil-outline"
              title={t('staff.edit')}
              onPress={() => {
                menuRef.current?.close();
                navigation.navigate('EmployeeForm' as never, {employee: e} as never);
              }}
            />
            <OptionRow
              icon="lock-reset"
              title={t('staff.resetPassword')}
              onPress={() => {
                menuRef.current?.close();
                setPwError(null);
                passwordRef.current?.open();
              }}
            />
            <OptionRow icon="account-remove-outline" title={t('staff.remove')} destructive onPress={askRemove} />
          </BottomSheet>

          <BottomSheet
            ref={passwordRef}
            title={t('staff.resetPassword')}
            subtitle={name}
            footer={
              <>
                <Button title={t('common.cancel')} variant="text" onPress={() => passwordRef.current?.close()} />
                <Button title={t('common.save')} onPress={submitPassword} loading={reset.isPending} />
              </>
            }>
            <TextField
              label={t('staff.newPassword')}
              hint={t('staff.passwordRules')}
              secureToggle
              autoCapitalize="none"
              value={pw.next}
              onChangeText={v => setPw(p => ({...p, next: v}))}
            />
            <TextField
              label={t('staff.confirmPassword')}
              secureToggle
              autoCapitalize="none"
              value={pw.confirm}
              onChangeText={v => setPw(p => ({...p, confirm: v}))}
              error={pwError}
            />
          </BottomSheet>

          {e.profilePic ? (
            <PhotoViewer
              photos={[{uri: e.profilePic, title: name}]}
              visible={photoOpen}
              onClose={() => setPhotoOpen(false)}
            />
          ) : null}
        </>
      )}
      <ConfirmSheet ref={confirm.ref} />
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  head: {padding: t.space.lg, gap: t.space.md},
  who: {flexDirection: 'row', alignItems: 'center', gap: t.space.md},
  whoText: {flex: 1, minWidth: 0, gap: 2},
  facts: {marginTop: t.space.md},
  details: {marginTop: t.space.md},
}));
