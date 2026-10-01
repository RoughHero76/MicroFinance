// M-3 Cash handovers (admin). Each handover: employee, when, how many cash
// payments, amount. Waiting ones get "Short…" and "Received"; a shortfall
// records the amount received and a required note. Tabs by status.

import React, {useRef, useState} from 'react';
import {FlatList, RefreshControl, View} from 'react-native';
import {useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {useI18n} from '@/i18n';
import {errorMessage} from '@/lib/api';
import {formatDateTime, formatMoney} from '@/lib/format';
import {useInfiniteList} from '@/lib/useInfiniteList';
import {makeStyles} from '@/theme';
import {
  Avatar,
  BottomSheet,
  Button,
  Card,
  EmptyState,
  ErrorState,
  MoneyField,
  Screen,
  SkeletonRows,
  StatusBadge,
  Text,
  TextField,
  UnderlineTabs,
  toast,
  type SheetHandle,
  listProps,
} from '@/ui';
import {cashKeys, confirmHandover, getHandoversPage, type CashHandover} from '../api';
import {handoverTone} from './HandOverScreen';

type Tab = 'Submitted' | '';

export default function CashHandoversScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const {lang} = useI18n();
  const queryClient = useQueryClient();
  const shortRef = useRef<SheetHandle>(null);
  const [tab, setTab] = useState<Tab>('Submitted');
  const [short, setShort] = useState<{
    item: CashHandover;
    received: number | null;
    note: string;
    error?: string;
  } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const list = useInfiniteList({
    queryKey: cashKeys.list(`admin-${tab}`),
    fetchPage: page => getHandoversPage('admin', tab, page),
  });

  const done = () => queryClient.invalidateQueries({queryKey: cashKeys.all});

  const received = async (item: CashHandover) => {
    setBusy(item._id);
    try {
      await confirmHandover(item._id, {});
      done();
      toast.success(t('cash.receivedToast', {amount: formatMoney(item.amount)}));
    } catch (error) {
      toast.error(errorMessage(error, t));
    } finally {
      setBusy(null);
    }
  };

  const saveShort = async () => {
    if (!short) return;
    if (short.received == null || short.received >= short.item.amount) {
      return setShort({...short, error: t('cash.shortAmountError', {amount: formatMoney(short.item.amount)})});
    }
    if (!short.note.trim()) return setShort({...short, error: t('cash.noteRequired')});
    setBusy(short.item._id);
    try {
      await confirmHandover(short.item._id, {receivedAmount: short.received, note: short.note.trim()});
      shortRef.current?.close();
      done();
      toast.success(t('cash.shortToast'));
    } catch (error) {
      toast.error(errorMessage(error, t));
    } finally {
      setBusy(null);
    }
  };

  const name = (item: CashHandover) => `${item.employee?.fname ?? ''} ${item.employee?.lname ?? ''}`.trim();

  return (
    <Screen header={{title: t('cash.adminTitle')}} padded={false}>
      <UnderlineTabs<Tab>
        options={[
          {value: 'Submitted', label: t('cash.waiting')},
          {value: '', label: t('common.all')},
        ]}
        value={tab}
        onChange={setTab}
        style={s.tabs}
      />
      {list.isLoading ? (
        <SkeletonRows count={4} />
      ) : list.isError ? (
        <ErrorState error={list.error} what={t('cash.adminTitle')} onRetry={list.refetch} />
      ) : (
        <FlatList
          {...listProps}
          data={list.items}
          keyExtractor={item => item._id}
          contentContainerStyle={s.list}
          onEndReached={list.loadMore}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} />}
          renderItem={({item}) => (
            <Card style={s.card}>
              <View style={s.head}>
                <Avatar name={name(item)} uri={item.employee?.profilePic} size={36} />
                <View style={s.text}>
                  <Text variant="body" weight="semibold" numberOfLines={1}>
                    {name(item)}
                  </Text>
                  <Text variant="small" color="muted">
                    {`${formatDateTime(item.createdAt, lang)} · ${t('cash.payments', {count: item.cashCount})}`}
                  </Text>
                </View>
                <Text variant="title">{formatMoney(item.amount)}</Text>
              </View>
              {item.status === 'Submitted' ? (
                <View style={s.actions}>
                  <Button
                    title={t('cash.short')}
                    variant="secondary"
                    disabled={busy === item._id}
                    onPress={() => {
                      setShort({item, received: null, note: ''});
                      shortRef.current?.open();
                    }}
                  />
                  <Button title={t('cash.received')} loading={busy === item._id} onPress={() => received(item)} />
                </View>
              ) : (
                <View style={s.status}>
                  <StatusBadge tone={handoverTone(item.status)} label={t(`cash.status.${item.status}`)} />
                  {item.status === 'Short' ? (
                    <Text variant="small" color="danger" style={s.text}>
                      {t('cash.shortBy', {amount: formatMoney(item.shortBy ?? 0), note: item.note ?? ''})}
                    </Text>
                  ) : null}
                </View>
              )}
            </Card>
          )}
          ListEmptyComponent={
            <EmptyState icon="hand-coin-outline" title={tab ? t('cash.noneWaiting') : t('cash.noHistory')} />
          }
        />
      )}

      <BottomSheet
        ref={shortRef}
        title={short ? t('cash.shortTitle', {name: name(short.item)}) : undefined}
        subtitle={short ? t('cash.handedOverAmount', {amount: formatMoney(short.item.amount)}) : undefined}
        footer={
          <>
            <Button title={t('common.cancel')} variant="text" onPress={() => shortRef.current?.close()} />
            <Button
              title={t('cash.recordShort')}
              variant="danger"
              loading={!!short && busy === short.item._id}
              onPress={saveShort}
            />
          </>
        }>
        {short ? (
          <>
            <MoneyField
              label={t('cash.receivedAmount')}
              required
              value={short.received}
              onChangeValue={v => setShort({...short, received: v, error: undefined})}
            />
            <TextField
              label={t('cash.note')}
              required
              multiline
              value={short.note}
              onChangeText={v => setShort({...short, note: v, error: undefined})}
              error={short.error}
            />
          </>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  tabs: {marginHorizontal: t.space.lg, marginBottom: t.space.sm},
  list: {paddingHorizontal: t.space.lg, paddingBottom: t.space.xxl, flexGrow: 1},
  card: {marginBottom: t.space.sm, gap: t.space.md},
  head: {flexDirection: 'row', alignItems: 'center', gap: t.space.md},
  text: {flex: 1, minWidth: 0},
  actions: {flexDirection: 'row', justifyContent: 'flex-end', gap: t.space.sm},
  status: {flexDirection: 'row', alignItems: 'center', gap: t.space.sm},
}));
