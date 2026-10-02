// E-13 Recent logins: the last 90 days of sign-ins, grouped by day, with the
// phone, app version and a partly hidden IP. A phone the person hadn't used
// before gets a "New phone" badge. Admins open it from A16 (an employee's
// logins); employees from Security (their own).

import React, {useMemo} from 'react';
import {SectionList} from 'react-native';
import {useRoute, type RouteProp} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {useI18n} from '@/i18n';
import {formatDate, formatTime, isSameDay} from '@/lib/format';
import {authKeys, getMyLogins, type LoginEntry} from '@/features/auth/api';
import {makeStyles} from '@/theme';
import {
  EmptyState,
  ErrorState,
  Icon,
  ListRow,
  Screen,
  SkeletonRows,
  StatusBadge,
  Text,
  listProps,
  RefreshControl,
} from '@/ui';
import {getEmployeeLogins, staffKeys} from '../api';

type Params = {Logins: {uid?: string; name?: string} | undefined};

export function dayTitle(date: string, lang: 'en' | 'hi', t: (k: string) => string, now = new Date()): string {
  if (isSameDay(date, now)) return t('common.today');
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return t('common.yesterday');
  return formatDate(date, lang, {short: true});
}

export function byDay(entries: LoginEntry[], title: (date: string) => string) {
  const sections: {title: string; data: LoginEntry[]}[] = [];
  for (const entry of entries) {
    const heading = title(entry.date);
    const last = sections[sections.length - 1];
    if (last && last.title === heading) last.data.push(entry);
    else sections.push({title: heading, data: [entry]});
  }
  return sections;
}

export default function LoginsScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const {lang} = useI18n();
  const route = useRoute<RouteProp<Params, 'Logins'>>();
  const uid = route.params?.uid;

  const query = useQuery({
    queryKey: uid ? staffKeys.logins(uid) : authKeys.logins,
    queryFn: () => (uid ? getEmployeeLogins(uid) : getMyLogins()),
  });
  const sections = useMemo(() => byDay(query.data ?? [], d => dayTitle(d, lang, t)), [query.data, lang, t]);

  return (
    <Screen
      header={{
        title: uid ? t('logins.title') : t('logins.mine'),
        subtitle: [route.params?.name, t('logins.kept')].filter(Boolean).join(' · '),
      }}
      padded={false}>
      {query.isPending ? (
        <SkeletonRows count={5} avatar={false} />
      ) : query.isError ? (
        <ErrorState error={query.error} what={t('logins.title')} onRetry={query.refetch} />
      ) : (
        <SectionList
          {...listProps}
          sections={sections}
          keyExtractor={item => item._id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} />}
          renderSectionHeader={({section}) => (
            <Text variant="overline" color="muted" style={s.header}>
              {section.title}
            </Text>
          )}
          renderItem={({item}) => (
            <ListRow
              card
              left={<Icon name="cellphone" size={22} color={item.newDevice ? 'warning' : 'muted'} />}
              title={formatTime(item.date)}
              subtitle={
                [
                  item.device ?? t('logins.unknownPhone'),
                  item.appVersion ? t('logins.app', {version: item.appVersion}) : null,
                  item.ip,
                ]
                  .filter(Boolean)
                  .join(' · ') || undefined
              }
              badge={item.newDevice ? <StatusBadge tone="warning" label={t('logins.newPhone')} /> : undefined}
            />
          )}
          ListEmptyComponent={<EmptyState icon="history" title={t('logins.empty')} />}
        />
      )}
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  list: {paddingHorizontal: t.space.lg, paddingBottom: t.space.xxl, flexGrow: 1},
  header: {marginTop: t.space.md, marginBottom: t.space.sm},
}));
