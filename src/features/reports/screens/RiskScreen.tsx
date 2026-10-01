// A18 Portfolio risk (admin). The 4 overview figures (active loans, NPA %,
// total overdue, average overdue per overdue loan), then NPA and each SMA
// level with count, %, overdue amount and label. SMA levels count missed
// installments (thresholds from Business settings). Each row opens its
// list of loans. "⟳" runs tonight's update now (BE-9), with the last run.

import React from 'react';
import {View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {useI18n} from '@/i18n';
import {errorMessage} from '@/lib/api';
import {formatDateTime, formatMoney} from '@/lib/format';
import {makeStyles} from '@/theme';
import {
  Card,
  ConfirmSheet,
  ErrorState,
  StatGrid,
  Icon,
  IconButton,
  ListRow,
  Screen,
  Section,
  SkeletonRows,
  StatusBadge,
  Text,
  toast,
  useConfirm,
  RefreshControl,
} from '@/ui';
import {getRiskOverview, reportKeys, runSettlement} from '../api';

const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 1000) / 10}%` : '0%');

export default function RiskScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const {lang} = useI18n();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const query = useQuery({queryKey: reportKeys.risk, queryFn: getRiskOverview, meta: {persist: true}});
  const d = query.data;

  const run = useMutation({
    mutationFn: runSettlement,
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: reportKeys.risk});
      queryClient.invalidateQueries({queryKey: ['collect']});
      queryClient.invalidateQueries({queryKey: ['dashboard']});
      toast.success(t('risk.ran'));
    },
    onError: error => toast.error(errorMessage(error, t)),
  });

  const askRun = () =>
    confirm.ask({
      title: t('risk.runTitle'),
      message: t('risk.runHint'),
      confirmLabel: t('risk.runNow'),
      onConfirm: () => run.mutateAsync(),
    });

  const levels = d
    ? ([
        {key: 'npa', title: 'NPA', hint: t('risk.npaHint'), tone: 'danger', label: t('risk.critical')},
        {
          key: 'sma2',
          title: 'SMA-2',
          hint: t('risk.missed', {count: d.thresholds.sma2}),
          tone: 'danger',
          label: t('risk.danger'),
        },
        {
          key: 'sma1',
          title: 'SMA-1',
          hint: t('risk.missed', {count: d.thresholds.sma1}),
          tone: 'warning',
          label: t('risk.alert'),
        },
        {
          key: 'sma0',
          title: 'SMA-0',
          hint: t('risk.missed', {count: d.thresholds.sma0}),
          tone: 'info',
          label: t('risk.warning'),
        },
      ] as const)
    : [];

  const failed = d?.lastRun?.status === 'failed';

  return (
    <Screen
      header={{
        title: t('risk.title'),
        right: (
          <IconButton
            icon="refresh"
            label={t('risk.runNow')}
            variant="plain"
            disabled={run.isPending}
            onPress={askRun}
          />
        ),
      }}
      scroll
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} />}>
      {query.isPending ? (
        <SkeletonRows count={5} avatar={false} />
      ) : query.isError || !d ? (
        <ErrorState error={query.error} what={t('risk.title')} onRetry={query.refetch} />
      ) : (
        <>
          {/* Mock A18: the four overview figures as white cards. */}
          <StatGrid
            stats={[
              {label: t('risk.activeLoans'), value: d.activeLoans},
              {
                label: t('risk.npaPercent'),
                value: d.buckets.npa.count,
                format: n => `${pct(n, d.activeLoans)} (${n})`,
                color: d.buckets.npa.count ? 'danger' : undefined,
              },
              {label: t('risk.totalOverdue'), value: d.totalOverdue, format: formatMoney},
              {label: t('risk.averageOverdue'), value: d.averageOverdue, format: formatMoney},
            ]}
          />

          <Section title={t('risk.levels')}>
            <Card padded={false} dividers>
              {levels.map(level => {
                const b = d.buckets[level.key];
                return (
                  <ListRow
                    key={level.key}
                    title={`${level.title} · ${b.count}`}
                    subtitle={level.hint}
                    meta={t('risk.overdueLine', {percent: pct(b.count, d.activeLoans), amount: formatMoney(b.overdue)})}
                    badge={<StatusBadge tone={level.tone} label={level.label} />}
                    chevron
                    style={[s.row, level.key === 'npa' && b.count > 0 && s.npaRow]}
                    onPress={() => navigation.navigate('Overdue' as never, {bucket: level.key} as never)}
                  />
                );
              })}
            </Card>
          </Section>

          <View style={s.lastRun}>
            <Icon
              name={failed ? 'alert-circle-outline' : 'check-circle-outline'}
              size={16}
              color={failed ? 'danger' : 'success'}
            />
            <Text variant="small" color={failed ? 'danger' : 'muted'} style={s.lastRunText}>
              {d.lastRun
                ? failed
                  ? t('risk.lastRunFailed', {date: formatDateTime(d.lastRun.at, lang)})
                  : t('risk.lastRun', {date: formatDateTime(d.lastRun.at, lang)})
                : t('risk.neverRun')}
            </Text>
          </View>
        </>
      )}
      <ConfirmSheet ref={confirm.ref} />
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  block: {marginTop: t.space.md},
  row: {paddingHorizontal: t.space.lg},
  npaRow: {backgroundColor: t.colors.dangerSoft},
  lastRun: {flexDirection: 'row', alignItems: 'center', gap: t.space.xs, marginTop: t.space.lg},
  lastRunText: {flex: 1},
}));
