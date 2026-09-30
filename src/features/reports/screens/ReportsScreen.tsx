// A17 Reports (admin). Both date pickers stay; the chips are shortcuts
// (This month, Last month, 3 months, Custom). The report loads as soon as
// the range changes. The 4 totals, the loan amount distribution as bars
// (installment amounts behind "›"), PDF and Excel. Download history is
// behind the clock: open, share, save to Downloads, delete, clear all.
// Links to "By employee" (M-10) and Cash handovers (M-3) when switched on.

import React, {useRef, useState} from 'react';
import {FlatList, RefreshControl, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {useI18n} from '@/i18n';
import {errorMessage} from '@/lib/api';
import {
  clearAppFolder,
  deleteAppFile,
  listAppFiles,
  MIME,
  openAppFile,
  saveAppFileToDownloads,
  shareAppFile,
  type AppFile,
} from '@/lib/files';
import {formatDateTime, formatMoneyShort} from '@/lib/format';
import {brand} from '@/brand';
import {useSession} from '@/features/auth/SessionProvider';
import {makeStyles} from '@/theme';
import {
  BottomSheet,
  Button,
  Card,
  Chips,
  ConfirmSheet,
  DateField,
  EmptyState,
  ErrorState,
  FactTiles,
  Icon,
  IconButton,
  ListRow,
  OptionRow,
  Screen,
  Section,
  Skeleton,
  Text,
  toast,
  useConfirm,
  type SheetHandle,
} from '@/ui';
import {downloadReport, getReport, REPORTS_FOLDER, reportKeys} from '../api';
import {Bars, rangeLabel} from '../components/Bars';

type Preset = 'thisMonth' | 'lastMonth' | 'threeMonths' | 'custom';

export function presetRange(preset: Exclude<Preset, 'custom'>, now = new Date()): [Date, Date] {
  const y = now.getFullYear();
  const m = now.getMonth();
  if (preset === 'thisMonth') return [new Date(y, m, 1), new Date(y, m + 1, 0)];
  if (preset === 'lastMonth') return [new Date(y, m - 1, 1), new Date(y, m, 0)];
  return [new Date(y, m - 2, 1), new Date(y, m + 1, 0)];
}

const mimeOf = (name: string) => (name.endsWith('.pdf') ? MIME.pdf : MIME.xlsx);

export default function ReportsScreen() {
  const s = useStyles();
  const {t} = useTranslation();
  const {lang} = useI18n();
  const navigation = useNavigation();
  const {settings} = useSession();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const historyRef = useRef<SheetHandle>(null);
  const installmentsRef = useRef<SheetHandle>(null);
  const [preset, setPreset] = useState<Preset>('thisMonth');
  const [[from, to], setRange] = useState<[Date, Date]>(() => presetRange('thisMonth'));
  const [busy, setBusy] = useState<'pdf' | 'xlsx' | null>(null);

  const key = reportKeys.report(from.toDateString(), to.toDateString());
  const report = useQuery({queryKey: key, queryFn: () => getReport(from, to)});
  const history = useQuery({queryKey: ['reports', 'history'], queryFn: () => listAppFiles(REPORTS_FOLDER)});

  const choose = (p: Preset) => {
    setPreset(p);
    if (p !== 'custom') setRange(presetRange(p));
  };

  const download = async (type: 'pdf' | 'xlsx') => {
    setBusy(type);
    try {
      const file = await downloadReport(type, from, to, p => toast.progress('report', t('ui.downloading'), p));
      toast.hide('report');
      queryClient.invalidateQueries({queryKey: ['reports', 'history']});
      toast.success(t('reports.downloaded'), {action: {label: t('common.open'), onPress: () => openFile(file)}});
    } catch (error) {
      toast.hide('report');
      toast.error(errorMessage(error, t));
    } finally {
      setBusy(null);
    }
  };

  const openFile = (file: AppFile) => openAppFile(file, mimeOf(file.name)).catch(() => toast.error(t('reports.noApp')));

  const saveFile = async (file: AppFile) => {
    try {
      await saveAppFileToDownloads(file, mimeOf(file.name), 'Reports');
      toast.success(t('reports.saved', {folder: `Download/${brand.storageFolder}/Reports`}));
    } catch (error) {
      toast.error(errorMessage(error, t));
    }
  };

  const askDelete = (file: AppFile) =>
    confirm.ask({
      title: t('reports.deleteTitle'),
      message: file.name,
      confirmLabel: t('common.delete'),
      destructive: true,
      onConfirm: async () => {
        await deleteAppFile(file.path);
        history.refetch();
      },
    });

  const askClear = () =>
    confirm.ask({
      title: t('reports.clearTitle'),
      message: t('reports.clearHint'),
      confirmLabel: t('reports.clearAll'),
      destructive: true,
      onConfirm: async () => {
        await clearAppFolder(REPORTS_FOLDER);
        history.refetch();
      },
    });

  const sum = report.data?.summary;
  const modules = settings?.modules;

  return (
    <Screen
      header={{
        title: t('reports.title'),
        right: (
          <IconButton
            icon="history"
            label={t('reports.history')}
            variant="plain"
            badge={history.data?.length || undefined}
            onPress={() => {
              history.refetch();
              historyRef.current?.open();
            }}
          />
        ),
      }}
      scroll
      refreshControl={<RefreshControl refreshing={report.isRefetching} onRefresh={report.refetch} />}>
      <Chips<Preset>
        options={[
          {value: 'thisMonth', label: t('reports.thisMonth')},
          {value: 'lastMonth', label: t('reports.lastMonth')},
          {value: 'threeMonths', label: t('reports.threeMonths')},
          {value: 'custom', label: t('reports.custom')},
        ]}
        value={preset}
        onChange={choose}
      />
      <View style={s.dates}>
        <View style={s.half}>
          <DateField
            label={t('reports.from')}
            value={from}
            maximumDate={to}
            onChange={d => {
              if (!d) return;
              setPreset('custom');
              setRange([d, to]);
            }}
          />
        </View>
        <View style={s.half}>
          <DateField
            label={t('reports.to')}
            value={to}
            minimumDate={from}
            onChange={d => {
              if (!d) return;
              setPreset('custom');
              setRange([from, d]);
            }}
          />
        </View>
      </View>

      {report.isError && !report.data ? (
        <ErrorState error={report.error} what={t('reports.title')} onRetry={report.refetch} />
      ) : !sum ? (
        <Skeleton height={160} />
      ) : (
        <>
          <FactTiles
            facts={[
              {label: t('reports.totalLoans'), value: String(sum.totalLoans ?? 0)},
              {label: t('reports.totalAmount'), value: formatMoneyShort(sum.totalLoanAmount)},
            ]}
          />
          <FactTiles
            style={s.tiles}
            facts={[
              {label: t('reports.totalPaid'), value: formatMoneyShort(sum.totalPaidAmount), color: 'success'},
              {label: t('reports.totalPenalty'), value: formatMoneyShort(sum.totalPenaltyAmount), color: 'warning'},
            ]}
          />
          <Section title={t('reports.loanDistribution')}>
            <Card>
              {report.data!.loanAmounts.length ? (
                <Bars
                  items={report.data!.loanAmounts.map(b => ({label: rangeLabel(b.range, 10000), value: b.count}))}
                />
              ) : (
                <Text color="muted">{t('reports.nothing')}</Text>
              )}
            </Card>
          </Section>
          <Card padded={false} style={s.tiles}>
            <OptionRow
              icon="chart-bar"
              title={t('reports.installmentDistribution')}
              onPress={() => installmentsRef.current?.open()}
            />
          </Card>
          <Text variant="small" color="muted" style={s.note}>
            {t('reports.basis')}
          </Text>
        </>
      )}

      <View style={s.actions}>
        <Button
          title={t('reports.pdf')}
          icon="file-pdf-box"
          variant="secondary"
          loading={busy === 'pdf'}
          disabled={!!busy}
          onPress={() => download('pdf')}
        />
        <Button
          title={t('reports.excel')}
          icon="file-excel-box"
          variant="secondary"
          loading={busy === 'xlsx'}
          disabled={!!busy}
          onPress={() => download('xlsx')}
        />
      </View>

      {modules?.performanceReport !== false || modules?.cashHandover ? (
        <Card padded={false} style={s.tiles}>
          {modules?.performanceReport !== false ? (
            <OptionRow
              icon="account-tie-outline"
              title={t('reports.byEmployee')}
              hint={t('reports.byEmployeeHint')}
              onPress={() => navigation.navigate('Performance' as never)}
            />
          ) : null}
          {modules?.cashHandover ? (
            <OptionRow
              icon="hand-coin-outline"
              title={t('cash.adminTitle')}
              onPress={() => navigation.navigate('CashHandovers' as never)}
            />
          ) : null}
        </Card>
      ) : null}

      <BottomSheet ref={installmentsRef} title={t('reports.installmentDistribution')}>
        {report.data?.installmentAmounts.length ? (
          <Bars items={report.data.installmentAmounts.map(b => ({label: rangeLabel(b.range, 100), value: b.count}))} />
        ) : (
          <Text color="muted">{t('reports.nothing')}</Text>
        )}
      </BottomSheet>

      <BottomSheet
        ref={historyRef}
        title={t('reports.history')}
        snapPoints={['70%']}
        footer={
          history.data?.length ? <Button title={t('reports.clearAll')} variant="text" onPress={askClear} /> : undefined
        }>
        <FlatList
          data={history.data ?? []}
          keyExtractor={f => f.path}
          scrollEnabled={false}
          renderItem={({item}) => (
            <ListRow
              left={
                <Icon name={item.name.endsWith('.pdf') ? 'file-pdf-box' : 'file-excel-box'} size={28} color="primary" />
              }
              title={item.name}
              subtitle={`${formatDateTime(item.modified, lang)} · ${Math.max(1, Math.round(item.size / 1024))} KB`}
              onPress={() => openFile(item)}
              right={
                <View style={s.rowActions}>
                  <IconButton
                    icon="share-variant-outline"
                    label={t('common.share')}
                    variant="plain"
                    onPress={() => shareAppFile(item, mimeOf(item.name))}
                  />
                  <IconButton
                    icon="download-outline"
                    label={t('reports.saveToDownloads')}
                    variant="plain"
                    onPress={() => saveFile(item)}
                  />
                  <IconButton
                    icon="delete-outline"
                    label={t('common.delete')}
                    variant="plain"
                    onPress={() => askDelete(item)}
                  />
                </View>
              }
            />
          )}
          ListEmptyComponent={<EmptyState icon="history" title={t('reports.noHistory')} />}
        />
      </BottomSheet>
      <ConfirmSheet ref={confirm.ref} />
    </Screen>
  );
}

const useStyles = makeStyles(t => ({
  dates: {flexDirection: 'row', gap: t.space.sm, marginTop: t.space.md},
  half: {flex: 1, minWidth: 0},
  tiles: {marginTop: t.space.md},
  note: {marginTop: t.space.sm},
  actions: {flexDirection: 'row', gap: t.space.sm, marginTop: t.space.lg, flexWrap: 'wrap'},
  rowActions: {flexDirection: 'row'},
}));
