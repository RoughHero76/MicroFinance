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
                        <TouchableOpacity
                            style={[styles.deleteButton, styles.cancelButton]}
                            onPress={() => setShowClearAllConfirmation(false)}
                        >
                            <Text style={styles.deleteButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.deleteButton, styles.deleteCompletelyButton]}
                            onPress={clearAllHistory}
                        >
                            <Text style={styles.deleteButtonText}>Clear All</Text>
                        </TouchableOpacity>
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
                        <TouchableOpacity
                            style={[styles.deleteButton, styles.deleteHistoryButton]}
                            onPress={() => deleteReport(false)}
                        >
                            <Text style={styles.deleteButtonText}>Yes</Text>
                        </TouchableOpacity>

                    </View>
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => setShowDeleteConfirmation(false)}
                    >
                        <Text style={styles.cancelButtonText}>No</Text>
                    </TouchableOpacity>
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
                    <Icon name="calendar" size={24} color="#333" />
                    <Text style={styles.dateButtonText}>Start: {startDate.toDateString()}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndDatePicker(true)}>
                    <Icon name="calendar" size={24} color="#333" />
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
                <TouchableOpacity style={styles.fetchButton} onPress={() => fetchReportData(startDate, endDate)}>
                    <Text style={styles.fetchButtonText}>Fetch Report</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.downloadButton} onPress={() => downloadReport('pdf')}>
                    <Icon name="file-pdf-box" size={24} color="#fff" />
                    <Text style={styles.buttonText}>Download PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.downloadButton} onPress={() => downloadReport('xlsx')} disabled={downloadReportLoading}>
                    <Icon name="file-excel-box" size={24} color="#fff" />
                    {downloadReportLoading ? (<ActivityIndicator size="small" color="#fff" />) : (<Text style={styles.buttonText}>Download Xlsx</Text>)}
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.historyButton} onPress={() => setShowDownloadHistory(true)}>
                <Icon name="history" size={24} color="#fff" />
                <Text style={styles.buttonText}>View Download History</Text>
            </TouchableOpacity>

            {reportData && (
                <View>
                    <Text style={styles.sectionTitle}>Summary</Text>
                    <View style={styles.summaryContainer}>
                        <SummaryItem icon="file-document-outline" label="Total Loans" value={reportData.analysis.summary.totalLoans ?? "N/A"} />
                        <SummaryItem icon="cash" label="Total Loan Amount" value={formatCurrency(reportData.analysis.summary.totalLoanAmount) ?? "N/A"} />
                        <SummaryItem icon="cash-multiple" label="Avg. Loan Amount" value={formatCurrency(reportData.analysis.summary.averageLoanAmount) ?? "N/A"} />
                        <SummaryItem icon="card-bulleted-outline" label="Total Installment" value={formatCurrency(reportData.analysis.summary.totalInstallmentAmount) ?? "N/A"} />
                        <SummaryItem icon="cash-check" label="Total Paid Amount" value={formatCurrency(reportData.analysis.summary.totalPaidAmount)} />
                        <SummaryItem icon="alert-circle-outline" label="Total Penalty" value={formatCurrency(reportData.analysis.summary.totalPenaltyAmount) ?? "N/A"} />
                    </View>

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
                            legendFontColor: "#7F7F7F",
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
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.modalTitle}>Download History</Text>
                        <TouchableOpacity style={styles.clearAllButton} onPress={() => setShowClearAllConfirmation(true)}>
                            <Text style={styles.clearAllButtonText}>Clear All </Text>
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={downloadedReports}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item }) => (
                            <View style={styles.historyItem}>
                                <TouchableOpacity style={styles.historyItemContent} onPress={() => openDownloadedReport(item)}>
                                    <Icon name={item.type === 'pdf' ? 'file-pdf-box' : 'file-excel-box'} size={24} color="#333" />
                                    <View style={styles.historyItemText}>
                                        <Text style={styles.historyItemType}>{item.name.toUpperCase()} </Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.shareIcon} onPress={() => handleShareItem(item)}>
                                    <Icon name="share" size={24} color="blue" />
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.deleteIcon} onPress={() => handleDeletePress(item)}>
                                    <Icon name="delete" size={24} color="#FF0000" />
                                </TouchableOpacity>

                            </View>
                        )}
                    />
                    <View style={styles.historyButtonsContainer}>

                        <TouchableOpacity style={styles.closeButton} onPress={() => setShowDownloadHistory(false)}>
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            {renderDeleteConfirmationModal()}
            {renderClearAllConfirmationModal()}
            <CustomToast />
        </ScrollView>
    );
};

const SummaryItem = ({ icon, label, value }) => (
    <View style={styles.summaryItem}>
        <Icon name={icon} size={24} color="#333" />
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryValue}>{value}</Text>
    </View>
);

const chartConfig = {
    backgroundColor: "#6200ea",
    backgroundGradientFrom: "#7e57c2",
    backgroundGradientTo: "#ab47bc",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
        borderRadius: 16
    },
    propsForDots: {
        r: "6",
        strokeWidth: "2",
        stroke: "#ffa726"
    }
};

const pieChartColors = [
    "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"
];

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    datePickerContainer: {
        marginBottom: 16,
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        marginBottom: 10,
        backgroundColor: '#fff',
    },
    dateButtonText: {
        color: '#333',
        marginLeft: 10,
    },
    fetchButton: {
        backgroundColor: '#4CAF50',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    fetchButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 24,
        marginBottom: 16,
        color: '#333',
    },
    summaryContainer: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    summaryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    summaryLabel: {
        flex: 1,
        marginLeft: 10,
        fontWeight: 'bold',
        fontSize: 14,
        color: '#666',
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    chart: {
        marginVertical: 8,
        borderRadius: 16,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 24,
        marginBottom: 32,
    },
    downloadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2196F3',
        padding: 12,
        borderRadius: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonText: {
        color: 'white',
        marginLeft: 8,
        fontSize: 16,
        fontWeight: 'bold',
    },
    historyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4CAF50',
        padding: 12,
        borderRadius: 8,
        marginTop: 16,
        justifyContent: 'center',
    },
    modalContainer: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f5f5f5',
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#333',
    },
    historyButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
    },
    clearAllButton: {
        backgroundColor: '#FF6347',
        padding: 12,
        borderRadius: 8,
        marginRight: 8,
        marginBottom: 5,
    },
    clearAllButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
        textAlign: 'center',
    },
    closeButton: {
        flex: 1,

        backgroundColor: '#2196F3',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 16,
    },
    closeButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        marginHorizontal: 5,
    },
    historyItemContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    historyItemText: {
        marginLeft: 12,
    },
    historyItemType: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginRight: 20,
    },
    shareIcon: {
        padding: 8,
    },
    deleteIcon: {
        padding: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    deleteConfirmationContainer: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
        width: '80%',
    },
    deleteConfirmationTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        color: 'black',
    },
    deleteConfirmationText: {
        marginBottom: 16,
        color: 'black',
        fontSize: 16,
    },
    deleteButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    deleteButton: {
        flex: 1,
        padding: 10,
        borderRadius: 4,
        alignItems: 'center',
    },
    deleteCompletelyButton: {
        marginLeft: 8,
        backgroundColor: '#DC143C',
        marginRight: 8,
    },
    deleteHistoryButton: {
        backgroundColor: '#FFA500',
        marginRight: 8,
    },

    deleteButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    cancelButton: {
        padding: 10,
        borderRadius: 4,
        alignItems: 'center',
        backgroundColor: '#ccc',
    },
    cancelButtonText: {
        color: '#333',
        fontWeight: 'bold',
    },
});

export default ReportsScreen;