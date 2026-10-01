// M-2 Business settings (admin only): default interest, grace period,
// optional loan-number prefix (empty by default), penalty rate, minimum
// payment, SMA thresholds, and the optional modules (M-11; Cash handover is
// off by default). Every change goes to the audit log, and the screen shows
// who changed it last (M-13).

import React, {useEffect, useState} from 'react';
import {View} from 'react-native';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {useI18n} from '@/i18n';
import {errorMessage} from '@/lib/api';
import {formatDate} from '@/lib/format';
import {updateBusinessSettings, type BusinessSettings} from '@/features/auth/api';
import {useSession} from '@/features/auth/SessionProvider';
import {makeStyles} from '@/theme';
import {Card, Fab, MoneyField, OptionRow, Screen, Section, SkeletonRows, Text, TextField, toast} from '@/ui';

const num = (text: string) => (text.trim() === '' ? NaN : Number(text.replace(',', '.')));

export default function BusinessSettingsScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const {lang} = useI18n();
  const {settings} = useSession();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});
  const [modules, setModules] = useState<BusinessSettings['modules'] | null>(null);
  const [minPayment, setMinPayment] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!settings) return;
    setForm({
      interest: String(settings.defaultInterestRate),
      grace: String(settings.gracePeriod),
      prefix: settings.loanNumberPrefix ?? '',
      penalty: String(Math.round(settings.penaltyRate * 1000) / 10),
      sma0: String(settings.smaThresholds.sma0),
      sma1: String(settings.smaThresholds.sma1),
      sma2: String(settings.smaThresholds.sma2),
    });
    setModules(settings.modules);
    setMinPayment(settings.minPayment);
  }, [settings]);

  const save = useMutation({
    mutationFn: () =>
      updateBusinessSettings({
        defaultInterestRate: num(form.interest),
        gracePeriod: num(form.grace),
        loanNumberPrefix: form.prefix.trim(),
        penaltyRate: num(form.penalty) / 100,
        minPayment: minPayment ?? 0,
        smaThresholds: {sma0: num(form.sma0), sma1: num(form.sma1), sma2: num(form.sma2)},
        modules: modules ?? undefined,
      }),
    onSuccess: data => {
      queryClient.setQueryData(['settings'], data);
      toast.success(t('business.saved'));
    },
    onError: err => toast.error(errorMessage(err, t)),
  });

  const submit = () => {
    const values = [form.interest, form.grace, form.penalty, form.sma0, form.sma1, form.sma2].map(num);
    if (values.some(v => !Number.isFinite(v) || v < 0)) return setError(t('errors.invalidAmount'));
    if (!(num(form.sma0) < num(form.sma1) && num(form.sma1) < num(form.sma2))) return setError(t('business.smaOrder'));
    setError(null);
    save.mutate();
  };

  const field = (key: string, label: string, hint?: string) => (
    <TextField
      label={label}
      hint={hint}
      value={form[key] ?? ''}
      onChangeText={v => setForm(f => ({...f, [key]: v}))}
      keyboardType="decimal-pad"
    />
  );

  if (!settings || !modules) {
    return (
      <Screen header={{title: t('business.title')}}>
        <SkeletonRows count={6} avatar={false} />
      </Screen>
    );
  }

  return (
    <Screen
      header={{title: t('business.title')}}
      scroll
      keyboard
      fab={<Fab icon="content-save-outline" label={t('common.save')} onPress={submit} loading={save.isPending} />}>
      {settings.updatedByName && settings.updatedAt ? (
        <Text variant="small" color="muted" style={s.last}>
          {t('business.lastChanged', {name: settings.updatedByName, date: formatDate(settings.updatedAt, lang)})}
        </Text>
      ) : null}
      <Section title={t('business.loans')}>
        <Card>
          {field('interest', t('business.interest'))}
          {field('grace', t('business.grace'))}
          <TextField
            label={t('business.prefix')}
            hint={t('business.prefixHint')}
            value={form.prefix ?? ''}
            onChangeText={v => setForm(f => ({...f, prefix: v}))}
            autoCapitalize="characters"
            maxLength={10}
          />
        </Card>
      </Section>
      <Section title={t('business.collections')}>
        <Card>
          {field('penalty', t('business.penaltyRate'))}
          <MoneyField
            label={t('business.minPayment')}
            value={minPayment}
            onChangeValue={setMinPayment}
            showWords={false}
          />
        </Card>
      </Section>
      <Section title={t('business.modules')}>
        <Card padded={false} dividers>
          <OptionRow
            title={t('business.moduleLeads')}
            toggle={{value: modules.leads, onChange: v => setModules({...modules, leads: v})}}
          />
          <OptionRow
            title={t('business.moduleCash')}
            toggle={{value: modules.cashHandover, onChange: v => setModules({...modules, cashHandover: v})}}
          />
          <OptionRow
            title={t('business.modulePerformance')}
            toggle={{value: modules.performanceReport, onChange: v => setModules({...modules, performanceReport: v})}}
          />
        </Card>
      </Section>
      <Section title={t('business.risk')}>
        <Card>
          <View style={s.row}>
            {(['sma0', 'sma1', 'sma2'] as const).map((key, level) => (
              <View key={key} style={s.third}>
                {field(key, t('business.sma', {level}))}
              </View>
            ))}
          </View>
          <Text variant="small" color="muted">
            {t('business.riskHint')}
          </Text>
          {error ? (
            <Text variant="small" color="danger" style={s.error}>
              {error}
            </Text>
          ) : null}
        </Card>
      </Section>
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  last: {marginBottom: t.space.md},
  row: {flexDirection: 'row', gap: t.space.sm},
  third: {flex: 1, minWidth: 0},
  error: {marginTop: t.space.sm},
}));
