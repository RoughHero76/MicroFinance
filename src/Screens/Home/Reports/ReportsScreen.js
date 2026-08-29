import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Switch,
  ActivityIndicator, Modal, SafeAreaView, ScrollView, Alert, FlatList, Platform,
} from 'react-native';
import { apiCall } from '../../../components/api/apiUtils';
import { showToast, CustomToast } from '../../../components/toast/CustomToast';
import Icon from '../../../design/Icon';
import { BarChart as ThemedBarChart, DonutChart } from '../../../design/charts';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNFS from '@dr.pogodin/react-native-fs';
import Share from 'react-native-share';
import { API_URL } from '../../../components/api/secrets';
import Screen from '../../../design/components/Screen';
import Card from '../../../design/components/Card';
import Button from '../../../design/components/Button';
import EmptyState from '../../../design/components/EmptyState';
import { colors, spacing, radius, type } from '../../../design/tokens';

/**
 * ReportsScreen — admin loan report (summary + distributions) rebuilt on
 * the "Ink & Amber" design system.
 *  - same behaviour: GET /api/admin/loan/report?format=raw (optionally
 *    startDate/endDate), the exact toasts, the same RNFS download flow to
 *    Download/EVI/Reports with the Bearer token, the share intent with the
 *    original title/message, the same confirm-dialog copy, and the same
 *    history list (the on-disk directory listing)
 *  - the third-party react-native-chart-kit BarChart/PieChart are replaced
 *    with the in-house SVG charts (src/design/charts.js) per the
 *    no-external-UI constraint; the pie legend is now rendered beside the
 *    donut
 *  - fixes: the "Evi/Reports" vs "EVI/Reports" path mismatch, the stuck
 *    spinner on the missing-token path (called setLoading instead of
 *    setDownloadReportLoading), the unguarded reportData.analysis
 *    dereference, formatCurrency crashing on non-numeric values, and
 *    clearAll now deletes the listed files individually instead of
 *    unlinking the directory (which is unreliable with RNFS)
 */

const REPORTS_DIR = `${RNFS.DownloadDirectoryPath}/EVI/Reports`;

const DONUT_COLORS = [
  colors.accent,
  colors.info,
  colors.success,
  colors.warning,
  colors.primary,
  colors.neutral,
];

const isPdfFile = (item) => /\.pdf$/i.test(item.name || '');

const humanSize = (bytes) => {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) {
    return 'N/A';
  }
  return `₹${Number(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};

const DateRow = ({ icon, label, value, onPress }) => (
  <Pressable
    style={({ pressed }) => [styles.dateRow, pressed && { backgroundColor: colors.surfaceAlt }]}
    onPress={onPress}
    hitSlop={4}
  >
    <Icon name={icon} size={18} color={colors.accentDeep} />
    <Text style={styles.dateRowLabel}>{label}</Text>
    <Text style={styles.dateRowValue} numberOfLines={1}>{value}</Text>
    <Icon name="chevron-right" size={16} color={colors.inkMuted} />
  </Pressable>
);

const SummaryStat = ({ icon, label, value, tone }) => (
  <View style={styles.statCell}>
    <View style={[styles.statChip, { backgroundColor: tone?.bg || colors.accentSoft }]}>
      <Icon name={icon} size={16} color={tone?.ink || colors.accentDeep} />
    </View>
    <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
    <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
  </View>
);

const LegendRow = ({ color, label, value }) => (
  <View style={styles.legendRow}>
    <View style={[styles.legendDot, { backgroundColor: color }]} />
    <Text style={styles.legendLabel} numberOfLines={1}>{label}</Text>
    <Text style={styles.legendValue}>{value}</Text>
  </View>
);

const TypeIconChip = ({ item, size = 40 }) => {
  const pdf = isPdfFile(item);
  return (
    <View style={[styles.typeChip, { width: size, height: size }]}>
      <Icon name={pdf ? 'file-pdf-box' : 'file-excel-box'} size={size * 0.52} color={colors.accentDeep} />
    </View>
  );
};

const ReportsScreen = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [downloadedReports, setDownloadedReports] = useState([]);
  const [showDownloadHistory, setShowDownloadHistory] = useState(false);
  const [downloadReportLoading, setDownloadReportLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showClearAllConfirmation, setShowClearAllConfirmation] = useState(false);

  useEffect(() => {
    fetchReportData();
    loadDownloadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchReportData = async (start = null, end = null) => {
    setLoading(true);
    try {
      let endpoint = '/api/admin/loan/report?format=raw';
      if (start && end) {
        endpoint += `&startDate=${start.toISOString().split('T')[0]}&endDate=${end.toISOString().split('T')[0]}`;
      }
      const response = await apiCall(endpoint);
      if (response.error) {
        showToast('error', 'Error', response.message);
      } else {
        setReportData(response);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      showToast('error', 'Error', 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (type) => {
    try {
      setDownloadReportLoading(true);

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        showToast('error', 'Error', 'Authentication token not found');
        return;
      }

      let endpoint = `${API_URL}/api/admin/loan/report?type=${type}`;
      if (startDate && endDate) {
        endpoint += `&startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`;
      }

      const fileName = `report_${type}_${startDate.toISOString().split('T')[0]}_To_${endDate.toISOString().split('T')[0]}.${type}`;
      const dirExists = await RNFS.exists(REPORTS_DIR);
      if (!dirExists) {
        await RNFS.mkdir(REPORTS_DIR);
      }

      const downloadDest = `${REPORTS_DIR}/${fileName}`;

      const result = await RNFS.downloadFile({
        fromUrl: endpoint,
        toFile: downloadDest,
        headers: { Authorization: `Bearer ${token}` },
      }).promise;

      if (result.statusCode === 200) {
        showToast('success', `${type.toUpperCase()} report downloaded successfully`);
        await loadDownloadHistory();
      } else {
        showToast('error', 'Failed to download report');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      showToast('error', `Failed to download report: ${error.message}`);
    } finally {
      setDownloadReportLoading(false);
    }
  };

  const deleteReport = async () => {
    if (!selectedReport) return;
    try {
      await RNFS.unlink(selectedReport.path);
      await loadDownloadHistory();
      showToast('success', 'Report removed from history');
    } catch (error) {
      console.error('Error deleting report:', error);
      showToast('error', `Failed to delete report: ${error.message}`);
    } finally {
      setShowDeleteConfirmation(false);
      setSelectedReport(null);
    }
  };

  const clearAllHistory = async () => {
    try {
      if (!downloadedReports.length) {
        showToast('error', 'No download history found');
        const dirExists = await RNFS.exists(REPORTS_DIR);
        if (!dirExists) await RNFS.mkdir(REPORTS_DIR);
        return;
      }
      for (const report of downloadedReports) {
        try {
          await RNFS.unlink(report.path);
        } catch (e) {
          console.warn('Skipped removing report during clear-all:', e);
        }
      }
      await loadDownloadHistory();
      showToast('success', 'All download history cleared');
    } catch (error) {
      console.error('Error clearing download history:', error);
      showToast('error', 'Failed to clear download history');
    } finally {
      setShowClearAllConfirmation(false);
    }
  };

  const loadDownloadHistory = async () => {
    try {
      const dirExists = await RNFS.exists(REPORTS_DIR);
      if (!dirExists) {
        await RNFS.mkdir(REPORTS_DIR);
      }
      const reports = await RNFS.readDir(REPORTS_DIR);
      setDownloadedReports(reports || []);
    } catch (error) {
      console.error('Error loading download history:', error);
    }
  };

  const handleDeletePress = (report) => {
    setSelectedReport(report);
    setShowDeleteConfirmation(true);
  };

  const handleShareItem = async (report) => {
    try {
      await Share.open({
        title: 'Daily Collection Report',
        message: 'Report is confidential.',
        url: `file://${report.path}`,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    } catch (error) {
      console.error('Error sharing report:', error);
    }
  };

  const openDownloadedReport = (report) => {
    if (Platform.OS !== 'android') {
      Alert.alert('Not supported', 'Opening report files is only supported on Android.');
      return;
    }
    try {
      RNFS.android.actionViewIntent(
        report.path,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ).catch((error) => {
        console.error('Error opening report with intent:', error);
        Alert.alert('Error', 'Do you have an app that can open this type of file?.');
      });
    } catch (error) {
      Alert.alert('Error', `Failed to open report: ${error.message}`);
      showToast('error', `Failed to open report: ${error.message}`);
    }
  };

  const onDateChange = (event, selectedDate, isStartDate) => {
    if (isStartDate) {
      setShowStartDatePicker(false);
      setStartDate(selectedDate || startDate);
    } else {
      setShowEndDatePicker(false);
      setEndDate(selectedDate || endDate);
    }
  };

  const summary = reportData?.analysis?.summary;
  const graphData = reportData?.analysis?.graphData;
  const loanBars = (graphData?.loanAmounts || []).map((item) => ({
    label: `₹${parseInt(item.range, 10) / 1000}k`,
    value: item.count,
  }));
  const donutData = (graphData?.installmentAmounts || []).map((item, index) => ({
    label: `₹${item.range}`,
    value: item.count,
    color: DONUT_COLORS[index % DONUT_COLORS.length],
  }));
  const donutTotal = donutData.reduce((s, d) => s + (Number(d.value) || 0), 0);

  return (
    <Screen scroll bg={colors.bg}>
      <View style={styles.page}>
        <Card>
          <Text style={styles.cardTitle}>Report Range</Text>
          <View style={styles.dateRows}>
            <DateRow
              icon="calendar"
              label="Start"
              value={startDate.toLocaleDateString()}
              onPress={() => setShowStartDatePicker(true)}
            />
            <DateRow
              icon="calendar"
              label="End"
              value={endDate.toLocaleDateString()}
              onPress={() => setShowEndDatePicker(true)}
            />
          </View>
          <Button
            label="Fetch Report"
            icon="refresh"
            variant="accent"
            size="lg"
            full
            loading={loading}
            disabled={loading}
            onPress={() => fetchReportData(startDate, endDate)}
            style={{ marginTop: spacing.sm }}
          />
        </Card>

        <View style={styles.downloadRow}>
          <Button
            label="PDF"
            icon="file-pdf-box"
            variant="outline"
            flex={1}
            loading={downloadReportLoading}
            disabled={downloadReportLoading}
            onPress={() => downloadReport('pdf')}
          />
          <Button
            label="Excel"
            icon="file-excel-box"
            variant="outline"
            flex={1}
            disabled={downloadReportLoading}
            onPress={() => downloadReport('xlsx')}
          />
        </View>

        <Button
          label="View Download History"
          icon="history"
          variant="subtle"
          full
          onPress={() => setShowDownloadHistory(true)}
        />

        {loading && !reportData ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>Loading report…</Text>
          </View>
        ) : !reportData ? (
          <EmptyState
            icon="chart-bar"
            title="No report data yet"
            subtitle="Fetch the report to see the summary and distributions."
            style={{ marginTop: spacing.xxxl }}
          />
        ) : (
          <>
            {summary && (
              <Card style={styles.cardGap}>
                <Text style={styles.cardTitle}>Summary</Text>
                <View style={styles.statGrid}>
                  <SummaryStat
                    icon="file-document-outline"
                    label="Total Loans"
                    value={summary.totalLoans ?? 'N/A'}
                  />
                  <SummaryStat
                    icon="cash"
                    label="Total Loan Amount"
                    value={formatCurrency(summary.totalLoanAmount)}
                    tone={{ bg: colors.infoSoft, ink: colors.infoInk }}
                  />
                  <SummaryStat
                    icon="cash-check"
                    label="Total Paid Amount"
                    value={formatCurrency(summary.totalPaidAmount)}
                    tone={{ bg: colors.successSoft, ink: colors.successInk }}
                  />
                  <SummaryStat
                    icon="alert-circle-outline"
                    label="Total Penalty"
                    value={formatCurrency(summary.totalPenaltyAmount)}
                    tone={{ bg: colors.dangerSoft, ink: colors.dangerInk }}
                  />
                </View>
              </Card>
            )}

            {loanBars.length > 0 && (
              <Card style={styles.cardGap}>
                <Text style={styles.cardTitle}>Loan Amount Distribution</Text>
                <ThemedBarChart data={loanBars} height={180} />
              </Card>
            )}

            {donutData.length > 0 && (
              <Card style={styles.cardGap}>
                <Text style={styles.cardTitle}>Installment Amount Distribution</Text>
                <View style={styles.donutRow}>
                  <DonutChart
                    data={donutData}
                    size={150}
                    thickness={22}
                    centerValue={String(donutTotal)}
                    centerLabel="installments"
                  />
                  <View style={styles.legendCol}>
                    {donutData.map((d, i) => (
                      <LegendRow
                        key={i}
                        color={d.color}
                        label={d.label}
                        value={String(Number(d.value) || 0)}
                      />
                    ))}
                  </View>
                </View>
              </Card>
            )}
          </>
        )}
      </View>

      {showStartDatePicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => onDateChange(event, selectedDate, true)}
        />
      )}
      {showEndDatePicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => onDateChange(event, selectedDate, false)}
        />
      )}

      {/* Download history sheet */}
      <Modal visible={showDownloadHistory} transparent animationType="slide" onRequestClose={() => setShowDownloadHistory(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowDownloadHistory(false)}>
          <SafeAreaView style={styles.sheetContainer}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <View style={styles.grabber} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Download History</Text>
                <View style={styles.sheetHeaderActions}>
                  <Pressable onPress={() => setShowClearAllConfirmation(true)} hitSlop={8}>
                    <Text style={styles.clearAllText}>Clear All</Text>
                  </Pressable>
                  <View style={styles.closeDivider} />
                  <Pressable style={styles.closeBtn} onPress={() => setShowDownloadHistory(false)} hitSlop={8}>
                    <Icon name="close" size={20} color={colors.inkSecondary} />
                  </Pressable>
                </View>
              </View>

              <FlatList
                data={downloadedReports}
                keyExtractor={(item, index) => item.path || String(index)}
                contentContainerStyle={styles.historyList}
                renderItem={({ item }) => (
                  <View style={styles.historyItem}>
                    <Pressable
                      style={({ pressed }) => [styles.historyItemMain, pressed && { opacity: 0.85 }]}
                      onPress={() => openDownloadedReport(item)}
                    >
                      <TypeIconChip item={item} />
                      <View style={styles.historyItemText}>
                        <Text style={styles.historyItemName} numberOfLines={1}>
                          {(item.name || '').replace(/\.(pdf|xlsx)$/i, '').replace(/_/g, ' ')}
                        </Text>
                        <Text style={styles.historyItemMeta}>
                          {isPdfFile(item) ? 'PDF' : 'XLSX'}
                          {item.size ? ` · ${humanSize(item.size)}` : ''}
                        </Text>
                      </View>
                    </Pressable>
                    <Pressable style={styles.roundIconBtn} onPress={() => handleShareItem(item)} hitSlop={6}>
                      <Icon name="share" size={18} color={colors.info} />
                    </Pressable>
                    <Pressable style={styles.roundIconBtn} onPress={() => handleDeletePress(item)} hitSlop={6}>
                      <Icon name="delete" size={18} color={colors.danger} />
                    </Pressable>
                  </View>
                )}
                ListEmptyComponent={
                  <EmptyState
                    icon="history"
                    title="No downloads yet"
                    subtitle="Reports you download will be listed here."
                    style={{ marginTop: spacing.xl }}
                  />
                }
              />

              <View style={styles.sheetFooter}>
                <Button
                  label="Close"
                  variant="outline"
                  size="lg"
                  full
                  onPress={() => setShowDownloadHistory(false)}
                />
              </View>
              <CustomToast />
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Modal>

      {/* Delete single report */}
      <Modal visible={showDeleteConfirmation} transparent animationType="fade" onRequestClose={() => setShowDeleteConfirmation(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowDeleteConfirmation(false)}>
          <Card style={styles.confirmCard} padded={false}>
            <View style={styles.confirmBody}>
              <Text style={styles.confirmTitle}>Delete Report</Text>
              <Text style={styles.confirmText}>Do you want to delete this file?</Text>
              <View style={styles.confirmActions}>
                <Button label="Cancel" variant="outline" flex={1} onPress={() => setShowDeleteConfirmation(false)} />
                <Button label="Delete" variant="danger" flex={1} onPress={deleteReport} />
              </View>
            </View>
          </Card>
        </Pressable>
        <CustomToast />
      </Modal>

      {/* Clear all history */}
      <Modal visible={showClearAllConfirmation} transparent animationType="fade" onRequestClose={() => setShowClearAllConfirmation(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowClearAllConfirmation(false)}>
          <Card style={styles.confirmCard} padded={false}>
            <View style={styles.confirmBody}>
              <Text style={styles.confirmTitle}>Clear All</Text>
              <Text style={styles.confirmText}>
                Are you sure you want to clear all downloads? This action cannot be undone.
              </Text>
              <View style={styles.confirmActions}>
                <Button label="Cancel" variant="outline" flex={1} onPress={() => setShowClearAllConfirmation(false)} />
                <Button label="Clear All" variant="danger" flex={1} onPress={clearAllHistory} />
              </View>
            </View>
          </Card>
        </Pressable>
        <CustomToast />
      </Modal>

      <CustomToast />
    </Screen>
  );
};

const styles = StyleSheet.create({
  page: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  cardGap: {
    marginTop: spacing.md,
  },
  cardTitle: {
    ...type.h2,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  dateRows: {
    gap: spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
  },
  dateRowLabel: {
    ...type.sub,
    color: colors.inkSecondary,
    width: 44,
  },
  dateRowValue: {
    flex: 1,
    ...type.bodyBold,
    color: colors.ink,
  },
  downloadRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  loadingBlock: {
    marginTop: spacing.xxxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    ...type.sub,
    color: colors.inkMuted,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCell: {
    width: '47%',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 6,
  },
  statChip: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statLabel: {
    ...type.caption,
    color: colors.inkMuted,
  },
  statValue: {
    ...type.bodyBold,
    color: colors.ink,
    fontSize: 16,
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  legendCol: {
    flex: 1,
    gap: spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  legendLabel: {
    flex: 1,
    ...type.sub,
    color: colors.inkSecondary,
  },
  legendValue: {
    ...type.bodyBold,
    color: colors.ink,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    alignItems: 'stretch',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: spacing.md,
    maxHeight: '85%',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.borderStrong,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    ...type.h2,
    color: colors.ink,
  },
  sheetHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  clearAllText: {
    ...type.bodyBold,
    color: colors.danger,
    fontSize: 13.5,
  },
  closeDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.border,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.neutralSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyList: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  historyItemMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  historyItemText: {
    flex: 1,
    gap: 2,
  },
  historyItemName: {
    ...type.bodyBold,
    color: colors.ink,
  },
  historyItemMeta: {
    ...type.caption,
    color: colors.inkMuted,
  },
  roundIconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.neutralSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeChip: {
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetFooter: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  confirmCard: {
    margin: spacing.lg,
  },
  confirmBody: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  confirmTitle: {
    ...type.h2,
    color: colors.ink,
  },
  confirmText: {
    ...type.body,
    color: colors.inkSecondary,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});

export default ReportsScreen;
