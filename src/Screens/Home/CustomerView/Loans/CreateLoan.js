import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { apiCall } from '../../../../components/api/apiUtils';
import { CustomToast, showToast } from '../../../../components/toast/CustomToast';
import { useNavigation, useRoute } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';

const CreateLoan = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { customerUid } = route.params;

    const [loanData, setLoanData] = useState({
        loanAmount: '',
        principalAmount: '',
        loanDuration: '',
        installmentFrequency: '',
        interestRate: '3.38',
        loanStartDate: new Date(),
        gracePeriod: '0',
    });

    const [documents, setDocuments] = useState({
        stampPaper: '',
        promissoryNote: '',
        stampPaperPhotoLink: null,
        promissoryNotePhotoLink: null,
        blankPaper: null,
        cheques: [],
        governmentIdsFront: [],
        governmentIdsBack: [],
    });

    const [chequesDetails, setChequesDetails] = useState([]);
    const [governmentIdsDetails, setGovernmentIdsDetails] = useState([]);

    const [loading, setLoading] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const handleInputChange = (name, value) => {
        setLoanData({ ...loanData, [name]: value });
    };

    const handleDocumentInputChange = (name, value) => {
        setDocuments({ ...documents, [name]: value });
    };

    const handleDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setLoanData({ ...loanData, loanStartDate: selectedDate });
        }
    };

    const handleDocumentUpload = async (documentType, multiple = false) => {
        const options = {
            mediaType: 'photo',
            quality: 1,
            multiple,
        };

        try {
            const result = await launchImageLibrary(options);
            if (result.assets) {
                if (multiple) {
                    setDocuments(prev => ({
                        ...prev,
                        [documentType]: [...(prev[documentType] || []), ...result.assets.map(asset => ({ photoLink: asset.uri }))],
                    }));
                } else {
                    setDocuments(prev => ({ ...prev, [documentType]: result.assets[0].uri }));
                }
            }
        } catch (error) {
            console.error('Error uploading document:', error);
            showToast('error', 'Error', 'Failed to upload document');
        }
    };

    const handleChequeDetailsChange = (index, field, value) => {
        const updatedCheques = [...chequesDetails];
        updatedCheques[index] = { ...updatedCheques[index], [field]: value };
        setChequesDetails(updatedCheques);
    };

    const handleGovernmentIdDetailsChange = (index, field, value) => {
        const updatedIds = [...governmentIdsDetails];
        updatedIds[index] = { ...updatedIds[index], [field]: value };
        setGovernmentIdsDetails(updatedIds);
    };

    const handleCreateLoan = async () => {
        try {
            if (!loanData.loanAmount || !loanData.principalAmount || !loanData.loanDuration || !loanData.installmentFrequency || !loanData.interestRate || !loanData.loanStartDate) {
                showToast('error', 'Error', 'All fields are required');
                return;
            }

            setLoading(true);

            const formData = new FormData();

            Object.keys(loanData).forEach(key => {
                if (loanData[key] instanceof Date) {
                    formData.append(key, loanData[key].toISOString());
                } else {
                    formData.append(key, loanData[key]);
                }
            });

            formData.append('documents', JSON.stringify({
                stampPaper: documents.stampPaper,
                promissoryNote: documents.promissoryNote,
            }));

            if (documents.stampPaperPhotoLink) {
                formData.append('stampPaperPhoto', {
                    uri: documents.stampPaperPhotoLink,
                    type: 'image/jpeg',
                    name: 'stampPaperPhoto.jpg',
                });
            }
            if (documents.promissoryNotePhotoLink) {
                formData.append('promissoryNotePhoto', {
                    uri: documents.promissoryNotePhotoLink,
                    type: 'image/jpeg',
                    name: 'promissoryNotePhoto.jpg',
                });
            }
            if (documents.blankPaper) {
                formData.append('blankPaper', {
                    uri: documents.blankPaper,
                    type: 'image/jpeg',
                    name: 'blankPaper.jpg',
                });
            }

            documents.cheques.forEach((cheque, index) => {
                formData.append('cheques', {
                    uri: cheque.photoLink,
                    type: 'image/jpeg',
                    name: `cheque_${index}.jpg`,
                });
            });

            documents.governmentIdsFront.forEach((id, index) => {
                formData.append('governmentIdsFront', {
                    uri: id.photoLink,
                    type: 'image/jpeg',
                    name: `governmentIdFront_${index}.jpg`,
                });
            });
            documents.governmentIdsBack.forEach((id, index) => {
                formData.append('governmentIdsBack', {
                    uri: id.photoLink,
                    type: 'image/jpeg',
                    name: `governmentIdBack_${index}.jpg`,
                });
            });

            formData.append('chequesDetails', JSON.stringify(chequesDetails));
            formData.append('governmentIdsDetails', JSON.stringify(governmentIdsDetails));

            formData.append('customerUid', customerUid);

            const response = await apiCall('/api/admin/loan', 'POST', formData, true);

            if (response.status === 'success') {
                showToast('success', 'Success', 'Loan created successfully');
                navigation.goBack();
            } else {
                showToast('error', 'Error', response.message || 'Failed to create loan');
            }

        } catch (error) {
            console.error('Error creating loan:', error);
            showToast('error', 'Error', 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveDocument = (documentType, index = null) => {
        if (index !== null) {
            setDocuments(prev => ({
                ...prev,
                [documentType]: prev[documentType].filter((_, i) => i !== index),
            }));
        } else {
            setDocuments(prev => ({ ...prev, [documentType]: null }));
        }
    };

    const renderInput = (icon, title, placeholder, name, keyboardType = 'default', value, onChangeText) => (
        <View style={styles.inputWrapper}>
            <Text style={styles.inputTitle}>{title}</Text>
            <View style={styles.inputContainer}>
                <Icon name={icon} size={24} color="#6366F1" style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    placeholderTextColor="#9CA3AF"
                    keyboardType={keyboardType}
                    value={value}
                    onChangeText={onChangeText}
                />
            </View>
        </View>
    );

    const renderPicker = (icon, title, name, options, value, onValueChange) => (
        <View style={styles.inputWrapper}>
            <Text style={styles.inputTitle}>{title}</Text>
            <View style={styles.inputContainer}>
                <Icon name={icon} size={24} color="#6366F1" style={styles.inputIcon} />
                <Picker
                    selectedValue={value}
                    style={styles.picker}
                    onValueChange={onValueChange}
                >
                    {options.map((option) => (
                        <Picker.Item key={option.value} label={option.label} value={option.value} />
                    ))}
                </Picker>
            </View>
        </View>
    );

    const renderDatePicker = () => (
        <View style={styles.inputWrapper}>
            <Text style={styles.inputTitle}>Loan Start Date</Text>
            <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
            >
                <Icon name="calendar" size={24} color="#6366F1" style={styles.inputIcon} />
                <Text style={styles.datePickerButtonText}>
                    {loanData.loanStartDate.toDateString()}
                </Text>
            </TouchableOpacity>
            {showDatePicker && (
                <DateTimePicker
                    value={loanData.loanStartDate}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                />
            )}
        </View>
    );

    const renderDocumentUploadButton = (title, documentType, multiple = false, currentValue, maxAllowed = Infinity) => (
        <View style={styles.uploadWrapper}>
            <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => handleDocumentUpload(documentType, multiple)}
                disabled={multiple && currentValue && currentValue.length >= maxAllowed}
            >
                <Icon name="file-upload" size={24} color="#fff" />
                <Text style={styles.uploadButtonText}>{title}</Text>
            </TouchableOpacity>
            {currentValue && !multiple && (
                <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveDocument(documentType)}
                >
                    <Icon name="close" size={24} color="#fff" />
                </TouchableOpacity>
            )}
            {multiple && (
                <Text style={styles.uploadCount}>
                    {currentValue ? currentValue.length : 0} / {maxAllowed}
                </Text>
            )}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidingView}
            >
                <ScrollView contentContainerStyle={styles.scrollViewContent}>
                    <Text style={styles.title}>Create New Loan</Text>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Loan Details</Text>
                        <View style={styles.row}>
                            {renderInput('currency-inr', 'Loan Amount', 'Enter loan amount', 'loanAmount', 'numeric', loanData.loanAmount, (text) => handleInputChange('loanAmount', text))}
                            {renderInput('cash', 'Principal Amount', 'Enter principal amount', 'principalAmount', 'numeric', loanData.principalAmount, (text) => handleInputChange('principalAmount', text))}
                        </View>
                        <View style={styles.row}>
                            {renderPicker('calendar-range', 'Loan Duration', 'loanDuration', [
                                { label: 'Select Loan Duration', value: '' },
                                { label: '100 days', value: '100 days' },
                                { label: '200 days', value: '200 days' },
                                { label: '300 days', value: '300 days' },
                            ], loanData.loanDuration, (itemValue) => handleInputChange('loanDuration', itemValue))}
                            {renderPicker('calendar-clock', 'Installment Frequency', 'installmentFrequency', [
                                { label: 'Select Frequency', value: '' },
                                { label: 'Daily', value: 'Daily' },
                                { label: 'Weekly', value: 'Weekly' },
                                { label: 'Monthly', value: 'Monthly' },
                            ], loanData.installmentFrequency, (itemValue) => handleInputChange('installmentFrequency', itemValue))}
                        </View>
                        <View style={styles.row}>
                            {renderInput('percent', 'Interest Rate', 'Enter interest rate', 'interestRate', 'numeric', loanData.interestRate, (text) => handleInputChange('interestRate', text))}
                            {renderInput('timer-sand', 'Grace Period', 'Enter grace period (days)', 'gracePeriod', 'numeric', loanData.gracePeriod, (text) => handleInputChange('gracePeriod', text))}
                        </View>
                        {renderDatePicker()}
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Document Details</Text>
                        {renderInput('file-document', 'Stamp Paper Details', 'Enter stamp paper details', 'stampPaper', 'default', documents.stampPaper, (text) => handleDocumentInputChange('stampPaper', text))}
                        {renderInput('file-document', 'Promissory Note Details', 'Enter promissory note details', 'promissoryNote', 'default', documents.promissoryNote, (text) => handleDocumentInputChange('promissoryNote', text))}
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Document Upload</Text>
                        {renderDocumentUploadButton('Upload Stamp Paper Photo', 'stampPaperPhotoLink')}
                        {renderDocumentUploadButton('Upload Promissory Note Photo', 'promissoryNotePhotoLink')}
                        {renderDocumentUploadButton('Upload Blank Paper', 'blankPaper')}
                        {renderDocumentUploadButton('Upload Cheques', 'cheques', true, documents.cheques, 5)}
                        {renderDocumentUploadButton('Upload Government IDs (Front)', 'governmentIdsFront', true, documents.governmentIdsFront, 2)}
                        {renderDocumentUploadButton('Upload Government IDs (Back)', 'governmentIdsBack', true, documents.governmentIdsBack, 2)}
                    </View>
                    {documents.cheques.map((_, index) => (
                        <View key={`cheque_${index}`} style={styles.section}>
                            <Text style={styles.sectionTitle}>Cheque {index + 1} Details</Text>
                            {renderInput('numeric', 'Cheque Number', 'Enter cheque number', `chequeNumber_${index}`, 'default', chequesDetails[index]?.number, (text) => handleChequeDetailsChange(index, 'number', text))}
                            {renderInput('bank', 'Bank Name', 'Enter bank name', `chequeBankName_${index}`, 'default', chequesDetails[index]?.bankName, (text) => handleChequeDetailsChange(index, 'bankName', text))}
                            {renderInput('account', 'Account Number', 'Enter account number', `chequeAccountNumber_${index}`, 'numeric', chequesDetails[index]?.accountNumber, (text) => handleChequeDetailsChange(index, 'accountNumber', text))}
                            {renderInput('alphabetical', 'IFSC Code', 'Enter IFSC code', `chequeIFSC_${index}`, 'default', chequesDetails[index]?.ifsc, (text) => handleChequeDetailsChange(index, 'ifsc', text))}
                        </View>
                    ))}

                    {documents.governmentIdsFront.map((_, index) => (
                        <View key={`govId_${index}`} style={styles.section}>
                            <Text style={styles.sectionTitle}>Government ID {index + 1} Details</Text>
                            {renderPicker(
                                'card-account-details',
                                'ID Type',
                                `govIdType_${index}`,
                                [
                                    { label: 'Select ID Type', value: '' },
                                    { label: 'Aadhar', value: 'Aadhar' },
                                    { label: 'PAN', value: 'PAN' },
                                    { label: 'Driving License', value: 'Driving License' },
                                    { label: 'Voter ID', value: 'Voter ID' },
                                    { label: 'Passport', value: 'Passport' },
                                ],
                                governmentIdsDetails[index]?.type,
                                (value) => handleGovernmentIdDetailsChange(index, 'type', value)
                            )}
                            {renderInput(
                                'identifier',
                                'ID Number',
                                'Enter ID number',
                                `govIdNumber_${index}`,
                                'default',
                                governmentIdsDetails[index]?.number,
                                (text) => handleGovernmentIdDetailsChange(index, 'number', text)
                            )}
                        </View>
                    ))}

                    <TouchableOpacity
                        style={styles.createButton}
                        onPress={handleCreateLoan}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                            <Text style={styles.createButtonText}>Create Loan</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
            <CustomToast />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    scrollViewContent: {
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 24,
        textAlign: 'center',
    },
    section: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    inputWrapper: {
        flex: 1,
        marginRight: 8,
    },
    inputTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4B5563',
        marginBottom: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 12,
        color: '#111827',
    },
    picker: {
        flex: 1,
        height: 50,
        color: '#111827',
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    datePickerButtonText: {
        marginLeft: 8,
        fontSize: 16,
        color: '#111827',
    },
    uploadWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    uploadButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#6366F1',
        paddingVertical: 12,
        borderRadius: 8,
    },
    uploadButtonText: {
        marginLeft: 8,
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    removeButton: {
        backgroundColor: '#EF4444',
        padding: 8,
        borderRadius: 8,
        marginLeft: 8,
    },
    uploadCount: {
        marginLeft: 8,
        fontSize: 14,
        color: '#4B5563',
    },
    uploadedImageContainer: {
        position: 'relative',
        marginTop: 8,
    },
    uploadedImage: {
        width: '100%',
        height: 150,
        borderRadius: 8,
    },
    removeImageButton: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 12,
        padding: 4,
    },
    createButton: {
        backgroundColor: '#6366F1',
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default CreateLoan;