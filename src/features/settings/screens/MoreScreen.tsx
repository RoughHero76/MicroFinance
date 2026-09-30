// A20 (admin) / E12 (employee): More replaces the drawer. It keeps the
// drawer header (photo, name, email) and its working items; the placeholder
// items are now real screens.

import React from 'react';
import {View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {brand} from '@/brand';
import {useCan, useSession} from '@/features/auth/SessionProvider';
import {makeStyles} from '@/theme';
import {Avatar, Card, ConfirmSheet, OptionRow, Screen, Section, Text, useConfirm} from '@/ui';
import type {AppStackParamList} from '@/navigation/types';

export interface MoreItem {
  key: string;
  icon: string;
  title: string;
  route: keyof AppStackParamList;
  badge?: number;
  visible?: boolean;
}

export default function MoreScreen({work}: {work: MoreItem[]}) {
  const s = useStyles();
  const {t} = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const {user, signOut} = useSession();
  const can = useCan();
  const confirm = useConfirm();
  const name = [user?.fname, user?.lname].filter(Boolean).join(' ');

  const items = work.filter(item => item.visible !== false);

  return (
    <Screen header={{title: t('nav.more'), large: true}} scroll>
      <Card
        onPress={() => navigation.navigate('ProfileScreen')}
        style={s.profile}
        accessibilityLabel={t('more.viewProfile')}>
        <Avatar name={name} uri={user?.profilePic} size={52} />
        <View style={s.profileText}>
          <Text variant="title" numberOfLines={1}>
            {name || user?.userName}
          </Text>
          <Text variant="small" color="muted" numberOfLines={1}>
            {[user?.email, t('more.viewProfile')].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </Card>

      {items.length ? (
        <Section title={can('employee.manage') ? t('more.manage') : t('more.work')}>
          <Card padded={false}>
            {items.map(item => (
              <OptionRow
                key={item.key}
                icon={item.icon}
                title={item.title}
                badge={item.badge}
                onPress={() => navigation.navigate(item.route as never)}
              />
            ))}
          </Card>
        </Section>
      ) : null}

      <Section title={t('more.app')}>
        <Card padded={false}>
          <OptionRow icon="cog-outline" title={t('more.settings')} onPress={() => navigation.navigate('Settings')} />
          <OptionRow icon="lifebuoy" title={t('more.support')} onPress={() => navigation.navigate('Support')} />
          <OptionRow
            icon="logout"
            title={t('common.logout')}
            destructive
            onPress={() =>
              confirm.ask({
                title: t('more.logoutConfirm', {brand: brand.name}),
                message: t('more.logoutHint'),
                confirmLabel: t('common.logout'),
                destructive: true,
                onConfirm: () => signOut(),
              })
            }
          />
        </Card>
      </Section>
      <ConfirmSheet ref={confirm.ref} />
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  profile: {flexDirection: 'row', alignItems: 'center', gap: t.space.md, marginBottom: t.space.lg},
  profileText: {flex: 1, gap: 2},
}));
