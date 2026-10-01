// X5 Notifications, both roles. Grouped by day; unread items have a dot;
// tapping one marks it read and opens its payment, lead or loan. "Read all"
// in the header. The list refreshes when the app comes back to the front.

import React from 'react';
import {Pressable, SectionList, StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {useI18n} from '@/i18n';
import {formatDate, formatTime, isSameDay} from '@/lib/format';
import {useInfiniteList} from '@/lib/useInfiniteList';
import {makeStyles} from '@/theme';
import {Button, EmptyState, ErrorState, Icon, Screen, SkeletonRows, Text, listProps} from '@/ui';
import {getNotificationsPage, markAllRead, markRead, notificationKeys, type AppNotification} from '../api';
import {notificationTarget, notificationText} from '../text';

const ICONS: Record<string, string> = {
  payment: 'cash-check',
  loan: 'bank-outline',
  lead: 'account-search-outline',
  risk: 'alert-decagram-outline',
  cron: 'alert-circle-outline',
  cash: 'hand-coin-outline',
};

export default function NotificationsScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const {lang} = useI18n();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const list = useInfiniteList({queryKey: notificationKeys.list, fetchPage: getNotificationsPage, persist: true});

  const refreshCounts = () => queryClient.invalidateQueries({queryKey: notificationKeys.all});

  const open = async (n: AppNotification) => {
    if (!n.readAt) {
      markRead(n._id).then(refreshCounts, () => undefined);
    }
    const target = notificationTarget(n);
    if (target) navigation.navigate(target[0] as never, target[1] as never);
  };

  const readAll = async () => {
    await markAllRead().catch(() => undefined);
    refreshCounts();
  };

  // Group by day: Today, Yesterday, then dates.
  const today = new Date();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sections: {title: string; data: AppNotification[]}[] = [];
  for (const n of list.items) {
    const d = new Date(n.createdAt);
    const title = isSameDay(d, today)
      ? t('common.today')
      : isSameDay(d, yesterday)
      ? t('common.yesterday')
      : formatDate(d, lang);
    const last = sections[sections.length - 1];
    if (last && last.title === title) last.data.push(n);
    else sections.push({title, data: [n]});
  }
  const unread = list.items.some(n => !n.readAt);

  return (
    <Screen
      header={{
        title: t('notifications.title'),
        right: unread ? <Button title={t('notifications.readAll')} variant="text" onPress={readAll} /> : undefined,
      }}
      padded={false}>
      {list.isLoading ? (
        <SkeletonRows count={6} />
      ) : list.isError ? (
        <ErrorState error={list.error} what={t('notifications.title')} onRetry={list.refetch} />
      ) : (
        <SectionList
          {...listProps}
          removeClippedSubviews={false}
          sections={sections}
          keyExtractor={n => n._id}
          renderSectionHeader={({section}) => (
            <Text variant="overline" color="muted" style={s.day}>
              {section.title}
            </Text>
          )}
          renderItem={({item}) => {
            const text = notificationText(item, t);
            return (
              <Pressable
                onPress={() => open(item)}
                style={({pressed}) => [s.row, pressed && s.pressed]}
                accessibilityRole="button"
                accessibilityLabel={[item.readAt ? null : t('notifications.unread'), text.title, text.body]
                  .filter(Boolean)
                  .join(', ')}>
                <View style={s.icon}>
                  <Icon name={ICONS[item.type.split('.')[0]] ?? 'bell-outline'} size={20} color="primary" />
                </View>
                <View style={s.body}>
                  <Text variant="body" weight={item.readAt ? 'regular' : 'semibold'} numberOfLines={2}>
                    {text.title}
                  </Text>
                  {text.body ? (
                    <Text variant="small" color="muted" numberOfLines={2}>
                      {text.body}
                    </Text>
                  ) : null}
                  <Text variant="caption" color="muted">
                    {formatTime(item.createdAt)}
                  </Text>
                </View>
                {item.readAt ? null : <View style={s.dot} />}
              </Pressable>
            );
          }}
          contentContainerStyle={s.list}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.4}
          refreshing={list.refreshing}
          onRefresh={list.refresh}
          stickySectionHeadersEnabled={false}
          ListFooterComponent={list.isLoadingMore ? <SkeletonRows count={1} /> : null}
          ListEmptyComponent={
            <EmptyState icon="bell-outline" title={t('notifications.empty')} message={t('notifications.emptyHint')} />
          }
        />
      )}
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  list: {paddingHorizontal: t.space.lg, paddingBottom: t.space.xxl, flexGrow: 1},
  day: {marginTop: t.space.lg, marginBottom: t.space.xs},
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: t.space.md,
    paddingVertical: t.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.colors.border,
  },
  pressed: {opacity: 0.6},
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: t.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {flex: 1, minWidth: 0, gap: 2},
  dot: {width: 8, height: 8, borderRadius: 4, backgroundColor: t.colors.primary, marginTop: 6},
}));
