// A7b · E6b: one installment. Facts as label/value rows; each payment gets
// 3 short lines (amount and status; date and method; collector and its
// share of a split payment). Actions are small text buttons: employees
// collect or apply a penalty; admins also edit the installment and remove a
// penalty (W3).

import React, {forwardRef} from 'react';
import {View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useI18n} from '@/i18n';
import {formatDate, formatDateTime, formatMoney} from '@/lib/format';
import {makeStyles} from '@/theme';
import {BottomSheet, Button, KeyValueRows, StatusBadge, Text, type SheetHandle} from '@/ui';
import {
  allocationFor,
  amountPaidSoFar,
  amountStillDue,
  collectorName,
  installmentTotal,
  isSplitPayment,
  penaltyAmount,
} from '../schedule';
import type {Installment} from '../types';

export interface InstallmentActions {
  onCollect?: () => void;
  onPenalty?: () => void;
  onRemovePenalty?: () => void;
  onEdit?: () => void;
}

export const InstallmentSheet = forwardRef<SheetHandle, {installment: Installment | null} & InstallmentActions>(
  function InstallmentSheet({installment, onCollect, onPenalty, onRemovePenalty, onEdit}, ref) {
    const s = useStyles();
    const {t} = useTranslation();
    const {lang} = useI18n();
    const item = installment;
    const penalty = item ? penaltyAmount(item) : null;
    const open = item ? amountStillDue(item) > 0 : false;
    const payments = item?.repayments ?? [];

    return (
      <BottomSheet
        ref={ref}
        title={item ? t('loan.installmentTitle', {number: item.loanInstallmentNumber ?? '-'}) : undefined}
        footer={
          item ? (
            <>
              {onRemovePenalty && item.penaltyApplied ? (
                <Button title={t('loan.removePenalty')} variant="text" onPress={onRemovePenalty} />
              ) : null}
              {onPenalty && open && !item.penaltyApplied ? (
                <Button title={t('collect.penalty')} variant="text" onPress={onPenalty} />
              ) : null}
              {onEdit ? <Button title={t('common.edit')} variant="text" onPress={onEdit} /> : null}
              {onCollect && open ? <Button title={t('loan.collect')} onPress={onCollect} /> : null}
            </>
          ) : null
        }>
        {item ? (
          <>
            <StatusBadge set="schedule" status={item.status} />
            <KeyValueRows
              style={s.facts}
              rows={[
                {label: t('loan.dueDate'), value: formatDate(item.dueDate, lang)},
                {label: t('loan.originalEmi'), value: formatMoney(installmentTotal(item))},
                {label: t('loan.paidSoFar'), value: formatMoney(amountPaidSoFar(item))},
                {label: t('loan.stillDue'), value: open ? formatMoney(amountStillDue(item)) : ''},
                {
                  label: t('loan.penalty'),
                  value: penalty != null ? formatMoney(penalty) : t('loan.penaltyNone'),
                  valueColor: penalty != null ? 'danger' : 'muted',
                },
                {label: t('loan.note'), value: item.logicNote || item.LogicNote},
              ]}
            />
            {payments.length ? (
              <>
                <Text variant="overline" color="muted" style={s.paymentsTitle}>
                  {t('loan.paymentsCount', {count: payments.length})}
                </Text>
                {payments.map(p => {
                  const share = allocationFor(p, item._id);
                  return (
                    <View key={p._id} style={s.payment}>
                      <View style={s.line}>
                        <Text weight="semibold" tabular style={s.flex}>
                          {formatMoney(share)}
                        </Text>
                        <StatusBadge set="repayment" status={p.status} />
                      </View>
                      <Text variant="small" color="muted">
                        {[
                          formatDateTime(p.paymentDate, lang),
                          t(`enums.paymentMethod.${p.paymentMethod}`, {defaultValue: p.paymentMethod}),
                          p.transactionId,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                      <Text variant="small" color="muted">
                        {[
                          collectorName(p, t('loan.admin')),
                          isSplitPayment(p) ? t('loan.partOf', {amount: formatMoney(p.amount)}) : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                  );
                })}
              </>
            ) : null}
          </>
        ) : null}
      </BottomSheet>
    );
  },
);

const useStyles = makeStyles(t => ({
  facts: {marginTop: t.space.sm},
  paymentsTitle: {marginTop: t.space.lg, marginBottom: t.space.sm},
  payment: {
    padding: t.space.md,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surface2,
    marginBottom: t.space.sm,
    gap: 2,
  },
  line: {flexDirection: 'row', alignItems: 'center', gap: t.space.sm},
  flex: {flex: 1},
}));
