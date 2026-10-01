// E3 Record payment, E3b Apply penalty and E11 receipt, used by Collect, the
// overdue list and the loan screen (all through /pay).
//
//   const collect = useCollect();
//   collect.pay(target) / collect.penalty(target)
//   {collect.sheets}

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {View} from 'react-native';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {brand} from '@/brand';
import {useI18n} from '@/i18n';
import {errorMessage, isApiError} from '@/lib/api';
import {PAYMENT_METHODS, type PaymentMethod} from '@/lib/enums';
import {formatMoney} from '@/lib/format';
import {haptics} from '@/lib/haptics';
import {openSms, openWhatsApp} from '@/lib/messaging';
import {buildPenaltyNotice, buildReceipt} from '@/lib/receipt';
import {readJson, StorageKeys, writeJson} from '@/lib/storage';
import {useSession} from '@/features/auth/SessionProvider';
import {collectKeys, type CollectionItem} from '@/features/collect/api';
import {animateNextLayout} from '@/lib/motion';
import {customerKeys} from '@/features/customers/api';
import {listEmployees, staffKeys} from '@/features/staff/api';
import {makeStyles} from '@/theme';
import {
  BottomSheet,
  Button,
  Chips,
  ConfirmSheet,
  MoneyField,
  SelectField,
  OptionRow,
  Switch,
  Text,
  TextField,
  toast,
  useConfirm,
  useIsOffline,
  type SheetHandle,
} from '@/ui';
import {applyPenalty, loanKeys, recordPayment} from '../api';
import type {PayResult} from '../types';

export interface CollectTarget {
  loanId: string;
  loanNumber: string;
  installmentId: string;
  installmentNumber?: number;
  /** The full installment (EMI), for the big-number check. */
  installmentAmount: number;
  /** What's still owed on this installment (pre-fills the amount). */
  dueAmount: number;
  /** What's still owed on the whole loan, if known. */
  outstanding?: number;
  customerName: string;
  phone?: string;
}

interface ReceiptState {
  target: CollectTarget;
  result: PayResult;
  amount: number;
  method: PaymentMethod;
}

export function useCollect() {
  const payRef = useRef<SheetHandle>(null);
  const penaltyRef = useRef<SheetHandle>(null);
  const receiptRef = useRef<SheetHandle>(null);
  const [target, setTarget] = useState<CollectTarget | null>(null);
  const [receipt, setReceipt] = useState<ReceiptState | null>(null);

  const pay = useCallback((next: CollectTarget) => {
    setTarget(next);
    requestAnimationFrame(() => payRef.current?.open());
  }, []);

  const penalty = useCallback((next: CollectTarget) => {
    setTarget(next);
    requestAnimationFrame(() => penaltyRef.current?.open());
  }, []);

  const onPaid = useCallback((state: ReceiptState) => {
    payRef.current?.close();
    setReceipt(state);
    requestAnimationFrame(() => receiptRef.current?.open());
  }, []);

  const sheets = (
    <>
      <PaymentSheet sheetRef={payRef} target={target} onPaid={onPaid} />
      <PenaltySheet sheetRef={penaltyRef} target={target} />
      <ReceiptSheet sheetRef={receiptRef} receipt={receipt} />
    </>
  );

  return {pay, penalty, sheets};
}

function useInvalidateMoney() {
  const queryClient = useQueryClient();
  return useCallback(
    (loanId: string) => {
      queryClient.invalidateQueries({queryKey: collectKeys.today});
      queryClient.invalidateQueries({queryKey: collectKeys.dashboard});
      queryClient.invalidateQueries({queryKey: ['overdue']});
      queryClient.invalidateQueries({queryKey: ['payments']});
      queryClient.invalidateQueries({queryKey: customerKeys.all});
      queryClient.invalidateQueries({queryKey: loanKeys.detail(loanId)});
      queryClient.invalidateQueries({queryKey: ['loans', 'schedule', loanId]});
      queryClient.invalidateQueries({queryKey: loanKeys.payments(loanId)});
    },
    [queryClient],
  );
}

function PaymentSheet({
  sheetRef,
  target,
  onPaid,
}: {
  sheetRef: React.RefObject<SheetHandle>;
  target: CollectTarget | null;
  onPaid: (state: ReceiptState) => void;
}) {
  const s = useStyles();
  const {t} = useTranslation();
  const {settings, role} = useSession();
  const admin = role === 'admin';
  const offline = useIsOffline();
  const invalidate = useInvalidateMoney();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const [txn, setTxn] = useState('');
  const [errors, setErrors] = useState<{amount?: string; txn?: string}>({});
  // Admins: record as themselves ('me') or on behalf of an employee.
  const [collector, setCollector] = useState('me');
  const employees = useQuery({
    queryKey: staffKeys.list(),
    queryFn: listEmployees,
    enabled: admin,
    staleTime: 5 * 60 * 1000,
  });

  // New target: pre-fill what's due; the method defaults to the last used (P-06).
  useEffect(() => {
    if (!target) return;
    setAmount(target.dueAmount > 0 ? target.dueAmount : null);
    setTxn('');
    setErrors({});
    setCollector('me');
    readJson<PaymentMethod>(StorageKeys.lastPaymentMethod, 'Cash').then(m =>
      setMethod(PAYMENT_METHODS.includes(m) ? m : 'Cash'),
    );
  }, [target]);

  const minPayment = settings?.minPayment ?? 100;
  const min = target && target.dueAmount > 0 ? Math.min(minPayment, target.dueAmount) : minPayment;

  const mutation = useMutation({
    mutationFn: () =>
      recordPayment({
        loanId: target!.loanId,
        installmentId: target!.installmentId,
        amount: amount!,
        paymentMethod: method,
        transactionId: txn,
        collectedBy: admin && collector !== 'me' ? collector : undefined,
      }),
    onSuccess: result => {
      writeJson(StorageKeys.lastPaymentMethod, method);
      // W7: a fully paid row glides into "Done" on Collect right away; the
      // refetch below confirms it.
      if (amount! >= target!.dueAmount) {
        const today = queryClient.getQueryData<CollectionItem[]>(collectKeys.today);
        if (today?.some(item => item._id === target!.installmentId)) {
          animateNextLayout();
          queryClient.setQueryData<CollectionItem[]>(
            collectKeys.today,
            today.map(item => (item._id === target!.installmentId ? {...item, done: true} : item)),
          );
        }
      }
      invalidate(target!.loanId);
      haptics.success();
      toast.success(t('pay.recorded'), {message: `${formatMoney(amount!)} · ${t('pay.waiting')}`});
      onPaid({target: target!, result, amount: amount!, method});
    },
    onError: error => {
      if (isApiError(error) && error.code === 'PAY_DUPLICATE_TXN') {
        setErrors({txn: errorMessage(error, t)});
      } else if (isApiError(error) && error.code === 'PAY_MIN_AMOUNT') {
        setErrors({amount: errorMessage(error, t)});
      } else {
        toast.error(errorMessage(error, t));
      }
    },
  });

  const submit = () => {
    if (!target) return;
    if (!amount || amount <= 0) return setErrors({amount: t('errors.invalidAmount')});
    if (amount < min) return setErrors({amount: t('errors.minAmount', {amount: formatMoney(min)})});
    setErrors({});
    // P-17: ask once before sending an amount that looks like a slipped zero.
    const times = target.installmentAmount > 0 ? amount / target.installmentAmount : 0;
    const overOutstanding = target.outstanding != null && amount > target.outstanding + 0.001;
    if (times > 3 || overOutstanding) {
      confirm.ask({
        title: t('pay.bigTitle'),
        message: overOutstanding
          ? t('pay.bigOutstanding', {amount: formatMoney(amount), outstanding: formatMoney(target.outstanding)})
          : t('pay.bigMultiple', {amount: formatMoney(amount), times: Math.round(times)}),
        confirmLabel: t('pay.continue'),
        onConfirm: () => {
          mutation.mutate();
        },
      });
      return;
    }
    mutation.mutate();
  };

  return (
    <>
      <BottomSheet
        ref={sheetRef}
        title={t('pay.title')}
        subtitle={
          target
            ? [
                target.customerName.split(' ')[0],
                `#${target.loanNumber}`,
                target.installmentNumber ? t('pay.installmentShort', {number: target.installmentNumber}) : null,
              ]
                .filter(Boolean)
                .join(' · ')
            : undefined
        }
        dismissible={!mutation.isPending}
        footer={
          <>
            <Button
              title={t('common.cancel')}
              variant="text"
              onPress={() => sheetRef.current?.close()}
              disabled={mutation.isPending}
            />
            <Button
              title={t('pay.confirm', {amount: formatMoney(amount ?? 0)})}
              onPress={submit}
              loading={mutation.isPending}
              disabled={offline || !amount}
            />
          </>
        }>
        {offline ? (
          <Text variant="small" color="warning" style={s.offline}>
            {t('collect.offlinePay')}
          </Text>
        ) : null}
        {admin ? (
          <SelectField<string>
            label={t('pay.collectedBy')}
            value={collector}
            onChange={setCollector}
            options={[
              {value: 'me', label: t('pay.collectedByMe')},
              ...(employees.data ?? [])
                .filter(e => e.accountStatus !== false)
                .map(e => ({value: e._id, label: `${e.fname} ${e.lname}`.trim()})),
            ]}
            hint={collector === 'me' ? undefined : t('pay.collectedByHint')}
          />
        ) : null}
        <MoneyField
          large
          label={t('pay.amount')}
          value={amount}
          onChangeValue={setAmount}
          hint={t('pay.hint', {min: formatMoney(min)})}
          error={errors.amount}
          autoFocus
        />
        <Text variant="label" weight="semibold" style={s.label}>
          {t('pay.method')}
        </Text>
        <Chips<PaymentMethod>
          wrap
          options={PAYMENT_METHODS.map(m => ({value: m, label: t(`enums.paymentMethod.${m}`)}))}
          value={method}
          onChange={setMethod}
          style={s.methods}
        />
        <TextField
          label={t('pay.transactionId')}
          placeholder={t('pay.transactionPlaceholder')}
          value={txn}
          onChangeText={setTxn}
          error={errors.txn}
          autoCapitalize="characters"
        />
      </BottomSheet>
      <ConfirmSheet ref={confirm.ref} />
    </>
  );
}

function PenaltySheet({sheetRef, target}: {sheetRef: React.RefObject<SheetHandle>; target: CollectTarget | null}) {
  const s = useStyles();
  const {t} = useTranslation();
  const {lang} = useI18n();
  const {role} = useSession();
  const invalidate = useInvalidateMoney();
  const [amount, setAmount] = useState<number | null>(null);
  const [tell, setTell] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAmount(null);
    setError(null);
    setTell(!!target?.phone);
  }, [target]);

  const mutation = useMutation({
    mutationFn: () => applyPenalty(role!, target!.loanId, target!.installmentId, amount!),
    onSuccess: () => {
      invalidate(target!.loanId);
      sheetRef.current?.close();
      toast.success(t('penalty.applied'), {message: formatMoney(amount!)});
      // Today's "Send SMS?" popup becomes this switch (E3b).
      if (tell && target?.phone) {
        openSms(
          target.phone,
          buildPenaltyNotice(brand, lang, {amount: amount!, loanNo: target.loanNumber, date: new Date()}),
        );
      }
    },
    onError: err => toast.error(errorMessage(err, t)),
  });

  const submit = () => {
    if (!amount || amount <= 0) return setError(t('errors.invalidAmount'));
    setError(null);
    mutation.mutate();
  };

  return (
    <BottomSheet
      ref={sheetRef}
      title={t('penalty.title')}
      subtitle={
        target
          ? `${target.customerName.split(' ')[0]} · #${target.loanNumber}${
              target.installmentNumber ? ` · ${t('pay.installmentShort', {number: target.installmentNumber})}` : ''
            }`
          : undefined
      }
      dismissible={!mutation.isPending}
      footer={
        <>
          <Button
            title={t('common.cancel')}
            variant="text"
            onPress={() => sheetRef.current?.close()}
            disabled={mutation.isPending}
          />
          <Button
            title={t('penalty.apply', {amount: formatMoney(amount ?? 0)})}
            variant="danger"
            onPress={submit}
            loading={mutation.isPending}
            disabled={!amount}
          />
        </>
      }>
      <MoneyField label={t('penalty.amount')} value={amount} onChangeValue={setAmount} error={error} autoFocus />
      <Text variant="small" color="muted" style={s.note}>
        {t('penalty.reasonNote')}
      </Text>
      {target?.phone ? (
        <View style={s.switchRow}>
          <Text style={s.switchText}>{t('penalty.tellCustomer')}</Text>
          <Switch value={tell} onChange={setTell} label={t('penalty.tellCustomer')} />
        </View>
      ) : null}
    </BottomSheet>
  );
}

function ReceiptSheet({sheetRef, receipt}: {sheetRef: React.RefObject<SheetHandle>; receipt: ReceiptState | null}) {
  const {t} = useTranslation();
  const {lang} = useI18n();
  const s = useStyles();
  if (!receipt) return <BottomSheet ref={sheetRef}>{null}</BottomSheet>;

  const {target, result, amount, method} = receipt;
  const data = {
    amount,
    method: t(`enums.paymentMethod.${method}`),
    loanNo: result.loanNumber ?? target.loanNumber,
    installments: result.installments?.length
      ? result.installments
      : target.installmentNumber
      ? [target.installmentNumber]
      : [],
    date: result.repaymentDetails?.paymentDate ?? new Date(),
    balance: result.balanceAfterPayment ?? result.outstandingAmount ?? null,
    repaymentId: result.repaymentDetails?._id ?? '',
    name: target.customerName,
  };
  const first = target.customerName.split(' ')[0];

  return (
    <BottomSheet
      ref={sheetRef}
      title={t('pay.recordedAmount', {amount: formatMoney(amount)})}
      subtitle={t('pay.waiting')}
      footer={<Button title={t('common.done')} variant="text" onPress={() => sheetRef.current?.close()} />}>
      {target.phone ? (
        <>
          <Text variant="label" weight="semibold" style={s.label}>
            {t('pay.sendReceipt', {name: first})}
          </Text>
          <OptionRow
            icon="message-text-outline"
            title={t('pay.receiptSms')}
            hint={t('pay.receiptSmsHint')}
            onPress={() => {
              openSms(target.phone!, buildReceipt(brand, 'sms', lang, data));
              sheetRef.current?.close();
            }}
          />
          <OptionRow
            icon="whatsapp"
            title={t('pay.receiptWhatsapp')}
            hint={t('pay.receiptWhatsappHint')}
            onPress={() => {
              openWhatsApp(target.phone!, buildReceipt(brand, 'whatsapp', lang, data));
              sheetRef.current?.close();
            }}
          />
        </>
      ) : (
        <Text color="muted">{t('pay.noPhone')}</Text>
      )}
    </BottomSheet>
  );
}

const useStyles = makeStyles(t => ({
  label: {marginBottom: t.space.sm},
  methods: {marginBottom: t.space.md},
  note: {marginBottom: t.space.md},
  offline: {marginBottom: t.space.md},
  switchRow: {flexDirection: 'row', alignItems: 'center', gap: t.space.md, minHeight: 48},
  switchText: {flex: 1},
}));
