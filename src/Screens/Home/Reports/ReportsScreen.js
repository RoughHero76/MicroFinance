import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, Modal, FlatList, PermissionsAndroid, Platform, Alert, ActivityIndicator } from "react-native";
import { apiCall } from "../../../components/api/apiUtils";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { CustomToast, showToast } from "../../../components/toast/CustomToast";
import { BarChart, PieChart } from "react-native-chart-kit";
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { API_URL } from "../../../components/api/secrets";
import * as RNFS from '@dr.pogodin/react-native-fs';
import Share from 'react-native-share';
import { colors, spacing, type, radii, shadow } from "../../../theme/tokens";
import EviButton from "../../../components/ui/EviButton";
import EviCard from "../../../components/ui/EviCard";
import EmptyState from "../../../components/ui/EmptyState";

const { width } = Dimensions.get("window");
const android = ReactNativeBlobUtil.android;
const ReportsScreen = () => {

    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [downloadedReports, setDownloadedReports] = useState([]);
    const [showDownloadHistory, setShowDownloadHistory] = useState(false);

    //Download Loadings,
    const [downloadReportLoading, setDownloadReportLoading] = useState(false);

    const [selectedReport, setSelectedReport] = useState(null);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [showClearAllConfirmation, setShowClearAllConfirmation] = useState(false);

    useEffect(() => {
        fetchReportData();
        loadDownloadHistory();
    }, []);

    const fetchReportData = async (start = null, end = null) => {
        setLoading(true);
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
        setLoading(false);
    };

    const downloadReport = async (type) => {

        try {
            setDownloadReportLoading(true);

            const token = await AsyncStorage.getItem('token');
            if (!token) {
                showToast('error', 'Error', 'Authentication token not found');
                setLoading(false);
                return;
            }

            let endpoint = `${API_URL}/api/admin/loan/report?type=${type}`;
            if (startDate && endDate) {
                endpoint += `&startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`;
            }

            const fileName = `report_${type}_${startDate.toISOString().split('T')[0]}_To_${endDate.toISOString().split('T')[0]}.${type}`;
            let exsitsCheck = await RNFS.exists(`${RNFS.DownloadDirectoryPath}/Evi/Reports`);
            if (!exsitsCheck) {
                await RNFS.mkdir(`${RNFS.DownloadDirectoryPath}/EVI/Reports`);
            }

            let downloadDest = `${RNFS.DownloadDirectoryPath}/EVI/Reports/${fileName}`;


            const options = {
                fromUrl: endpoint,
                toFile: downloadDest,
                headers: {
                    Authorization: `Bearer ${token}`
                }

            }

            const result = await RNFS.downloadFile(options).promise;
            if (result.statusCode === 200) {
                showToast('success', `${type.toUpperCase()} report downloaded successfully`);
                const newReport = { type, date: new Date().toISOString(), path: downloadDest };
                await addToDownloadHistory(newReport);
            } else {
                showToast('error', 'Failed to download report');
            }

        } catch (error) {
            showToast('error', `Failed to download report: ${error.message}`);
            console.error('Error downloading report:', error);
        } finally {
            setDownloadReportLoading(false);
        }
    };


    const addToDownloadHistory = async (newReport) => {
        try {
            loadDownloadHistory();
        } catch (error) {
            console.error('Error saving download history:', error);
            showToast('error', 'Failed to save download history');
        }
    };

    const deleteReport = async (clearAll) => {
        if (!selectedReport) return;
        try {
            await RNFS.unlink(selectedReport.path);
            loadDownloadHistory();
            showToast('success', 'Report removed from history');
        } catch (error) {
            console.error('Error deleting report:', error);
            showToast('error', `Failed to delete report: ${error.message}`);
        } finally {
            console.log('deleteReport: resetting state');
            setShowDeleteConfirmation(false);
            setSelectedReport(null);
        }
    };

    const clearAllHistory = async () => {
        try {
            const directoryCheck = await RNFS.exists(`${RNFS.DownloadDirectoryPath}/EVI/Reports`);
            if (!directoryCheck) {
                showToast('error', 'No download history found');
                RNFS.mkdir(`${RNFS.DownloadDirectoryPath}/EVI/Reports`);
                return;
            }
            await RNFS.unlink(`${RNFS.DownloadDirectoryPath}/EVI/Reports`);
            RNFS.mkdir(`${RNFS.DownloadDirectoryPath}/EVI/Reports`);
            loadDownloadHistory();
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
            checkIfDirExists = await RNFS.exists(`${RNFS.DownloadDirectoryPath}/EVI/Reports`);
            if (!checkIfDirExists) {
                RNFS.mkdir(`${RNFS.DownloadDirectoryPath}/EVI/Reports`);
            }
            const reports = await RNFS.readDir(`${RNFS.DownloadDirectoryPath}/EVI/Reports`);
            setDownloadedReports(reports);
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
            console.log('Sharing report:', report.path);
            const shareOptions = {
                title: 'Daily Collection Report',
                message: 'Report is confidential.',
                url: `file://${report.path}`,
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            };
            await Share.open(shareOptions);

        } catch (error) {
            console.error('Error', error);
        }
    }

    const renderClearAllConfirmationModal = () => (
        <Modal
            visible={showClearAllConfirmation}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowClearAllConfirmation(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.deleteConfirmationContainer}>
                    <Text style={styles.deleteConfirmationTitle}>Clear All</Text>
                    <Text style={styles.deleteConfirmationText}>
                        Are you sure you want to clear all downloads? This action cannot be undone.
                    </Text>
                    <View style={styles.deleteButtonsContainer}>
                        <EviButton
                            title="Cancel"
                            variant="secondary"
                            style={styles.modalRowButton}
                            onPress={() => setShowClearAllConfirmation(false)}
                        />
                        <EviButton
                            title="Clear All"
                            variant="danger"
                            style={styles.modalRowButton}
                            onPress={clearAllHistory}
                        />
                    </View>
                </View>
            </View>
            <CustomToast />
        </Modal>
    );
    const renderDeleteConfirmationModal = () => (
        <Modal
            visible={showDeleteConfirmation}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowDeleteConfirmation(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.deleteConfirmationContainer}>
                    <Text style={styles.deleteConfirmationTitle}>Delete Report</Text>
                    <Text style={styles.deleteConfirmationText}>
                        Do you want to delete this the file?
                    </Text>
                    <View style={styles.deleteButtonsContainer}>
                        <EviButton
                            title="Yes, Delete"
                            variant="danger"
                            style={styles.modalRowButton}
                            onPress={() => deleteReport(false)}
                        />
                        <EviButton
                            title="No"
                            variant="secondary"
                            style={styles.modalRowButton}
                            onPress={() => setShowDeleteConfirmation(false)}
                        />
                    </View>
                </View>
            </View>
            <CustomToast />
        </Modal>
    );


    const openDownloadedReport = async (report) => {
        try {
            const uri = report.path;
            console.log('opening report', uri);
            android.actionViewIntent(uri, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                .catch(error => {
                    console.error('Error opening report with intent:', error);
                    Alert.alert('Error', 'Do you have an app that can open this type of file?.'); // Generic error message
                });


        } catch (error) {
            Alert.alert('Error', `Failed to open report: ${error.message}`);
            showToast('error', `Failed to open report: ${error.message}`);
            console.log('error opening report', error);
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

    const formatCurrency = (value) => {
        if (value === null) {
            return "N/A";
        }
        return `₹${value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
    };


    return (
        <ScrollView style={styles.container}>
            <View style={styles.datePickerContainer}>
                <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartDatePicker(true)}>
                    <Icon name="calendar" size={20} color={colors.brand} />
                    <Text style={styles.dateButtonText}>Start: {startDate.toDateString()}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndDatePicker(true)}>
                    <Icon name="calendar" size={20} color={colors.brand} />
                    <Text style={styles.dateButtonText}>End: {endDate.toDateString()}</Text>
                </TouchableOpacity>
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
                <EviButton
                    title="Fetch Report"
                    variant="primary"
                    size="lg"
                    icon="filter-variant"
                    style={styles.fetchButton}
                    onPress={() => fetchReportData(startDate, endDate)}
                />
            </View>

            <View style={styles.buttonContainer}>
                <EviButton
                    title="Download PDF"
                    variant="primary"
                    icon="file-pdf-box"
                    style={styles.downloadButton}
                    onPress={() => downloadReport('pdf')}
                />
                <EviButton
                    title="Download Xlsx"
                    variant="secondary"
                    icon="file-excel-box"
                    style={styles.downloadButton}
                    loading={downloadReportLoading}
                    onPress={() => downloadReport('xlsx')}
                />
            </View>

            <EviButton
                title="View Download History"
                variant="secondary"
                icon="history"
                fullWidth
                style={styles.historyButton}
                onPress={() => setShowDownloadHistory(true)}
            />

            {reportData && (
                <View>
                    <Text style={styles.sectionTitle}>Summary</Text>
                    <EviCard style={styles.summaryCard} padding={spacing.xl}>
                        <SummaryItem icon="file-document-outline" label="Total Loans" value={reportData.analysis.summary.totalLoans ?? "N/A"} />
                        <SummaryItem icon="cash" label="Total Loan Amount" value={formatCurrency(reportData.analysis.summary.totalLoanAmount) ?? "N/A"} />
                        {/* <SummaryItem icon="cash-multiple" label="Avg. Loan Amount" value={formatCurrency(reportData.analysis.summary.averageLoanAmount) ?? "N/A"} /> */}
                        {/* <SummaryItem icon="card-bulleted-outline" label="Total Installment" value={formatCurrency(reportData.analysis.summary.totalInstallmentAmount) ?? "N/A"} /> */}
                        <SummaryItem icon="cash-check" label="Total Paid Amount" value={formatCurrency(reportData.analysis.summary.totalPaidAmount)} />
                        <SummaryItem icon="alert-circle-outline" label="Total Penalty" value={formatCurrency(reportData.analysis.summary.totalPenaltyAmount) ?? "N/A"} />
                    </EviCard>

                    <Text style={styles.sectionTitle}>Loan Amount Distribution</Text>
                    <BarChart
                        data={{
                            labels: reportData.analysis.graphData.loanAmounts.map(item => `₹${parseInt(item.range) / 1000}k`),
                            datasets: [{
                                data: reportData.analysis.graphData.loanAmounts.map(item => item.count)
                            }]
                        }}
                        width={width - 32}
                        height={220}
                        yAxisLabel=""
                        chartConfig={chartConfig}
                        style={styles.chart}
                    />

                    <Text style={styles.sectionTitle}>Installment Amount Distribution</Text>
                    <PieChart
                        data={reportData.analysis.graphData.installmentAmounts.map((item, index) => ({
                            name: `₹${item.range}`,
                            population: item.count,
                            color: pieChartColors[index % pieChartColors.length],
                            legendFontColor: colors.inkSoft,
                            legendFontSize: 12
                        }))}
                        width={width - 32}
                        height={220}
                        chartConfig={chartConfig}
                        accessor="population"
                        backgroundColor="transparent"
                        paddingLeft="15"
                        style={styles.chart}
                    />
                </View>
            )}

            <Modal
                visible={showDownloadHistory}
                animationType="slide"
                onRequestClose={() => setShowDownloadHistory(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.historyHeaderRow}>
                        <Text style={styles.modalTitle}>Download History</Text>
                        <EviButton
                            title="Clear All"
                            variant="danger"
                            size="md"
                            onPress={() => setShowClearAllConfirmation(true)}
                        />
                    </View>
                    <FlatList
                        data={downloadedReports}
                        keyExtractor={(item, index) => index.toString()}
                        ListEmptyComponent={
                            <EmptyState
                                icon="history"
                                title="No Downloads Yet"
                                message="Reports you download will appear here"
                            />
                        }
                        renderItem={({ item }) => (
                            <View style={styles.historyItem}>
                                <TouchableOpacity style={styles.historyItemContent} onPress={() => openDownloadedReport(item)}>
                                    <View style={styles.historyIconChip}>
                                        <Icon name={item.type === 'pdf' ? 'file-pdf-box' : 'file-excel-box'} size={20} color={colors.brand} />
                                    </View>
                                    <View style={styles.historyItemText}>
                                        <Text style={styles.historyItemType}>{item.name.toUpperCase()}</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.shareIcon} onPress={() => handleShareItem(item)}>
                                    <Icon name="share" size={22} color={colors.info} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.deleteIcon} onPress={() => handleDeletePress(item)}>
                                    <Icon name="delete" size={22} color={colors.danger} />
                                </TouchableOpacity>
                            </View>
                        )}
                    />
                    <View style={styles.historyButtonsContainer}>
                        <EviButton
                            title="Close"
                            variant="secondary"
                            size="lg"
                            fullWidth
                            onPress={() => setShowDownloadHistory(false)}
                        />
                    </View>
                </View>
                <CustomToast />
            </Modal>
            {renderDeleteConfirmationModal()}
            {renderClearAllConfirmationModal()}
            <CustomToast />
        </ScrollView>
    );
};

const SummaryItem = ({ icon, label, value }) => (
    <View style={styles.summaryItem}>
        <View style={styles.summaryIconChip}>
            <Icon name={icon} size={18} color={colors.brand} />
        </View>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryValue}>{value}</Text>
    </View>
);

const chartConfig = {
    backgroundColor: colors.card,
    backgroundGradientFrom: colors.brandTint,
    backgroundGradientTo: colors.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(14, 90, 58, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(18, 36, 28, ${opacity})`,
    style: {
        borderRadius: radii.lg
    },
    propsForDots: {
        r: "6",
        strokeWidth: "2",
        stroke: colors.orange
    }
};

const pieChartColors = [
    colors.brand, colors.success, colors.info, colors.orange, colors.warning, colors.inkFaint
];

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: spacing.lg,
        backgroundColor: colors.surface,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    datePickerContainer: {
        marginBottom: spacing.lg,
    },
    dateButton: {
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radii.md,
        marginBottom: spacing.md,
        backgroundColor: colors.card,
    },
    dateButtonText: {
        color: colors.ink,
        marginLeft: spacing.md,
        fontSize: type.sizes.md,
        fontWeight: type.weights.medium,
    },
    fetchButton: {
        marginTop: spacing.sm,
    },
    sectionTitle: {
        fontSize: type.sizes.xl,
        fontWeight: type.weights.bold,
        marginTop: spacing.xxl,
        marginBottom: spacing.lg,
        color: colors.ink,
    },
    summaryCard: {
        backgroundColor: colors.card,
    },
    summaryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    summaryIconChip: {
        width: 34,
        height: 34,
        borderRadius: radii.md,
        backgroundColor: colors.brandTint,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    summaryLabel: {
        flex: 1,
        fontSize: type.sizes.md,
        fontWeight: type.weights.semibold,
        color: colors.inkSoft,
    },
    summaryValue: {
        fontSize: type.sizes.lg,
        fontWeight: type.weights.bold,
        color: colors.ink,
    },
    chart: {
        marginVertical: spacing.sm,
        borderRadius: radii.lg,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginTop: spacing.xl,
        marginBottom: spacing.xl,
    },
    downloadButton: {
        flex: 1,
        marginHorizontal: spacing.xs,
    },
    historyButton: {
        marginTop: spacing.sm,
    },
    modalContainer: {
        flex: 1,
        padding: spacing.lg,
        backgroundColor: colors.surface,
    },
    historyHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    modalTitle: {
        fontSize: type.sizes.xl,
        fontWeight: type.weights.bold,
        color: colors.ink,
    },
    historyButtonsContainer: {
        marginTop: spacing.lg,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        padding: spacing.md,
        borderRadius: radii.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.line,
    },
    historyItemContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    historyIconChip: {
        width: 38,
        height: 38,
        borderRadius: radii.md,
        backgroundColor: colors.brandTint,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    historyItemText: {
        flex: 1,
    },
    historyItemType: {
        fontSize: type.sizes.md,
        fontWeight: type.weights.semibold,
        color: colors.ink,
    },
    shareIcon: {
        padding: spacing.sm,
    },
    deleteIcon: {
        padding: spacing.sm,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(10, 31, 22, 0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    deleteConfirmationContainer: {
        backgroundColor: colors.card,
        borderRadius: radii.xl,
        overflow: 'hidden',
        padding: spacing.xl,
        width: '85%',
        ...shadow.card,
    },
    deleteConfirmationTitle: {
        fontSize: type.sizes.xl,
        fontWeight: type.weights.bold,
        marginBottom: spacing.sm,
        color: colors.ink,
    },
    deleteConfirmationText: {
        marginBottom: spacing.lg,
        color: colors.inkSoft,
        fontSize: type.sizes.md,
        lineHeight: 22,
    },
    deleteButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalRowButton: {
        flex: 1,
        marginHorizontal: spacing.xs,
    },
});

export default ReportsScreen;
