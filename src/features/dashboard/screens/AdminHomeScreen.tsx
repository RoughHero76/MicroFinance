// A1 admin Home. A branded gradient hero (market amount, repaid, active
// loans and customers in one row), a personal greeting, a compact
// quick-action row (Payments, Risk, Leads, Reports - badges from BE-3), and
// 5 recent customers. The money figures start hidden behind an eye (A-01)
// and hide again whenever the app leaves the foreground.

import React, {useEffect, useState} from 'react';
import {AppState, Platform, Pressable, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {brand} from '@/brand';
import {formatMoney, formatMoneyShort} from '@/lib/format';
import {useBreakpoint} from '@/lib/useBreakpoint';
import {useCan, useSession} from '@/features/auth/SessionProvider';
import {adminLoanKeys, getAdminDashboard} from '@/features/loans/adminApi';
import {NotificationBell} from '@/features/notifications/Bell';
import {makeStyles, useTheme, withAlpha} from '@/theme';
import {
  Avatar,
  Button,
  Card,
  ErrorState,
  HeroCard,
  Icon,
  IconButton,
  ListRow,
  OfflineBanner,
  Screen,
  Section,
  Skeleton,
  StatusBadge,
  Text,
  RefreshControl,
} from '@/ui';

const HIDDEN = '₹ • • • • • •';
const HIDDEN_SHORT = '• • •';

export default function AdminHomeScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const navigation = useNavigation();
  const can = useCan();
  const {user} = useSession();
  const query = useQuery({queryKey: adminLoanKeys.dashboard, queryFn: getAdminDashboard, meta: {persist: true}});
  const d = query.data;
  const go = (route: string, params?: object) => navigation.navigate(route as never, params as never);
  const theme = useTheme();
  const [shown, setShown] = useState(false);
  // Web beside the sidebar: a two-column desk layout. The sidebar has the
  // logo and every shortcut, so the header greets and the right column
  // lists what is waiting.
  const desk = useBreakpoint().wide && Platform.OS === 'web';

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') setShown(false);
    });
    return () => sub.remove();
  }, []);

  const shortcuts = [
    {
      key: 'payments',
      icon: 'cash-check',
      label: t('adminHome.payments'),
      route: 'Payments',
      badge: d?.pendingRepayments,
    },
    {key: 'risk', icon: 'alert-decagram-outline', label: t('adminHome.risk'), route: 'Risk'},
    ...(can('lead.manage')
      ? [
          {
            key: 'leads',
            icon: 'account-search-outline',
            label: t('adminHome.leads'),
            route: 'Leads',
            badge: d?.newLeads,
          },
        ]
      : []),
    {key: 'reports', icon: 'chart-bar', label: t('adminHome.reports'), route: 'Reports'},
  ];

  // Desk layout: what needs the admin, with counts.
  const waiting: {key: string; icon: string; label: string; route: string; count?: number; tone?: 'warning'}[] = [
    {
      key: 'payments',
      icon: 'cash-check',
      label: t('adminHome.payments'),
      route: 'Payments',
      count: d?.pendingRepayments,
    },
    {
      key: 'loans',
      icon: 'clock-alert-outline',
      label: t('adminHome.loansToApprove'),
      route: 'Loans',
      count: d?.pendingLoans,
      tone: 'warning',
    },
    ...(can('lead.manage')
      ? [
          {
            key: 'leads',
            icon: 'account-search-outline',
            label: t('adminHome.leads'),
            route: 'Leads',
            count: d?.newLeads,
          },
        ]
      : []),
    {key: 'risk', icon: 'alert-decagram-outline', label: t('adminHome.risk'), route: 'Risk'},
  ];

  return (
    <Screen
      maxWidth={desk ? 1200 : undefined}
      header={{
        title: desk && user?.fname ? t('adminHome.welcome', {name: user.fname}) : brand.name,
        logo: !desk,
        large: true,
        right: (
          <View style={s.headerActions}>
            <IconButton icon="magnify" label={t('common.search')} variant="plain" onPress={() => go('Search')} />
            <NotificationBell />
          </View>
        ),
      }}
      scroll
      banner={<OfflineBanner savedAt={query.dataUpdatedAt} />}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} />}>
      {query.isError && !d ? (
        <ErrorState error={query.error} onRetry={query.refetch} />
      ) : (
        <>
          {desk ? (
            <View style={s.deskRow}>
              <View style={s.deskMain}>
                <HeroCard>
                  <View style={s.heroHead}>
                    <Text variant="overline" color="onPrimary" style={[s.heroMuted, s.flex]}>
                      {t('adminHome.market')}
                    </Text>
                    <IconButton
                      icon={shown ? 'eye-outline' : 'eye-off-outline'}
                      label={shown ? t('adminHome.hideAmounts') : t('adminHome.showAmounts')}
                      variant="plain"
                      size={30}
                      color={theme.colors.onPrimary}
                      style={s.eye}
                      onPress={() => setShown(v => !v)}
                      testID="market-eye"
                    />
                  </View>
                  {d ? (
                    <Text
                      variant="display"
                      color="onPrimary"
                      tabular
                      accessibilityLabel={shown ? undefined : t('adminHome.amountHidden')}>
                      {shown ? formatMoney(d.marketDetails.totalMarketAmount) : HIDDEN}
                    </Text>
                  ) : (
                    <Skeleton width={180} height={34} />
                  )}
                  {shown && d?.collectedToday.amount ? (
                    <Text color="onPrimary" style={s.heroMuted}>
                      {t('adminHome.collectedToday', {amount: formatMoneyShort(d.collectedToday.amount)})}
                    </Text>
                  ) : null}
                  <View style={s.heroFacts}>
                    <View style={s.fact}>
                      <Text variant="small" color="onPrimary" style={s.heroMuted}>
                        {t('adminHome.repaidLabel')}
                      </Text>
                      <Text variant="h2" color="onPrimary" tabular>
                        {d ? (shown ? formatMoneyShort(d.marketDetails.totalMarketAmountRepaid) : HIDDEN_SHORT) : '–'}
                      </Text>
                    </View>
                    <View style={s.fact}>
                      <Text variant="small" color="onPrimary" style={s.heroMuted}>
                        {t('adminHome.activeLoans')}
                      </Text>
                      <Text variant="h2" color="onPrimary" tabular onPress={() => go('Loans')}>
                        {d ? d.loanCount : '–'}
                      </Text>
                    </View>
                    <View style={s.fact}>
                      <Text variant="small" color="onPrimary" style={s.heroMuted}>
                        {t('adminHome.customers')}
                      </Text>
                      <Text variant="h2" color="onPrimary" tabular onPress={() => go('Customers')}>
                        {d ? d.customerCount : '–'}
                      </Text>
                    </View>
                  </View>
                </HeroCard>

                <Section
                  style={s.deskSection}
                  title={t('adminHome.recent')}
                  action={<Button title={t('adminHome.viewAll')} variant="text" onPress={() => go('Customers')} />}>
                  <Card padded={false} dividers>
                    {(d?.recentCustomers ?? []).map(c => {
                      const name = `${c.fname} ${c.lname}`;
                      const loan = c.loans[0];
                      const subtitle = loan
                        ? `${t('adminHome.loanCount', {count: c.loans.length})} · ${formatMoney(loan.loanAmount)}`
                        : c.phoneNumber;
                      return (
                        <ListRow
                          key={c.uid}
                          left={<Avatar name={name} uri={c.profilePic} />}
                          title={name}
                          subtitle={subtitle}
                          badge={loan ? <StatusBadge set="loan" status={loan.status} /> : undefined}
                          onPress={() => go('Customer', {id: c._id, uid: c.uid})}
                        />
                      );
                    })}
                  </Card>
                </Section>
              </View>
              <View style={s.deskSide}>
                <Card padded={false} dividers>
                  <Text variant="overline" color="muted" style={s.cardTitle}>
                    {t('adminHome.waiting')}
                  </Text>
                  {waiting.map(item => (
                    <ListRow
                      key={item.key}
                      left={
                        <View style={s.shortcutIcon}>
                          <Icon name={item.icon} size={22} color="primary" />
                        </View>
                      }
                      title={item.label}
                      right={
                        item.count ? (
                          <View style={[s.count, item.tone === 'warning' && s.countWarning]}>
                            <Text variant="small" weight="bold" color={item.tone === 'warning' ? 'warning' : 'primary'}>
                              {item.count}
                            </Text>
                          </View>
                        ) : undefined
                      }
                      onPress={() => go(item.route)}
                    />
                  ))}
                </Card>
              </View>
            </View>
          ) : (
            <>
              {user?.fname ? (
                <Text variant="h2" weight="bold" style={s.greeting}>
                  {t('adminHome.welcome', {name: user.fname})}
                </Text>
              ) : null}

              <HeroCard>
                <View style={s.heroHead}>
                  <Text variant="overline" color="onPrimary" style={[s.heroMuted, s.flex]}>
                    {t('adminHome.market')}
                  </Text>
                  <IconButton
                    icon={shown ? 'eye-outline' : 'eye-off-outline'}
                    label={shown ? t('adminHome.hideAmounts') : t('adminHome.showAmounts')}
                    variant="plain"
                    size={30}
                    color={theme.colors.onPrimary}
                    style={s.eye}
                    onPress={() => setShown(v => !v)}
                    testID="market-eye"
                  />
                </View>
                {d ? (
                  <Text
                    variant="display"
                    color="onPrimary"
                    tabular
                    accessibilityLabel={shown ? undefined : t('adminHome.amountHidden')}>
                    {shown ? formatMoney(d.marketDetails.totalMarketAmount) : HIDDEN}
                  </Text>
                ) : (
                  <Skeleton width={180} height={34} />
                )}
                {shown && d?.collectedToday.amount ? (
                  <Text color="onPrimary" style={s.heroMuted}>
                    {t('adminHome.collectedToday', {amount: formatMoneyShort(d.collectedToday.amount)})}
                  </Text>
                ) : null}
                <View style={s.heroFacts}>
                  <View style={s.fact}>
                    <Text variant="small" color="onPrimary" style={s.heroMuted}>
                      {t('adminHome.repaidLabel')}
                    </Text>
                    <Text variant="h2" color="onPrimary" tabular>
                      {d ? (shown ? formatMoneyShort(d.marketDetails.totalMarketAmountRepaid) : HIDDEN_SHORT) : '–'}
                    </Text>
                  </View>
                  <View style={s.fact}>
                    <Text variant="small" color="onPrimary" style={s.heroMuted}>
                      {t('adminHome.activeLoans')}
                    </Text>
                    <Text variant="h2" color="onPrimary" tabular onPress={() => go('Loans')}>
                      {d ? d.loanCount : '–'}
                    </Text>
                  </View>
                  <View style={s.fact}>
                    <Text variant="small" color="onPrimary" style={s.heroMuted}>
                      {t('adminHome.customers')}
                    </Text>
                    <Text variant="h2" color="onPrimary" tabular onPress={() => go('Customers')}>
                      {d ? d.customerCount : '–'}
                    </Text>
                  </View>
                </View>
              </HeroCard>

              {d && d.pendingLoans > 0 ? (
                <Card onPress={() => go('Loans')} style={s.notice}>
                  <Icon name="clock-alert-outline" size={20} color="warning" />
                  <Text style={s.flex}>{t('adminHome.pendingLoans', {count: d.pendingLoans})}</Text>
                  <Icon name="chevron-right" size={20} color="muted" />
                </Card>
              ) : null}

              <View style={s.quickRow}>
                {shortcuts.map(item => (
                  <Pressable
                    key={item.key}
                    onPress={() => go(item.route)}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    style={({pressed}) => [s.quickItem, pressed && s.quickItemPressed]}>
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
                  </Pressable>
                ))}
              </View>

              <Section
                title={t('adminHome.recent')}
                action={<Button title={t('adminHome.viewAll')} variant="text" onPress={() => go('Customers')} />}>
                <Card padded={false} dividers>
                  {(d?.recentCustomers ?? []).map(c => {
                    const name = `${c.fname} ${c.lname}`;
                    const loan = c.loans[0];
                    const subtitle = loan
                      ? `${t('adminHome.loanCount', {count: c.loans.length})} · ${formatMoney(loan.loanAmount)}`
                      : c.phoneNumber;
                    return (
                      <ListRow
                        key={c.uid}
                        left={<Avatar name={name} uri={c.profilePic} />}
                        title={name}
                        subtitle={subtitle}
                        badge={loan ? <StatusBadge set="loan" status={loan.status} /> : undefined}
                        onPress={() => go('Customer', {id: c._id, uid: c.uid})}
                      />
                    );
                  })}
                </Card>
              </Section>
            </>
          )}
        </>
      )}
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  headerActions: {flexDirection: 'row', alignItems: 'center'},
  greeting: {marginBottom: t.space.sm},
  heroMuted: {opacity: 0.85},
  heroHead: {flexDirection: 'row', alignItems: 'center', gap: t.space.sm},
  eye: {backgroundColor: withAlpha(t.colors.white, 0.18)},
  heroFacts: {flexDirection: 'row', gap: 10, marginTop: t.space.md},
  fact: {flex: 1, gap: 2},
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    marginTop: t.space.md,
    backgroundColor: t.colors.warningSoft,
  },
  flex: {flex: 1},
  deskRow: {flexDirection: 'row', alignItems: 'flex-start', gap: t.space.xl},
  deskMain: {flex: 3, minWidth: 0},
  deskSide: {flex: 2, minWidth: 0},
  deskSection: {marginTop: t.space.xl},
  cardTitle: {paddingHorizontal: t.space.lg, paddingTop: t.space.md, paddingBottom: t.space.xs},
  count: {
    minWidth: 28,
    height: 24,
    paddingHorizontal: t.space.sm,
    borderRadius: 12,
    backgroundColor: t.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countWarning: {backgroundColor: t.colors.warningSoft},
  quickRow: {flexDirection: 'row', marginVertical: t.space.md},
  quickItem: {flex: 1, alignItems: 'center', gap: t.space.xs, paddingVertical: t.space.sm},
  quickItemPressed: {opacity: 0.6},
  // Mock A1: rounded-square tiles.
  shortcutIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
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
