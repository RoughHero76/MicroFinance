// X1: own profile. Every field from today (photo, name, role, status,
// username, phone, email, address, emergency contact, last login); the random
// cover images are dropped for the plain themed header. The photo is cropped
// square and compressed before upload (F-9).

import React, {useState} from 'react';
import {View} from 'react-native';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {useI18n} from '@/i18n';
import {errorMessage} from '@/lib/api';
import {formatDate, formatDateTime} from '@/lib/format';
import {pickImage, type ImageSource} from '@/lib/image';
import {forgetImage} from '@/lib/imageCache';
import {useCan, useSession} from '@/features/auth/SessionProvider';
import {authKeys, getProfile, updateAdminProfile, uploadProfilePhoto} from '@/features/auth/api';
import {makeStyles} from '@/theme';
import {
  Appear,
  Avatar,
  BottomSheet,
  Button,
  Card,
  ErrorState,
  Icon,
  OptionRow,
  Screen,
  SkeletonRows,
  StatusBadge,
  Text,
  TextField,
  toast,
  useSheet,
  RefreshControl,
} from '@/ui';

export default function ProfileScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const {lang} = useI18n();
  const {role, updateUser} = useSession();
  const can = useCan();
  const queryClient = useQueryClient();
  const photoSheet = useSheet();
  const editSheet = useSheet();

  const query = useQuery({queryKey: authKeys.profile(role), queryFn: () => getProfile(role!), enabled: !!role});
  const profile = query.data;
  const name = profile ? `${profile.fname ?? ''} ${profile.lname ?? ''}`.trim() : '';

  const [form, setForm] = useState({fname: '', lname: '', email: '', phoneNumber: ''});

  const upload = useMutation({
    mutationFn: async (source: ImageSource) => {
      const image = await pickImage('profile', source);
      if (!image) return null;
      await uploadProfilePhoto(image, p =>
        toast.progress('profile-photo', p < 1 ? t('ui.uploading') : t('ui.finishing'), p),
      );
      return image;
    },
    onSuccess: async image => {
      toast.hide('profile-photo');
      if (!image) return;
      if (profile?.profilePic) await forgetImage(profile.profilePic);
      const fresh = await queryClient.fetchQuery({queryKey: authKeys.profile(role), queryFn: () => getProfile(role!)});
      updateUser({profilePic: fresh.profilePic ?? null});
      toast.success(t('profile.photoUpdated'));
    },
    onError: error => {
      toast.hide('profile-photo');
      toast.error(errorMessage(error, t));
    },
  });

  const save = useMutation({
    mutationFn: () => updateAdminProfile(form),
    onSuccess: () => {
      editSheet.close();
      updateUser({fname: form.fname, lname: form.lname, email: form.email});
      queryClient.invalidateQueries({queryKey: authKeys.profile(role)});
      toast.success(t('profile.saved'));
    },
    onError: error => toast.error(errorMessage(error, t)),
  });

  const openEdit = () => {
    setForm({
      fname: profile?.fname ?? '',
      lname: profile?.lname ?? '',
      email: profile?.email ?? '',
      phoneNumber: profile?.phoneNumber ?? '',
    });
    editSheet.open();
  };

  const lastLogin = profile?.lastLogin || profile?.loginHistory?.date;
  const active = profile?.accountStatus === true || profile?.accountStatus === 'active' || role === 'admin';

  return (
    <Screen
      header={{title: t('profile.title')}}
      scroll
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} />}>
      {query.isPending ? (
        <SkeletonRows count={4} />
      ) : query.isError ? (
        <ErrorState error={query.error} what={t('profile.title')} onRetry={query.refetch} />
      ) : profile ? (
        <>
          {/* Mock X1: photo, name and badges on the page, details as icon rows. */}
          <Appear style={s.head}>
            <Avatar name={name} uri={profile.profilePic} size={88} onEditPhoto={photoSheet.open} />
            <Text variant="h2" weight="bold" align="center" style={s.name}>
              {name}
            </Text>
            <View style={s.badges}>
              <StatusBadge label={t(role === 'admin' ? 'common.admin' : 'common.employee')} tone="primary" />
              <StatusBadge set="account" status={active ? 'active' : 'inactive'} />
            </View>
          </Appear>
          <Appear index={1}>
            <Card padded={false} dividers>
              {[
                {
                  icon: 'account-outline',
                  label: t('profile.username'),
                  text: profile.userName ? `@${profile.userName}` : '',
                },
                {icon: 'phone-outline', label: t('profile.phone'), text: profile.phoneNumber},
                {icon: 'email-outline', label: t('profile.email'), text: profile.email},
                {icon: 'map-marker-outline', label: t('profile.address'), text: profile.address},
                {
                  icon: 'alert-outline',
                  label: t('profile.emergency'),
                  text: profile.emergencyContact ? `${t('profile.emergency')} · ${profile.emergencyContact}` : '',
                },
                {
                  icon: 'history',
                  label: t('profile.lastLogin'),
                  text: lastLogin ? `${t('profile.lastLogin')} · ${formatDateTime(lastLogin, lang)}` : '',
                },
                {
                  icon: 'calendar-outline',
                  label: t('profile.memberSince'),
                  text: profile.createdAt ? `${t('profile.memberSince')} · ${formatDate(profile.createdAt, lang)}` : '',
                },
              ]
                .filter(row => !!row.text)
                .map(row => (
                  <View key={row.icon} style={s.info} accessible accessibilityLabel={`${row.label}: ${row.text}`}>
                    <Icon name={row.icon} size={20} color="muted" />
                    <Text style={s.flex} numberOfLines={2}>
                      {row.text}
                    </Text>
                  </View>
                ))}
            </Card>
          </Appear>
          {can('profile.edit') ? (
            <Card padded={false} dividers style={s.gap}>
              <OptionRow icon="account-edit-outline" title={t('profile.edit')} onPress={openEdit} />
            </Card>
          ) : null}
        </>
      ) : null}

      <BottomSheet ref={photoSheet.ref} title={t('profile.changePhoto')}>
        <OptionRow
          icon="camera-outline"
          title={t('profile.takePhoto')}
          onPress={() => {
            photoSheet.close();
            upload.mutate('camera');
          }}
        />
        <OptionRow
          icon="image-outline"
          title={t('profile.chooseFromGallery')}
          onPress={() => {
            photoSheet.close();
            upload.mutate('gallery');
          }}
        />
      </BottomSheet>

      <BottomSheet
        ref={editSheet.ref}
        title={t('profile.edit')}
        footer={
          <>
            <Button title={t('common.cancel')} variant="text" onPress={editSheet.close} />
            <Button title={t('common.save')} onPress={() => save.mutate()} loading={save.isPending} />
          </>
        }>
        <TextField
          label={t('profile.firstName')}
          value={form.fname}
          onChangeText={v => setForm(f => ({...f, fname: v}))}
        />
        <TextField
          label={t('profile.lastName')}
          value={form.lname}
          onChangeText={v => setForm(f => ({...f, lname: v}))}
        />
        <TextField
          label={t('profile.email')}
          value={form.email}
          onChangeText={v => setForm(f => ({...f, email: v}))}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextField
          label={t('profile.phone')}
          value={form.phoneNumber}
          onChangeText={v => setForm(f => ({...f, phoneNumber: v}))}
          keyboardType="phone-pad"
        />
      </BottomSheet>
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  head: {alignItems: 'center', paddingTop: t.space.sm, paddingBottom: t.space.lg},
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    minHeight: 48,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.sm,
  },
  flex: {flex: 1},
  name: {marginTop: t.space.md},
  badges: {flexDirection: 'row', gap: t.space.sm, marginTop: t.space.sm},
  gap: {marginTop: t.space.md},
}));
