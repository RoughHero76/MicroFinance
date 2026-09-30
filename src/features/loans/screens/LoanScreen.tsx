// A6 · A10 · E6: one loan screen for both roles, 3 tabs (Overview, Schedule,
// Documents). The top shows only what matters at a glance; terms, business,
// payment history and penalties are rows that open their full detail, so
// every field from today is still there. Record payment floats bottom-right
// (both roles, BE-10). Admin-only actions (approve, close, delete, edit
// installment) are added by the admin wave through `adminExtras`.

import React, {useMemo, useRef, useState} from 'react';
import {Pressable, RefreshControl, ScrollView, View} from 'react-native';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {useI18n} from '@/i18n';
import {normalizeLoanType} from '@/lib/enums';
import {downloadUrlToDownloads} from '@/lib/files';
import {formatDate, formatDateTime, formatMoney} from '@/lib/format';
import {useInfiniteList} from '@/lib/useInfiniteList';
import {useCan, useSession} from '@/features/auth/SessionProvider';
import {makeStyles} from '@/theme';
import {
  Avatar,
  BottomSheet,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Fab,
  IconButton,
  KeyValueRows,
  PhotoViewer,
  ProgressBar,
  Screen,
  Section,
  SkeletonRows,
  StatusBadge,
  Text,
  Thumbnail,
  UnderlineTabs,
  toast,
  type KeyValue,
  type SheetHandle,
} from '@/ui';
import {getLoanDetail, getPaymentsPage, loanKeys} from '../api';
import {useCollect, type CollectTarget} from '../components/CollectSheets';
import {InstallmentSheet} from '../components/InstallmentSheet';
import {StatementSheet, type StatementSheetHandle} from '../components/StatementSheet';
import {ScheduleView} from '../components/ScheduleView';
import {amountStillDue, collectorName, installmentTotal} from '../schedule';
import type {Installment, LoanDetail, LoanDocument, PersonRef} from '../types';

type Tab = 'overview' | 'schedule' | 'documents';

export interface LoanScreenExtras {
  /** Header action (⋯ menu) for admins. */
  headerRight?: (detail: LoanDetail) => React.ReactNode;
  /** Extra overview content for admins (pending approval, etc). */
  overviewTop?: (detail: LoanDetail) => React.ReactNode;
  /** Installment sheet actions for admins. */
  installmentActions?: (
    detail: LoanDetail,
    installment: Installment,
    close: () => void,
  ) => {onEdit?: () => void; onRemovePenalty?: () => void};
  documentsTop?: (detail: LoanDetail) => React.ReactNode;
  onLongPressDocument?: (detail: LoanDetail, doc: LoanDocument) => void;
}

export default function LoanScreen({extras}: {extras?: LoanScreenExtras}) {
  const s = useStyles();
  const {t} = useTranslation();
  const {lang} = useI18n();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{Loan: {loanId: string; tab?: Tab}}, 'Loan'>>();
  const loanId = route.params.loanId;
  const {role} = useSession();
  const can = useCan();
  const collect = useCollect();
  const [tab, setTab] = useState<Tab>(route.params.tab ?? 'overview');
  const installmentRef = useRef<SheetHandle>(null);
  const [installment, setInstallment] = useState<Installment | null>(null);
  const termsRef = useRef<SheetHandle>(null);
  const businessRef = useRef<SheetHandle>(null);
  const paymentsRef = useRef<SheetHandle>(null);
  const penaltiesRef = useRef<SheetHandle>(null);
  const [viewer, setViewer] = useState<{index: number} | null>(null);

  const query = useQuery({
    queryKey: loanKeys.detail(loanId),
    queryFn: () => getLoanDetail(role!, loanId),
    enabled: !!role,
    meta: {persist: true},
  });
  const detail = query.data;
  const loan = detail?.loan;
  const statementRef = useRef<StatementSheetHandle>(null);
  const customer = detail?.customer;
  const customerName = customer ? `${customer.fname ?? ''} ${customer.lname ?? ''}`.trim() : '';
  const collector = loan && typeof loan.assignedTo === 'object' ? (loan.assignedTo as PersonRef) : null;

  const targetFor = (item: {
    _id: string;
    loanInstallmentNumber?: number;
    amount: number;
    originalAmount?: number;
    status: Installment['status'];
  }): CollectTarget => ({
    loanId,
    loanNumber: loan!.loanNumber,
    installmentId: item._id,
    installmentNumber: item.loanInstallmentNumber,
    installmentAmount: installmentTotal(item),
    dueAmount: amountStillDue(item),
    outstanding: loan!.outstandingAmount,
    customerName,
    phone: customer?.phoneNumber,
  });

  const collectNext = () => {
    const next = detail?.summary?.nextDue;
    if (!loan || !next?._id) return;
    collect.pay({
      loanId,
      loanNumber: loan.loanNumber,
      installmentId: next._id,
      installmentNumber: next.installment,
      installmentAmount: loan.repaymentAmountPerInstallment ?? next.amount,
      dueAmount: next.amount,
      outstanding: loan.outstandingAmount,
      customerName,
      phone: customer?.phoneNumber,
    });
  };

  const openInstallment = (item: Installment) => {
    setInstallment(item);
    requestAnimationFrame(() => installmentRef.current?.open());
  };
  const closeInstallment = () => installmentRef.current?.close();

  const payments = useInfiniteList({
    queryKey: loanKeys.payments(loanId),
    fetchPage: page => getPaymentsPage(role!, loanId, page),
    enabled: !!role,
  });

  const penalties = loan?.totalPenalty ?? [];
  const docsByType = useMemo(() => {
    const groups = new Map<string, LoanDocument[]>();
    for (const doc of detail?.documents ?? []) {
      const list = groups.get(doc.documentType) ?? [];
      list.push(doc);
      groups.set(doc.documentType, list);
    }
    return [...groups.entries()];
  }, [detail?.documents]);
  const allDocs = useMemo(() => docsByType.flatMap(([, docs]) => docs), [docsByType]);

  const terms: KeyValue[] = loan
    ? [
        {label: t('loan.number'), value: loan.loanNumber, copy: true},
        {
          label: t('loan.type'),
          value: loan.loanType ? t(`enums.loanType.${normalizeLoanType(loan.loanType) ?? 'Other'}`) : '',
        },
        {label: t('loan.amount'), value: formatMoney(loan.loanAmount)},
        {label: t('loan.principal'), value: loan.principalAmount != null ? formatMoney(loan.principalAmount) : ''},
        {label: t('loan.duration'), value: loan.loanDuration},
        {
          label: t('loan.frequency'),
          value: loan.installmentFrequency ? t(`enums.frequency.${loan.installmentFrequency}`) : '',
        },
        {label: t('loan.interest'), value: loan.interestRate != null ? `${loan.interestRate}%` : ''},
        {label: t('loan.grace'), value: loan.gracePeriod != null ? t('loan.graceDays', {count: loan.gracePeriod}) : ''},
        {label: t('loan.start'), value: formatDate(loan.loanStartDate, lang)},
        {label: t('loan.end'), value: formatDate(loan.loanEndDate, lang)},
        {
          label: t('loan.installments'),
          value: loan.numberOfInstallments != null ? String(loan.numberOfInstallments) : '',
        },
        {
          label: t('loan.perInstallment'),
          value: loan.repaymentAmountPerInstallment != null ? formatMoney(loan.repaymentAmountPerInstallment) : '',
        },
        {label: t('loan.totalPaid'), value: formatMoney(loan.totalPaid ?? 0)},
        {label: t('words.outstanding'), value: formatMoney(loan.outstandingAmount)},
        {label: t('loan.penalties'), value: loan.totalPenaltyAmount ? formatMoney(loan.totalPenaltyAmount) : ''},
      ]
    : [];

  const overview = loan ? (
    <ScrollView
      contentContainerStyle={s.pad}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} />}>
      {extras?.overviewTop && detail ? extras.overviewTop(detail) : null}
      <Card
        style={s.customer}
        onPress={
          customer
            ? () => navigation.navigate('Customer' as never, {id: customer._id, uid: customer.uid} as never)
            : undefined
        }>
        <Avatar name={customerName} uri={customer?.profilePic} size={44} />
        <View style={s.flex}>
          <Text variant="bodyLg" weight="semibold" numberOfLines={1}>
            {customerName || t('loan.customerRow')}
          </Text>
          <Text variant="small" color="muted" numberOfLines={1}>
            {t('loan.collector')}{' '}
            {collector ? [collector.fname, collector.lname].filter(Boolean).join(' ') : t('common.unassigned')}
          </Text>
        </View>
        <StatusBadge set="loan" status={loan.status} />
      </Card>

      <Card style={s.outstanding}>
        <Text variant="overline" color="muted">
          {t('loan.outstanding')}
        </Text>
        <Text variant="display" tabular>
          {formatMoney(loan.outstandingAmount)}
        </Text>
        <Text variant="small" color="muted" tabular>
          {t('loan.paidOf', {
            paid: formatMoney(loan.totalPaid ?? 0),
            total: formatMoney((loan.totalPaid ?? 0) + loan.outstandingAmount),
          })}
        </Text>
        <ProgressBar
          value={(loan.totalPaid ?? 0) / Math.max(1, (loan.totalPaid ?? 0) + loan.outstandingAmount)}
          tone="success"
          style={s.progress}
        />
      </Card>

      <Card padded={false} style={s.rows}>
        <KeyValueRows
          style={s.rowsInner}
          rows={[
            {
              label: t('loan.terms'),
              value: t('loan.termsValue', {amount: formatMoney(loan.loanAmount), duration: loan.loanDuration ?? ''}),
              onPress: () => termsRef.current?.open(),
            },
            {label: t('loan.business'), value: loan.businessFirmName, onPress: () => businessRef.current?.open()},
            {
              label: t('loan.nextDue'),
              value: detail?.summary?.nextDue
                ? `${formatMoney(detail.summary.nextDue.amount)} · ${formatDate(detail.summary.nextDue.dueDate, lang, {
                    short: true,
                  })}`
                : '',
            },
            {
              label: t('loan.payments'),
              value: payments.items.length ? `${payments.items.length}${payments.hasMore ? '+' : ''}` : '0',
              onPress: () => paymentsRef.current?.open(),
              keepEmpty: true,
            },
            {
              label: t('loan.penalties'),
              value: loan.totalPenaltyAmount ? formatMoney(loan.totalPenaltyAmount) : t('loan.noPenalties'),
              valueColor: loan.totalPenaltyAmount ? 'danger' : 'muted',
              onPress: penalties.length ? () => penaltiesRef.current?.open() : undefined,
            },
            {label: t('loan.advance'), value: loan.advanceBalance ? formatMoney(loan.advanceBalance) : ''},
            {
              label: t('loan.documents'),
              value: detail?.documents.length ? String(detail.documents.length) : '',
              onPress: () => setTab('documents'),
            },
          ]}
        />
      </Card>
    </ScrollView>
  ) : null;

  const documents = (
    <ScrollView contentContainerStyle={s.pad}>
      {extras?.documentsTop && detail ? extras.documentsTop(detail) : null}
      {docsByType.length ? (
        docsByType.map(([type, docs]) => (
          <Section key={type} title={t(`enums.documentType.${type}`, {defaultValue: type})}>
            <View style={s.grid}>
              {docs.map(doc => (
                <Pressable
                  key={doc._id}
                  style={s.thumbWrap}
                  onPress={() => setViewer({index: allDocs.indexOf(doc)})}
                  onLongPress={
                    extras?.onLongPressDocument && detail ? () => extras.onLongPressDocument!(detail, doc) : undefined
                  }
                  accessibilityRole="imagebutton"
                  accessibilityLabel={doc.documentName}>
                  <Thumbnail uri={doc.documentUrl} size={96} />
                  <Text variant="caption" numberOfLines={1} style={s.thumbLabel}>
                    {doc.documentName}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Section>
        ))
      ) : (
        <EmptyState icon="file-document-outline" title={t('loan.noDocuments')} />
      )}
    </ScrollView>
  );

  return (
    <Screen
      header={{
        title: loan ? t('loan.title', {number: loan.loanNumber}) : t('words.loan'),
        titleAccessory: loan ? <StatusBadge set="loan" status={loan.status} /> : undefined,
        right: detail ? (
          <View style={s.headerRight}>
            {/* M-5: statements for both roles */}
            <IconButton
              icon="file-document-outline"
              label={t('statement.title')}
              variant="plain"
              onPress={() => statementRef.current?.open()}
            />
            {extras?.headerRight ? extras.headerRight(detail) : null}
          </View>
        ) : undefined,
      }}
      padded={false}
      fab={
        loan &&
        loan.status === 'Active' &&
        can('payment.record') &&
        detail?.summary?.nextDue?._id &&
        tab !== 'documents' ? (
          <Fab
            icon="cash-plus"
            label={role === 'admin' ? t('loan.recordPayment') : t('loan.collect')}
            onPress={collectNext}
          />
        ) : undefined
      }>
      <UnderlineTabs
        options={[
          {value: 'overview', label: t('loan.overview')},
          {value: 'schedule', label: t('loan.schedule')},
          {value: 'documents', label: t('loan.documents'), badge: detail?.documents.length || undefined},
        ]}
        value={tab}
        onChange={setTab}
      />
      {query.isPending ? (
        <SkeletonRows count={5} avatar={false} />
      ) : query.isError || !detail ? (
        <ErrorState error={query.error} what={t('words.loan')} onRetry={query.refetch} />
      ) : tab === 'overview' ? (
        overview
      ) : tab === 'schedule' ? (
        <ScheduleView role={role!} loanId={loanId} onOpen={openInstallment} />
      ) : (
        documents
      )}

      <InstallmentSheet
        ref={installmentRef}
        installment={installment}
        onCollect={
          can('payment.record') && installment && loan?.status === 'Active'
            ? () => {
                closeInstallment();
                collect.pay(targetFor(installment));
              }
            : undefined
        }
        onPenalty={
          can('penalty.apply') && installment && loan?.status === 'Active'
            ? () => {
                closeInstallment();
                collect.penalty(targetFor(installment));
              }
            : undefined
        }
        {...(extras?.installmentActions && detail && installment
          ? extras.installmentActions(detail, installment, closeInstallment)
          : {})}
      />

      <BottomSheet ref={termsRef} title={t('loan.terms')}>
        <KeyValueRows rows={terms} dense />
      </BottomSheet>

      <BottomSheet ref={businessRef} title={t('loan.business')}>
        <KeyValueRows
          dense
          rows={[
            {label: t('loan.firmName'), value: loan?.businessFirmName},
            {label: t('loan.businessAddress'), value: loan?.businessAddress},
            {label: t('loan.businessPhone'), value: loan?.businessPhone},
            {label: t('loan.businessEmail'), value: loan?.businessEmail},
          ]}
        />
      </BottomSheet>

      <BottomSheet ref={paymentsRef} title={t('loan.payments')} snapPoints={['75%']}>
        {payments.items.length ? (
          payments.items.map(p => (
            <View key={p._id} style={s.payment}>
              <View style={s.line}>
                <Text weight="semibold" tabular style={s.flex}>
                  {formatMoney(p.amount)}
                </Text>
                <StatusBadge set="repayment" status={p.status} />
              </View>
              <KeyValueRows
                dense
                rows={[
                  {
                    label: t('pay.method'),
                    value: t(`enums.paymentMethod.${p.paymentMethod}`, {defaultValue: p.paymentMethod}),
                  },
                  {label: t('words.collector'), value: collectorName(p, t('loan.admin'))},
                  {
                    label: t('loan.remaining'),
                    value: p.balanceAfterPayment != null ? formatMoney(p.balanceAfterPayment) : '',
                  },
                  {label: t('loan.transaction'), value: p.transactionId, copy: true},
                  {label: t('loan.note'), value: p.logicNote},
                  {label: t('loan.rejectedReason'), value: p.rejectionReason, valueColor: 'danger'},
                ]}
              />
              <Text variant="caption" color="muted">
                {formatDateTime(p.paymentDate, lang)}
              </Text>
            </View>
          ))
        ) : payments.isLoading ? (
          <SkeletonRows count={3} avatar={false} />
        ) : (
          <EmptyState icon="cash-remove" title={t('loan.noPayments')} />
        )}
        {payments.hasMore ? (
          <Button
            title={t('common.loadMore')}
            variant="text"
            onPress={payments.loadMore}
            loading={payments.isLoadingMore}
          />
        ) : null}
      </BottomSheet>

      <BottomSheet ref={penaltiesRef} title={t('loan.penalties')}>
        {penalties.map(p => (
          <View key={p._id} style={s.payment}>
            <View style={s.line}>
              <Text weight="semibold" tabular style={s.flex}>
                {formatMoney(p.amount)}
              </Text>
              {p.status ? <StatusBadge set="penalty" status={p.status} /> : null}
            </View>
            <Text variant="small" color="muted">
              {[
                p.loanInstallmentNumber ? `#${p.loanInstallmentNumber}` : null,
                formatDate(p.appliedDate, lang),
                p.reason,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
        ))}
      </BottomSheet>

      {viewer ? (
        <PhotoViewer
          visible
          index={viewer.index}
          photos={allDocs.map(d => ({uri: d.documentUrl, title: d.documentName}))}
          onClose={() => setViewer(null)}
          onDownload={async photo => {
            try {
              await downloadUrlToDownloads(
                photo.uri,
                `${photo.title ?? 'document'}-${Date.now()}.jpg`,
                'image/jpeg',
                'Documents',
              );
              toast.success(t('loan.documentSaved'));
            } catch {
              toast.error(t('errors.unknown'));
            }
          }}
        />
      ) : null}
      {collect.sheets}
      {loan ? <StatementSheet ref={statementRef} loanId={loan._id} loanNumber={loan.loanNumber} /> : null}
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  headerRight: {flexDirection: 'row', alignItems: 'center'},
  pad: {padding: t.space.lg, paddingBottom: 96},
  flex: {flex: 1, minWidth: 0},
  customer: {flexDirection: 'row', alignItems: 'center', gap: t.space.md},
  outstanding: {marginTop: t.space.md, padding: t.space.lg, gap: t.space.xs},
  progress: {marginTop: t.space.sm},
  rows: {marginTop: t.space.md},
  rowsInner: {paddingHorizontal: t.space.lg},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md},
  thumbWrap: {width: 96, gap: t.space.xs},
  thumbLabel: {width: 96},
  payment: {
    padding: t.space.md,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surface2,
    marginBottom: t.space.sm,
    gap: t.space.xs,
  },
  line: {flexDirection: 'row', alignItems: 'center', gap: t.space.sm},
}));
