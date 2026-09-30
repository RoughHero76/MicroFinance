// A11 Close loan. Everything from today: the full summary (with advance
// credit and total outstanding), the amount with its minimum and maximum,
// the 3 options with hints, and the remaining principal and penalties.
// "Close loan…" opens a confirmation with every value and the warnings.
// Success goes back to the loan, which now shows Closed (B-2 fixed).

import React, {useEffect, useMemo, useState} from 'react';
import {View} from 'react-native';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {errorMessage} from '@/lib/api';
import {formatMoney} from '@/lib/format';
import {makeStyles} from '@/theme';
import {
  Card,
  ConfirmSheet,
  ErrorState,
  Fab,
  KeyValueRows,
  MoneyField,
  OptionRow,
  Screen,
  SkeletonRows,
  Text,
  toast,
  useConfirm,
} from '@/ui';
import {closeLoan} from '../adminApi';
import {getLoanDetail, loanKeys} from '../api';
import type {Loan} from '../types';

// Advance credit counts toward closing, so the bounds for new cash include it
// (same rules as the server's closeLoan).
export function paymentBounds(loan: Loan, opts: {forgiveLoan: boolean; forgivePenalties: boolean}) {
  const advance = loan.advanceBalance || 0;
  const penalties = loan.totalPenaltyAmount || 0;
  const totalDue = (loan.outstandingAmount || 0) + penalties;
  const max = Math.max(0, totalDue - advance);
  if (opts.forgiveLoan) return {min: 0, max, advance, totalDue, penalties};
  const required = !opts.forgivePenalties && penalties > 0 ? totalDue : loan.outstandingAmount || 0;
  return {min: Math.max(0, required - advance), max, advance, totalDue, penalties};
}

export default function CloseLoanScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{CloseLoan: {loanId: string}}, 'CloseLoan'>>();
  const {loanId} = route.params;
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const query = useQuery({queryKey: loanKeys.detail(loanId), queryFn: () => getLoanDetail('admin', loanId)});
  const loan = query.data?.loan;

  const [forgiveLoan, setForgiveLoan] = useState(false);
  const [forgivePenalties, setForgivePenalties] = useState(false);
  const [deleteDocs, setDeleteDocs] = useState(false);
  const [amount, setAmount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bounds = useMemo(
    () => (loan ? paymentBounds(loan, {forgiveLoan, forgivePenalties}) : null),
    [loan, forgiveLoan, forgivePenalties],
  );

  // Pre-fill the minimum, as the old screen did.
  useEffect(() => {
    if (bounds && amount == null) setAmount(bounds.min);
  }, [bounds, amount]);

  const paying = amount ?? 0;
  const effective = paying + (bounds?.advance ?? 0);
  const towardPrincipal = loan ? Math.min(loan.outstandingAmount, effective) : 0;
  const remainingPrincipal = loan ? Math.max(0, loan.outstandingAmount - towardPrincipal) : 0;
  const remainingPenalties = bounds ? Math.max(0, bounds.penalties - Math.max(0, effective - towardPrincipal)) : 0;

  const validate = () => {
    if (!bounds) return false;
    let message: string | null = null;
    if (paying < 0) message = t('errors.invalidAmount');
    else if (!forgiveLoan && paying + 0.001 < bounds.min)
      message = t('errors.minAmount', {amount: formatMoney(bounds.min)});
    else if (paying > bounds.max + 0.001) message = t('errors.maxAmount', {amount: formatMoney(bounds.max)});
    setError(message);
    return message === null;
  };

  const submit = () => {
    if (!loan || !validate()) return;
    const warnings = [
      forgiveLoan && remainingPrincipal > 0
        ? t('closeLoan.warnForgive', {amount: formatMoney(remainingPrincipal)})
        : null,
      forgivePenalties && remainingPenalties > 0
        ? t('closeLoan.warnForgivePenalties', {amount: formatMoney(remainingPenalties)})
        : null,
      deleteDocs ? t('closeLoan.warnDocs') : null,
    ].filter(Boolean) as string[];
    confirm.ask({
      title: t('closeLoan.confirmTitle', {number: loan.loanNumber}),
      body: (
        <View>
          <KeyValueRows
            dense
            rows={[
              {label: t('closeLoan.amountPaying'), value: formatMoney(paying), keepEmpty: true},
              {label: t('closeLoan.advanceCredit'), value: bounds?.advance ? formatMoney(bounds.advance) : ''},
              {label: t('closeLoan.forgiveLoan'), value: forgiveLoan ? t('common.yes') : t('common.no')},
              {label: t('closeLoan.forgivePenalties'), value: forgivePenalties ? t('common.yes') : t('common.no')},
              {label: t('closeLoan.deleteDocs'), value: deleteDocs ? t('common.yes') : t('common.no')},
              {
                label: t('closeLoan.remaining'),
                value: `${formatMoney(remainingPrincipal)} / ${formatMoney(remainingPenalties)}`,
              },
            ]}
          />
          {warnings.map(w => (
            <Text key={w} variant="small" color="danger" style={s.warning}>
              ⚠ {w}
            </Text>
          ))}
        </View>
      ),
      confirmLabel: t('closeLoan.confirmButton'),
      destructive: true,
      onConfirm: async () => {
        try {
          await closeLoan({loanId, amount: paying, forgiveLoan, forgivePenalties, deleteLoanDocuments: deleteDocs});
          queryClient.invalidateQueries({queryKey: ['loans']});
          queryClient.invalidateQueries({queryKey: ['customers']});
          queryClient.invalidateQueries({queryKey: ['dashboard']});
          toast.success(t('closeLoan.closed'), {message: `#${loan.loanNumber}`});
          // Back to the loan, which now shows Closed.
          setTimeout(() => navigation.goBack(), 300);
        } catch (err) {
          toast.error(errorMessage(err, t));
          throw err;
        }
      },
    });
  };

  return (
    <Screen
      header={{title: loan ? t('closeLoan.title', {number: loan.loanNumber}) : t('loanAdmin.close')}}
      scroll
      keyboard
      fab={loan ? <Fab icon="lock-check-outline" label={t('closeLoan.submit')} onPress={submit} /> : undefined}>
      {query.isPending ? (
        <SkeletonRows count={6} avatar={false} />
      ) : query.isError || !loan || !bounds ? (
        <ErrorState error={query.error} what={t('words.loan')} onRetry={query.refetch} />
      ) : (
        <>
          <Card>
            <KeyValueRows
              rows={[
                {label: t('closeLoan.loanAmount'), value: formatMoney(loan.loanAmount), keepEmpty: true},
                {
                  label: t('closeLoan.outstandingPrincipal'),
                  value: formatMoney(loan.outstandingAmount),
                  keepEmpty: true,
                },
                {label: t('closeLoan.totalPaid'), value: formatMoney(loan.totalPaid ?? 0), keepEmpty: true},
                {label: t('closeLoan.penalties'), value: formatMoney(bounds.penalties), keepEmpty: true},
                {label: t('closeLoan.advanceCredit'), value: bounds.advance ? `− ${formatMoney(bounds.advance)}` : ''},
                {
                  label: t('closeLoan.totalOutstanding'),
                  value: formatMoney(Math.max(0, bounds.totalDue - bounds.advance)),
                  keepEmpty: true,
                },
              ]}
            />
          </Card>

          <Card style={s.gap}>
            <MoneyField
              label={t('closeLoan.amountPaying')}
              value={amount}
              onChangeValue={setAmount}
              error={error}
              hint={
                forgiveLoan
                  ? t('closeLoan.boundsForgive', {max: formatMoney(bounds.max)})
                  : t('closeLoan.bounds', {min: formatMoney(bounds.min), max: formatMoney(bounds.max)})
              }
            />
          </Card>

          <Card padded={false} style={s.gap}>
            <OptionRow
              title={t('closeLoan.forgiveLoan')}
              hint={t('closeLoan.forgiveLoanHint')}
              toggle={{value: forgiveLoan, onChange: setForgiveLoan}}
            />
            <OptionRow
              title={t('closeLoan.forgivePenalties')}
              hint={t('closeLoan.forgivePenaltiesHint')}
              toggle={{value: forgivePenalties, onChange: setForgivePenalties}}
            />
            <OptionRow
              title={t('closeLoan.deleteDocs')}
              hint={t('closeLoan.deleteDocsHint')}
              toggle={{value: deleteDocs, onChange: setDeleteDocs}}
            />
          </Card>

          <Text color="muted" tabular style={s.remaining}>
            {t('closeLoan.remaining')}: {formatMoney(remainingPrincipal)} / {formatMoney(remainingPenalties)}
          </Text>
        </>
      )}
      <ConfirmSheet ref={confirm.ref} />
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  gap: {marginTop: t.space.md},
  warning: {marginTop: t.space.sm},
  remaining: {marginTop: t.space.lg},
}));
