// A3 · E5: one CustomerProfile for both roles. Brand-colour header, profile
// card with photo, "since" and contact buttons, 3 lifetime numbers (BE-17),
// then Loans and Details tabs. Employees get Collect on a loan that's due;
// admins get the photo badge, ⋯ (edit, delete) and "+ Loan" (W4).

import React, {useState} from 'react';
import {RefreshControl, View} from 'react-native';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {useI18n} from '@/i18n';
import {formatDate, formatMoneyShort} from '@/lib/format';
import {callPhone, openEmail, openMaps} from '@/lib/messaging';
import {useCan, useSession} from '@/features/auth/SessionProvider';
import {useCollect} from '@/features/loans/components/CollectSheets';
import {makeStyles} from '@/theme';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Fab,
  FactTiles,
  KeyValueRows,
  Screen,
  SkeletonRows,
  Text,
  UnderlineTabs,
} from '@/ui';
import {customerKeys, getCustomerProfile} from '../api';
import {ContactActions, LoanCard} from '../components/CustomerParts';

type Params = {Customer: {id?: string; uid?: string; customerId?: string}};

export default function CustomerProfileScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const {lang} = useI18n();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Params, 'Customer'>>();
  const {role} = useSession();
  const can = useCan();
  const collect = useCollect();
  const [tab, setTab] = useState<'loans' | 'details'>('loans');
  const id = route.params?.id ?? route.params?.customerId;
  const uid = route.params?.uid;

  const query = useQuery({
    queryKey: customerKeys.profile(id ?? uid ?? ''),
    queryFn: () => getCustomerProfile(role!, {_id: id, uid}),
    enabled: !!role && !!(id || uid),
    meta: {persist: true},
  });
  const c = query.data;
  const name = c ? `${c.fname ?? ''} ${c.lname ?? ''}`.trim() : '';
  const address = c ? [c.address, c.city, c.state, c.country, c.pincode].filter(Boolean).join(', ') : '';
  const loans = c?.loans ?? [];

  const openLoan = (loanId: string) => navigation.navigate('Loan' as never, {loanId} as never);

  return (
    <Screen
      header={{title: name, band: true}}
      scroll
      fab={
        c && can('loan.create') ? (
          <Fab
            icon="plus"
            label={t('customers.newLoan')}
            onPress={() => navigation.navigate('CreateLoan' as never, {customerUid: c.uid} as never)}
          />
        ) : undefined
      }
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} />}>
      {query.isPending ? (
        <SkeletonRows count={4} />
      ) : query.isError || !c ? (
        <ErrorState error={query.error} what={t('words.customer')} onRetry={query.refetch} />
      ) : (
        <>
          <Card style={s.head}>
            <Avatar name={name} uri={c.profilePic} size={80} />
            <Text variant="h2" align="center" style={s.name}>
              {name}
            </Text>
            <Text variant="small" color="muted" align="center">
              {[
                c.userName ? `@${c.userName}` : null,
                c.summary?.since ? t('customers.since', {date: formatDate(c.summary.since, lang)}) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            <View style={s.contacts}>
              <ContactActions phone={c.phoneNumber} address={address} name={name} />
            </View>
          </Card>

          {c.summary ? (
            <FactTiles
              style={s.facts}
              facts={[
                {label: t('customers.borrowed'), value: formatMoneyShort(c.summary.borrowed)},
                {label: t('words.outstanding'), value: formatMoneyShort(c.summary.outstanding)},
                {
                  label: t('customers.onTime'),
                  value: c.summary.onTimeRate == null ? '–' : `${c.summary.onTimeRate}%`,
                  color: c.summary.onTimeRate != null && c.summary.onTimeRate < 70 ? 'warning' : 'success',
                },
              ]}
            />
          ) : null}

          <UnderlineTabs
            options={[
              {value: 'loans', label: t('customers.loans', {count: loans.length})},
              {value: 'details', label: t('customers.details')},
            ]}
            value={tab}
            onChange={setTab}
            style={s.tabs}
          />

          {tab === 'loans' ? (
            loans.length ? (
              loans.map(loan => (
                <LoanCard
                  key={loan._id}
                  loan={loan}
                  onPress={() => openLoan(loan._id)}
                  action={
                    can('payment.record') && loan.status === 'Active' && loan.nextDue?._id ? (
                      <Button
                        title={t('loan.collect')}
                        onPress={() =>
                          collect.pay({
                            loanId: loan._id,
                            loanNumber: loan.loanNumber,
                            installmentId: loan.nextDue!._id!,
                            installmentNumber: loan.nextDue!.installment,
                            installmentAmount: loan.repaymentAmountPerInstallment ?? loan.nextDue!.amount,
                            dueAmount: loan.nextDue!.amount,
                            outstanding: loan.outstandingAmount,
                            customerName: name,
                            phone: c.phoneNumber,
                          })
                        }
                      />
                    ) : undefined
                  }
                />
              ))
            ) : (
              <EmptyState icon="bank-outline" title={t('customers.noLoans')} />
            )
          ) : (
            <Card>
              <KeyValueRows
                rows={[
                  {
                    label: t('customers.phone'),
                    value: c.phoneNumber,
                    onPress: c.phoneNumber ? () => callPhone(c.phoneNumber!) : undefined,
                  },
                  {
                    label: t('customers.email'),
                    value: c.email,
                    onPress: c.email ? () => openEmail(c.email!) : undefined,
                  },
                  {
                    label: t('customers.address'),
                    value: address,
                    onPress: address ? () => openMaps(address) : undefined,
                  },
                ]}
              />
            </Card>
          )}
        </>
      )}
      {collect.sheets}
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  head: {alignItems: 'center', paddingVertical: t.space.xl, gap: t.space.xs},
  name: {marginTop: t.space.sm},
  contacts: {marginTop: t.space.md},
  facts: {marginTop: t.space.md},
  tabs: {marginVertical: t.space.md},
}));
