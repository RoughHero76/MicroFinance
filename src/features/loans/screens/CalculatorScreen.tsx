// X7 Loan calculator, both roles. All 7 inputs from the old screen (loan
// amount, principal, start date, duration, frequency, grace, interest) and
// every result (installments, per installment, total repayment, start and
// end dates). Results refresh as you type. Admins get "Use for new loan":
// pick the customer, then Create loan opens pre-filled (A9).

import React, {useEffect, useState} from 'react';
import {View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {useI18n} from '@/i18n';
import {FREQUENCIES, LOAN_DURATIONS, type Frequency} from '@/lib/enums';
import {formatDate, formatMoney} from '@/lib/format';
import {useCan, useSession} from '@/features/auth/SessionProvider';
import {makeStyles} from '@/theme';
import {
  Card,
  DateField,
  ErrorState,
  Fab,
  KeyValueRows,
  MoneyField,
  Screen,
  Section,
  SegmentedControl,
  SelectField,
  Skeleton,
  Text,
  TextField,
} from '@/ui';
import {calculateLoan} from '../adminApi';

function useDebounced<T>(value: T, ms = 400): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export default function CalculatorScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const {lang} = useI18n();
  const navigation = useNavigation();
  const {settings} = useSession();
  const can = useCan();
  const [loanAmount, setLoanAmount] = useState<number | null>(null);
  const [principal, setPrincipal] = useState<number | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<Frequency>('Daily');
  const [start, setStart] = useState(new Date());
  const [grace, setGrace] = useState(String(settings?.gracePeriod ?? 0));
  const [interest, setInterest] = useState(String(settings?.defaultInterestRate ?? 3.38));

  const input = useDebounced({
    loanAmount,
    duration,
    frequency,
    start: start.toISOString(),
    grace: parseInt(grace, 10) || 0,
  });
  const ready = !!input.loanAmount && input.loanAmount > 0 && !!input.duration;
  const principalError =
    principal != null && loanAmount != null && principal > loanAmount ? t('create.principalTooHigh') : undefined;

  const result = useQuery({
    queryKey: ['calculator', input],
    queryFn: () =>
      calculateLoan({
        loanAmount: input.loanAmount!,
        loanDuration: input.duration!,
        installmentFrequency: input.frequency,
        loanStartDate: new Date(input.start),
        gracePeriod: input.grace,
      }),
    enabled: ready,
    staleTime: Infinity,
    placeholderData: prev => prev,
  });
  const r = ready ? result.data : undefined;

  const useForLoan = () =>
    navigation.navigate(
      'Search' as never,
      {
        pickFor: 'newLoan',
        prefill: {
          loanAmount: loanAmount ?? undefined,
          principalAmount: principal ?? undefined,
          loanDuration: duration ?? undefined,
          installmentFrequency: frequency,
          loanStartDate: start.toISOString(),
        },
      } as never,
    );

  return (
    <Screen
      header={{title: t('calculator.title')}}
      scroll
      keyboard
      fab={
        can('loan.create') && r && !principalError ? (
          <Fab icon="bank-plus" label={t('calculator.useForLoan')} onPress={useForLoan} />
        ) : undefined
      }>
      <Section title={t('calculator.inputs')}>
        <View style={s.row}>
          <View style={s.half}>
            <MoneyField label={t('create.amount')} required value={loanAmount} onChangeValue={setLoanAmount} />
          </View>
          <View style={s.half}>
            <MoneyField
              label={t('create.principal')}
              value={principal}
              onChangeValue={setPrincipal}
              error={principalError}
              showWords={false}
            />
          </View>
        </View>
        <SelectField<string>
          label={t('create.duration')}
          required
          value={duration}
          options={LOAN_DURATIONS.map(d => ({value: d, label: t('enums.days', {count: parseInt(d, 10)})}))}
          onChange={setDuration}
        />
        <Text variant="label" color="muted" style={s.label}>
          {t('create.frequency')}
        </Text>
        <SegmentedControl<Frequency>
          options={FREQUENCIES.map(f => ({value: f, label: t(`enums.frequency.${f}`)}))}
          value={frequency}
          onChange={setFrequency}
          style={s.segment}
        />
        <DateField label={t('create.startDate')} value={start} onChange={d => d && setStart(d)} />
        <View style={s.row}>
          <View style={s.half}>
            <TextField
              label={t('calculator.interest')}
              value={interest}
              onChangeText={setInterest}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={s.half}>
            <TextField label={t('calculator.grace')} value={grace} onChangeText={setGrace} keyboardType="number-pad" />
          </View>
        </View>
      </Section>

      <Section title={t('calculator.results')}>
        {!ready ? (
          <Text color="muted">{t('calculator.hint')}</Text>
        ) : result.isError && !r ? (
          <ErrorState error={result.error} onRetry={result.refetch} />
        ) : !r ? (
          <Skeleton height={140} />
        ) : (
          <Card>
            <Text variant="overline" color="muted">
              {t('calculator.perInstallment')}
            </Text>
            <Text variant="display" style={s.big}>
              {formatMoney(r.repaymentAmountPerInstallment)}
            </Text>
            <KeyValueRows
              rows={[
                {label: t('calculator.installments'), value: String(r.numberOfInstallments)},
                {label: t('calculator.total'), value: formatMoney(r.totalRepaymentAmount)},
                {
                  label: t('calculator.period'),
                  value: `${formatDate(start, lang, {short: true})} → ${formatDate(r.loanEndDate, lang, {
                    short: true,
                  })}`,
                },
              ]}
            />
          </Card>
        )}
      </Section>
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  row: {flexDirection: 'row', gap: t.space.sm},
  half: {flex: 1, minWidth: 0},
  label: {marginBottom: t.space.sm},
  segment: {marginBottom: t.space.md},
  big: {marginBottom: t.space.sm},
}));
