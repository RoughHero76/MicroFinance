// A3 · E5: one CustomerProfile for both roles. Brand-colour header, profile
// card with photo, "since" and contact buttons, 3 lifetime numbers (BE-17),
// then Loans and Details tabs. Employees get Collect on a loan that's due;
// admins get the photo badge, ⋯ (edit, delete) and "+ Loan" (W4).

import React, {useEffect, useRef, useState} from 'react';
import {RefreshControl, View} from 'react-native';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {useI18n} from '@/i18n';
import {errorMessage} from '@/lib/api';
import {pickImage, type ImageSource} from '@/lib/image';
import {formatDate, formatMoneyShort} from '@/lib/format';
import {callPhone, openEmail, openMaps} from '@/lib/messaging';
import {useCan, useSession} from '@/features/auth/SessionProvider';
import {useCollect} from '@/features/loans/components/CollectSheets';
import {makeStyles, useTheme} from '@/theme';
import {
  Avatar,
  BottomSheet,
  Button,
  Card,
  ConfirmSheet,
  EmptyState,
  ErrorState,
  Fab,
  FactTiles,
  IconButton,
  KeyValueRows,
  OptionRow,
  Screen,
  SkeletonRows,
  Text,
  UnderlineTabs,
  toast,
  useConfirm,
  type SheetHandle,
} from '@/ui';
import {customerKeys, deleteCustomer, getCustomerProfile, uploadCustomerPhoto} from '../api';
import {ContactActions, LoanCard} from '../components/CustomerParts';
import {rememberCustomer} from '../recent';

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
  const theme = useTheme();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const menuRef = useRef<SheetHandle>(null);
  const photoRef = useRef<SheetHandle>(null);
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

  // P-18: Search lists the last customers opened.
  useEffect(() => {
    if (c?._id) rememberCustomer({_id: c._id, uid: c.uid, name, phoneNumber: c.phoneNumber, profilePic: c.profilePic});
  }, [c?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const openLoan = (loanId: string) => navigation.navigate('Loan' as never, {loanId} as never);

  const photo = useMutation({
    mutationFn: async (source: ImageSource) => {
      const image = await pickImage('profile', source);
      if (!image) return false;
      await uploadCustomerPhoto(c!.uid!, image, p => toast.progress('photo', t('ui.uploading'), p));
      return true;
    },
    onSuccess: done => {
      toast.hide('photo');
      if (!done) return;
      queryClient.invalidateQueries({queryKey: customerKeys.all});
      toast.success(t('customerAdmin.photoUpdated'));
    },
    onError: error => {
      toast.hide('photo');
      toast.error(errorMessage(error, t));
    },
  });

  const hasActive = loans.some(l => l.status === 'Active' || l.status === 'Pending');
  const askDelete = () => {
    menuRef.current?.close();
    if (hasActive) {
      toast.error(t('customerAdmin.hasActive'));
      return;
    }
    confirm.ask({
      title: t('customerAdmin.deleteConfirm', {name}),
      message: t('customerAdmin.deleteHint'),
      confirmLabel: t('customerAdmin.delete'),
      destructive: true,
      typeToConfirm: name,
      onConfirm: async () => {
        try {
          await deleteCustomer(c!.uid!);
          queryClient.invalidateQueries({queryKey: customerKeys.all});
          queryClient.invalidateQueries({queryKey: ['dashboard']});
          toast.success(t('customerAdmin.deleted'));
          navigation.goBack();
        } catch (error) {
          toast.error(errorMessage(error, t));
        }
      },
    });
  };
  const admin = can('customer.edit');

  return (
    <Screen
      header={{
        title: name,
        band: true,
        right:
          c && admin ? (
            <IconButton
              icon="dots-vertical"
              label={t('customerAdmin.menu')}
              variant="plain"
              color={theme.colors.onPrimary}
              onPress={() => menuRef.current?.open()}
            />
          ) : undefined,
      }}
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
            <Avatar
              name={name}
              uri={c.profilePic}
              size={80}
              onEditPhoto={can('customer.photo') ? () => photoRef.current?.open() : undefined}
            />
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
      {admin && c ? (
        <>
          <BottomSheet ref={menuRef} title={name}>
            <OptionRow
              icon="pencil-outline"
              title={t('customerAdmin.edit')}
              onPress={() => {
                menuRef.current?.close();
                navigation.navigate('CustomerForm' as never, {customer: c} as never);
              }}
            />
            {can('customer.delete') ? (
              <OptionRow icon="delete-outline" title={t('customerAdmin.delete')} destructive onPress={askDelete} />
            ) : null}
          </BottomSheet>
          <BottomSheet ref={photoRef} title={t('leads.photo')}>
            {(['camera', 'gallery'] as const).map(source => (
              <OptionRow
                key={source}
                icon={source === 'camera' ? 'camera-outline' : 'image-outline'}
                title={t(`leads.${source}`)}
                onPress={() => {
                  photoRef.current?.close();
                  photo.mutate(source);
                }}
              />
            ))}
          </BottomSheet>
          <ConfirmSheet ref={confirm.ref} />
        </>
      ) : null}
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
