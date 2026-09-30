// A1 admin Home. Keeps every card from today: active loans, customers,
// market amount and repaid (returned by the API but commented out in the old
// screen), Approve history → Payments, NPA → Risk, new leads and 5 recent
// customers. Badges come from BE-3.

import React from 'react';
import {RefreshControl, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {brand} from '@/brand';
import {formatMoney, formatMoneyShort} from '@/lib/format';
import {useCan} from '@/features/auth/SessionProvider';
import {adminLoanKeys, getAdminDashboard} from '@/features/loans/adminApi';
import {makeStyles} from '@/theme';
import {
  Avatar,
  Button,
  Card,
  ErrorState,
  Icon,
  IconButton,
  ListRow,
  OfflineBanner,
  Screen,
  Section,
  Skeleton,
  StatusBadge,
  Text,
} from '@/ui';

export default function AdminHomeScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const navigation = useNavigation();
  const can = useCan();
  const query = useQuery({queryKey: adminLoanKeys.dashboard, queryFn: getAdminDashboard, meta: {persist: true}});
  const d = query.data;
  const go = (route: string, params?: object) => navigation.navigate(route as never, params as never);

  const shortcuts = [
    {
      key: 'payments',
      icon: 'cash-check',
      label: t('adminHome.payments'),
      route: 'Payments',
      badge: d?.pendingRepayments,
    },
    {key: 'risk', icon: 'alert-decagram-outline', label: t('adminHome.risk'), route: 'NpaReportScreen'},
    ...(can('lead.manage')
      ? [
          {
            key: 'leads',
            icon: 'account-search-outline',
            label: t('adminHome.leads'),
            route: 'AdminLeadsScreen',
            badge: d?.newLeads,
          },
        ]
      : []),
    {key: 'reports', icon: 'chart-bar', label: t('adminHome.reports'), route: 'ReportsScreen'},
  ];

  return (
    <Screen
      header={{
        title: brand.name,
        large: true,
        right: (
          <IconButton icon="magnify" label={t('common.search')} variant="plain" onPress={() => go('SearchScreen')} />
        ),
      }}
      scroll
      banner={<OfflineBanner savedAt={query.dataUpdatedAt} />}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} />}>
      {query.isError && !d ? (
        <ErrorState error={query.error} onRetry={query.refetch} />
      ) : (
        <>
          <Card style={s.hero}>
            <Text variant="overline" color="muted">
              {t('adminHome.market')}
            </Text>
            {d ? (
              <>
                <Text variant="display" tabular>
                  {formatMoney(d.marketDetails.totalMarketAmount)}
                </Text>
                <Text color="muted" tabular>
                  {[
                    t('adminHome.repaid', {amount: formatMoneyShort(d.marketDetails.totalMarketAmountRepaid)}),
                    d.collectedToday.amount
                      ? t('adminHome.collectedToday', {amount: formatMoneyShort(d.collectedToday.amount)})
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </>
            ) : (
              <Skeleton width={180} height={34} />
            )}
            <View style={s.heroFacts}>
              <View style={s.fact}>
                <Text variant="small" color="muted">
                  {t('adminHome.activeLoans')}
                </Text>
                <Text variant="h2" tabular onPress={() => go('Loans')}>
                  {d ? d.loanCount : '–'}
                </Text>
              </View>
              <View style={s.fact}>
                <Text variant="small" color="muted">
                  {t('adminHome.customers')}
                </Text>
                <Text variant="h2" tabular onPress={() => go('Customers')}>
                  {d ? d.customerCount : '–'}
                </Text>
              </View>
            </View>
          </Card>

          {d && d.pendingLoans > 0 ? (
            <Card onPress={() => go('Loans')} style={s.notice}>
              <Icon name="clock-alert-outline" size={20} color="warning" />
              <Text style={s.flex}>{t('adminHome.pendingLoans', {count: d.pendingLoans})}</Text>
              <Icon name="chevron-right" size={20} color="muted" />
            </Card>
          ) : null}

          <View style={s.grid}>
            {shortcuts.map(item => (
              <Card key={item.key} onPress={() => go(item.route)} style={s.shortcut} accessibilityLabel={item.label}>
                <View style={s.shortcutIcon}>
                  <Icon name={item.icon} size={22} color="primary" />
                  {item.badge ? (
                    <View style={s.badge}>
                      <Text variant="caption" weight="bold" color="white">
                        {item.badge > 99 ? '99+' : item.badge}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text variant="small" weight="medium" numberOfLines={1}>
                  {item.label}
                </Text>
              </Card>
            ))}
          </View>

          <Section
            title={t('adminHome.recent')}
            action={<Button title={t('adminHome.viewAll')} variant="text" onPress={() => go('Customers')} />}>
            <Card padded={false}>
              {(d?.recentCustomers ?? []).map(c => {
                const name = `${c.fname} ${c.lname}`;
                const loan = c.loans[0];
                return (
                  <ListRow
                    key={c.uid}
                    left={<Avatar name={name} uri={c.profilePic} />}
                    title={name}
                    subtitle={loan ? formatMoney(loan.loanAmount) : c.phoneNumber}
                    badge={loan ? <StatusBadge set="loan" status={loan.status} /> : undefined}
                    onPress={() => go('Customer', {id: c._id, uid: c.uid})}
                  />
                );
              })}
            </Card>
          </Section>
        </>
      )}
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  hero: {padding: t.space.lg, gap: t.space.xs},
  heroFacts: {flexDirection: 'row', gap: 10, marginTop: t.space.md},
  fact: {flex: 1, padding: t.space.md, borderRadius: t.radius.md, backgroundColor: t.colors.surface2, gap: 2},
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    marginTop: t.space.md,
    backgroundColor: t.colors.warningSoft,
  },
  flex: {flex: 1},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: t.space.md},
  shortcut: {
    width: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    padding: t.space.md,
  },
  shortcutIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: t.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: t.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
