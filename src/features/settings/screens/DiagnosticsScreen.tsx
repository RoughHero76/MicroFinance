// Hidden Diagnostics (admin only; 5 taps on the version in About). Nightly
// jobs with their last run, recent crash reports from phones (BE-14), and
// the server's loan-status consistency check on demand. For support, not
// for daily use, so it stays plain.

import React, {useState} from 'react';
import {View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';
import {getBuildNumber, getVersion} from 'react-native-device-info';
import {useTranslation} from 'react-i18next';
import {brand} from '@/brand';
import {useI18n} from '@/i18n';
import {errorMessage} from '@/lib/api';
import {formatDateTime} from '@/lib/format';
import {getClientErrors, getCronStatus, getLoanDiagnostics} from '@/features/reports/api';
import {makeStyles} from '@/theme';
import {
  Button,
  Card,
  ErrorState,
  KeyValueRows,
  ListRow,
  OptionRow,
  Screen,
  Section,
  SkeletonRows,
  StatusBadge,
  Text,
  RefreshControl,
} from '@/ui';

export default function DiagnosticsScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const {lang} = useI18n();
  const navigation = useNavigation();
  const cron = useQuery({queryKey: ['diagnostics', 'cron'], queryFn: getCronStatus});
  const errors = useQuery({queryKey: ['diagnostics', 'errors'], queryFn: getClientErrors});
  const [check, setCheck] = useState<{running: boolean; text?: string}>({running: false});
  const [openError, setOpenError] = useState<string | null>(null);

  const runCheck = async () => {
    setCheck({running: true});
    try {
      const res = await getLoanDiagnostics();
      setCheck({running: false, text: JSON.stringify(res, null, 2).slice(0, 4000)});
    } catch (error) {
      setCheck({running: false, text: errorMessage(error, t)});
    }
  };

  return (
    <Screen
      header={{title: t('diagnostics.title')}}
      scroll
      refreshControl={
        <RefreshControl
          refreshing={cron.isRefetching || errors.isRefetching}
          onRefresh={() => {
            cron.refetch();
            errors.refetch();
          }}
        />
      }>
      <Card>
        <KeyValueRows
          dense
          rows={[
            {label: t('diagnostics.app'), value: `${getVersion()} (${getBuildNumber()})`},
            {label: t('diagnostics.brand'), value: brand.id},
            {label: t('diagnostics.server'), value: brand.apiUrl},
          ]}
        />
      </Card>

      <Section title={t('diagnostics.jobs')}>
        {cron.isPending ? (
          <SkeletonRows count={3} avatar={false} />
        ) : cron.isError ? (
          <ErrorState error={cron.error} onRetry={cron.refetch} />
        ) : (
          <Card padded={false}>
            {(cron.data ?? []).map(job => (
              <ListRow
                key={job.name}
                title={job.name}
                subtitle={
                  job.lastFinishedAt || job.lastStartedAt
                    ? `${formatDateTime((job.lastFinishedAt || job.lastStartedAt)!, lang)}${
                        job.durationMs != null ? ` · ${Math.round(job.durationMs / 1000)}s` : ''
                      }`
                    : job.schedule
                }
                meta={job.error ?? undefined}
                badge={
                  <StatusBadge
                    tone={job.status === 'success' ? 'success' : job.status === 'failed' ? 'danger' : 'neutral'}
                    label={job.status}
                  />
                }
                style={s.row}
              />
            ))}
          </Card>
        )}
      </Section>

      <Section title={t('diagnostics.crashes')}>
        {errors.isPending ? (
          <SkeletonRows count={3} avatar={false} />
        ) : errors.isError ? (
          <ErrorState error={errors.error} onRetry={errors.refetch} />
        ) : errors.data?.length ? (
          <Card padded={false}>
            {errors.data.map(e => (
              <ListRow
                key={e._id}
                title={e.message}
                subtitle={[formatDateTime(e.createdAt, lang), e.screen, e.appVersion, e.role]
                  .filter(Boolean)
                  .join(' · ')}
                meta={openError === e._id ? e.device : undefined}
                onPress={() => setOpenError(openError === e._id ? null : e._id)}
                style={s.row}
              />
            ))}
          </Card>
        ) : (
          <Text color="muted">{t('diagnostics.noCrashes')}</Text>
        )}
      </Section>

      <Section title={t('diagnostics.loanCheck')}>
        <Button title={t('diagnostics.runCheck')} variant="secondary" loading={check.running} onPress={runCheck} />
        {check.text ? (
          <Card style={s.output}>
            <Text variant="caption" selectable style={s.mono}>
              {check.text}
            </Text>
          </Card>
        ) : null}
      </Section>

      {__DEV__ ? (
        <View style={s.dev}>
          <OptionRow icon="palette-outline" title="UI kit" onPress={() => navigation.navigate('KitGallery' as never)} />
        </View>
      ) : null}
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  row: {paddingHorizontal: t.space.lg},
  output: {marginTop: t.space.md},
  mono: {fontFamily: 'monospace'},
  dev: {marginTop: t.space.lg},
}));
