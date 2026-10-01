// A7c Edit installment: the same status-dependent fields as the old modal
// (payment date, amount, method, collector, penalty amount / reason / date,
// transaction ID), and every field is sent (B-1).

import React, {forwardRef, useEffect, useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {useI18n} from '@/i18n';
import {errorMessage} from '@/lib/api';
import {PAYMENT_METHODS, SCHEDULE_STATUSES, type PaymentMethod, type ScheduleStatus} from '@/lib/enums';
import {formatDate} from '@/lib/format';
import {listEmployees, staffKeys} from '@/features/staff/api';
import {
  BottomSheet,
  Button,
  Chips,
  DateField,
  MoneyField,
  SelectField,
  Text,
  TextField,
  toast,
  type SheetHandle,
} from '@/ui';
import {editInstallment} from '../adminApi';
import {loanKeys} from '../api';
import {amountPaidSoFar, installmentTotal} from '../schedule';
import type {Installment} from '../types';

type Field = 'date' | 'amount' | 'method' | 'collector' | 'penalty';

// Which fields each change of status needs (mirrors the old modal and the
// server's transition handlers).
export function fieldsFor(from: ScheduleStatus, to: ScheduleStatus): Field[] {
  if (from === to) return [];
  const paidLike = ['Paid', 'PartiallyPaid', 'AdvancePaid', 'OverduePaid'];
  switch (from) {
    case 'Pending':
      if (to === 'Paid') return ['date', 'collector'];
      if (to === 'PartiallyPaid' || to === 'OverduePaid') return ['date', 'amount', 'method', 'collector'];
      if (to === 'Overdue') return ['penalty'];
      if (to === 'AdvancePaid') return ['date', 'method', 'collector'];
      return [];
    case 'Paid':
      if (to === 'PartiallyPaid') return ['date', 'amount', 'penalty', 'collector'];
      if (to === 'AdvancePaid') return ['date', 'collector'];
      return [];
    case 'PartiallyPaid':
      if (to === 'Paid') return ['date', 'amount', 'collector'];
      if (to === 'Overdue' || to === 'OverduePaid') return ['amount', 'penalty', 'collector'];
      if (to === 'AdvancePaid') return ['date', 'amount', 'collector'];
      return [];
    case 'Overdue':
      return paidLike.includes(to) ? ['date', 'amount', 'method', 'collector'] : [];
    case 'OverduePaid':
      if (to === 'PartiallyPaid') return ['date', 'amount', 'collector'];
      if (to === 'AdvancePaid') return ['date', 'amount', 'method', 'collector'];
      return [];
    case 'AdvancePaid':
      if (to === 'Paid') return ['date', 'method', 'collector'];
      if (to === 'PartiallyPaid' || to === 'OverduePaid') return ['date', 'amount', 'method', 'collector'];
      return [];
    case 'Waived':
      return paidLike.includes(to) ? ['date', 'amount', 'method', 'collector'] : to === 'Overdue' ? ['penalty'] : [];
    default:
      return [];
  }
}

export const EditInstallmentSheet = forwardRef<SheetHandle, {installment: Installment | null; loanId: string}>(
  function EditInstallmentSheet({installment, loanId}, ref) {
    const {t} = useTranslation();
    const {lang} = useI18n();
    const queryClient = useQueryClient();
    const employees = useQuery({queryKey: staffKeys.list(), queryFn: listEmployees, staleTime: 5 * 60 * 1000});

    const [status, setStatus] = useState<ScheduleStatus>('Pending');
    const [date, setDate] = useState<Date | null>(new Date());
    const [amount, setAmount] = useState<number | null>(null);
    const [method, setMethod] = useState<PaymentMethod | null>(null);
    const [collector, setCollector] = useState<string | null>(null);
    const [penalty, setPenalty] = useState<number | null>(null);
    const [reason, setReason] = useState('');
    const [penaltyDate, setPenaltyDate] = useState<Date | null>(new Date());
    const [txn, setTxn] = useState('');

    useEffect(() => {
      if (!installment) return;
      setStatus(installment.status);
      setDate(installment.paymentDate ? new Date(installment.paymentDate) : new Date());
      setAmount(installment.status === 'PartiallyPaid' ? amountPaidSoFar(installment) : installmentTotal(installment));
      setMethod(null);
      setCollector(null);
      setPenalty(null);
      setReason('');
      setPenaltyDate(new Date());
      setTxn('');
    }, [installment]);

    const fields = installment ? fieldsFor(installment.status, status) : [];

    const save = useMutation({
      mutationFn: () =>
        editInstallment({
          id: installment!._id,
          status,
          amount: amount ?? undefined,
          paymentDate: date ? date.toISOString() : undefined,
          paymentMethod: method ?? undefined,
          penaltyAmount: penalty ?? undefined,
          penaltyReason: reason || undefined,
          penaltyAppliedDate: penaltyDate ? penaltyDate.toISOString() : undefined,
          transactionId: txn || undefined,
          collectedBy: collector ?? undefined,
        }),
      onSuccess: () => {
        (ref as React.RefObject<SheetHandle>).current?.close();
        queryClient.invalidateQueries({queryKey: loanKeys.detail(loanId)});
        queryClient.invalidateQueries({queryKey: ['loans', 'schedule', loanId]});
        queryClient.invalidateQueries({queryKey: loanKeys.payments(loanId)});
        toast.success(t('loanAdmin.saved'));
      },
      onError: error => toast.error(errorMessage(error, t)),
    });

    if (!installment) return <BottomSheet ref={ref}>{null}</BottomSheet>;

    return (
      <BottomSheet
        ref={ref}
        title={t('loanAdmin.editTitle', {
          number: installment.loanInstallmentNumber ?? '-',
          date: formatDate(installment.dueDate, lang, {short: true}),
        })}
        subtitle={`${t(`status.schedule.${installment.status}`)} → ${t(`status.schedule.${status}`)}`}
        dismissible={!save.isPending}
        snapPoints={['85%']}
        footer={
          <>
            <Button
              title={t('common.cancel')}
              variant="text"
              onPress={() => (ref as React.RefObject<SheetHandle>).current?.close()}
            />
            <Button
              title={t('common.save')}
              onPress={() => save.mutate()}
              loading={save.isPending}
              disabled={status === installment.status && !txn}
            />
          </>
        }>
        <Text variant="label" weight="semibold">
          {t('loanAdmin.newStatus')}
        </Text>
        <Chips<ScheduleStatus>
          wrap
          options={SCHEDULE_STATUSES.map(st => ({value: st, label: t(`status.schedule.${st}`)}))}
          value={status}
          onChange={setStatus}
          style={{marginVertical: 8}}
        />
        <Text variant="caption" color="muted" style={{marginBottom: 12}}>
          {t('loanAdmin.fieldsHint')}
        </Text>
        {fields.includes('date') ? (
          <DateField label={t('loanAdmin.paymentDate')} value={date} onChange={setDate} />
        ) : null}
        {fields.includes('amount') ? (
          <MoneyField label={t('pay.amount')} value={amount} onChangeValue={setAmount} />
        ) : null}
        {fields.includes('method') ? (
          <SelectField<PaymentMethod>
            label={t('pay.method')}
            value={method}
            options={PAYMENT_METHODS.map(m => ({value: m, label: t(`enums.paymentMethod.${m}`)}))}
            onChange={setMethod}
          />
        ) : null}
        {fields.includes('collector') ? (
          <SelectField<string>
            label={t('loanAdmin.collectedBy')}
            value={collector}
            placeholder={t('common.admin')}
            options={(employees.data ?? []).map(e => ({value: e._id, label: `${e.fname} ${e.lname}`}))}
            onChange={setCollector}
          />
        ) : null}
        {fields.includes('penalty') ? (
          <>
            <MoneyField
              label={t('loanAdmin.penaltyAmount')}
              value={penalty}
              onChangeValue={setPenalty}
              showWords={false}
            />
            <TextField label={t('loanAdmin.penaltyReason')} value={reason} onChangeText={setReason} />
            <DateField label={t('loanAdmin.penaltyDate')} value={penaltyDate} onChange={setPenaltyDate} />
          </>
        ) : null}
        <TextField label={t('pay.transactionId')} value={txn} onChangeText={setTxn} autoCapitalize="characters" />
      </BottomSheet>
    );
  },
);
