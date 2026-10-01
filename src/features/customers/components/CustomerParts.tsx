// CustomerRow (A2·E4: photo, name, phone, each active loan as its own small
// block; closed loans collapse), LoanCard (A3·E5: amount, number, status,
// progress, next due and the collector's photo) and ContactActions (call,
// SMS, WhatsApp, map).

import React from 'react';
import {View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useI18n} from '@/i18n';
import {formatDate, formatMoney, isSameDay} from '@/lib/format';
import {callPhone, openMaps, openSms, openWhatsApp} from '@/lib/messaging';
import type {Loan, PersonRef} from '@/features/loans/types';
import {makeStyles} from '@/theme';
import {Avatar, Card, IconButton, PressableScale, ProgressBar, StatusBadge, Text} from '@/ui';
import type {CustomerListItem} from '../api';

export function CustomerRow({
  customer,
  onPress,
  right,
}: {
  customer: CustomerListItem;
  onPress: () => void;
  right?: React.ReactNode;
}) {
  const s = useStyles();
  const {t} = useTranslation();
  const name = `${customer.fname ?? ''} ${customer.lname ?? ''}`.trim();
  const loans = customer.loans ?? [];
  const open = loans.filter(l => l.status !== 'Closed' && l.status !== 'Rejected');
  const closed = loans.length - open.length;
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} accessibilityRole="button" accessibilityLabel={name} style={s.row}>
      <Avatar name={name} uri={customer.profilePic} size={48} />
      <View style={s.body}>
        <Text variant="bodyLg" weight="semibold" numberOfLines={1}>
          {name}
        </Text>
        {customer.phoneNumber ? (
          <Text variant="small" color="muted">
            {customer.phoneNumber}
          </Text>
        ) : null}
        {open.slice(0, 2).map(loan => (
          <View key={loan._id} style={s.loanLine}>
            <Text variant="small" tabular numberOfLines={1} style={s.flex}>
              {formatMoney(loan.loanAmount)} · #{loan.loanNumber}
            </Text>
            <StatusBadge set="loan" status={loan.status} />
          </View>
        ))}
        {open.length > 2 || closed > 0 ? (
          <Text variant="caption" color="muted">
            {[
              open.length > 2 ? `+${open.length - 2}` : null,
              closed > 0 ? t('customers.closedLoans', {count: closed}) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        ) : null}
        {!loans.length ? (
          <Text variant="caption" color="muted">
            {t('customers.noLoans')}
          </Text>
        ) : null}
      </View>
      {right}
    </PressableScale>
  );
}

function personName(p?: PersonRef | string | null) {
  if (!p || typeof p === 'string') return '';
  return [p.fname, p.lname].filter(Boolean).join(' ');
}

export function LoanCard({loan, onPress, action}: {loan: Loan; onPress: () => void; action?: React.ReactNode}) {
  const s = useStyles();
  const {t} = useTranslation();
  const {lang} = useI18n();
  const total = (loan.totalPaid ?? 0) + (loan.outstandingAmount ?? 0);
  const progress = total > 0 ? (loan.totalPaid ?? 0) / total : 0;
  const collector = typeof loan.assignedTo === 'object' ? loan.assignedTo : null;
  const next = loan.nextDue;
  const dueToday = next && isSameDay(next.dueDate, new Date());
  return (
    <Card onPress={onPress} style={s.loanCard} accessibilityLabel={t('loan.title', {number: loan.loanNumber})}>
      <View style={s.loanLine}>
        <Text variant="title" tabular style={s.flex}>
          {formatMoney(loan.loanAmount)}
          <Text variant="small" color="muted">{`  #${loan.loanNumber}`}</Text>
        </Text>
        <StatusBadge
          set={next?.status === 'Overdue' ? 'schedule' : 'loan'}
          status={next?.status === 'Overdue' ? 'Overdue' : loan.status}
        />
      </View>
      {loan.status === 'Active' ? <ProgressBar value={progress} style={s.progress} /> : null}
      <View style={s.loanLine}>
        <Text variant="small" color={dueToday ? 'warning' : 'muted'} tabular numberOfLines={1} style={s.flex}>
          {next
            ? dueToday
              ? t('customers.dueToday', {amount: formatMoney(next.amount)})
              : t('customers.nextShort', {
                  amount: formatMoney(next.amount),
                  date: formatDate(next.dueDate, lang, {short: true}),
                })
            : [loan.loanDuration, loan.installmentFrequency ? t(`enums.frequency.${loan.installmentFrequency}`) : null]
                .filter(Boolean)
                .join(' · ')}
        </Text>
        {collector ? (
          <View style={s.collector}>
            <Avatar name={personName(collector)} uri={collector.profilePic} size={22} />
            <Text variant="caption" color="muted" numberOfLines={1}>
              {collector.fname}
            </Text>
          </View>
        ) : null}
      </View>
      {action ? <View style={s.cardAction}>{action}</View> : null}
    </Card>
  );
}

export function ContactActions({
  phone,
  address,
  name,
  variant = 'tonal',
  align = 'center',
}: {
  phone?: string;
  address?: string;
  name?: string;
  variant?: 'tonal' | 'ring';
  align?: 'center' | 'start';
}) {
  const s = useStyles();
  const {t} = useTranslation();
  return (
    <View style={[s.contacts, align === 'start' && s.contactsStart]}>
      {phone ? (
        <IconButton
          icon="phone"
          variant={variant}
          label={`${t('common.call')} ${name ?? ''}`}
          onPress={() => callPhone(phone)}
        />
      ) : null}
      {phone ? (
        <IconButton
          icon="message-text-outline"
          variant={variant}
          label={t('common.sms')}
          onPress={() => openSms(phone)}
        />
      ) : null}
      {phone ? (
        <IconButton
          icon="whatsapp"
          variant={variant}
          label={t('common.whatsapp')}
          onPress={() => openWhatsApp(phone)}
        />
      ) : null}
      {address ? (
        <IconButton
          icon="map-marker-outline"
          variant={variant}
          label={t('common.map')}
          onPress={() => openMaps(address)}
        />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(t => ({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: t.space.md,
    padding: t.space.md,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    ...t.shadow.card,
    marginBottom: 10,
  },
  body: {flex: 1, gap: 3, minWidth: 0},
  loanLine: {flexDirection: 'row', alignItems: 'center', gap: t.space.sm},
  flex: {flex: 1, minWidth: 0},
  loanCard: {marginBottom: 10, gap: t.space.sm},
  progress: {marginVertical: 2},
  collector: {flexDirection: 'row', alignItems: 'center', gap: t.space.xs, maxWidth: '35%'},
  cardAction: {flexDirection: 'row', justifyContent: 'flex-end'},
  contacts: {flexDirection: 'row', justifyContent: 'center', gap: t.space.md},
  contactsStart: {justifyContent: 'flex-start', gap: 10},
}));
