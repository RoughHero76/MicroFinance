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
    Image,
    Modal
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

    const [selectedImage, setSelectedImage] = useState(null);
    const [showImageModal, setShowImageModal] = useState(false);

    const [loanData, setLoanData] = useState({
        loanAmount: '',
        principalAmount: '',
        loanDuration: '',
        installmentFrequency: '',
        interestRate: '3.38',
        loanStartDate: new Date(),
        gracePeriod: '0',
        loanNumber: '',
        businessFirmName: '',
        businessAddress: '',
        businessPhone: '',
        businessEmail: ''
    });

    const [documents, setDocuments] = useState([]);
    const [newDocumentName, setNewDocumentName] = useState('');
    const [newDocumentType, setNewDocumentType] = useState('Other');

    const [loading, setLoading] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [errors, setErrors] = useState({});

    const handleInputChange = (name, value) => {
        setLoanData({ ...loanData, [name]: value });
        if (errors[name]) {
            setErrors({ ...errors, [name]: null });
        }
    };

    const handleDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setLoanData({ ...loanData, loanStartDate: selectedDate });
        }
    };

    const handleDocumentUpload = async () => {
        if (!newDocumentName.trim()) {
            showToast('error', 'Error', 'Please enter a document name');
            return;
        }

        const options = {
            mediaType: 'photo',
            quality: 1,
        };

        try {
            const result = await launchImageLibrary(options);
            if (result.assets) {
                const newDocument = {
                    fieldname: newDocumentName.trim(),
                    documentName: newDocumentName.trim(),
                    documentType: newDocumentType,
                    uri: result.assets[0].uri,
                    type: result.assets[0].type,
                    name: result.assets[0].fileName,
                };
                setDocuments([...documents, newDocument]);
                setNewDocumentName('');
                setNewDocumentType('Other');
            }
        } catch (error) {
            console.error('Error uploading document:', error);
            showToast('error', 'Error', 'Failed to upload document');
        }
    };

    const handleRemoveDocument = (index) => {
        const updatedDocuments = documents.filter((_, i) => i !== index);
        setDocuments(updatedDocuments);
    };

    const handleViewImage = (imageUri) => {
        setSelectedImage(imageUri);
        setShowImageModal(true);
    };

    const validateForm = () => {
        let isValid = true;
        let newErrors = {};

        // Add validation for all fields
        const requiredFields = [
            'loanAmount', 'principalAmount', 'loanDuration', 'installmentFrequency',
            'interestRate', 'loanNumber', 'businessFirmName', 'businessAddress',
            'businessPhone', 'businessEmail'
        ];

        requiredFields.forEach(field => {
            if (!loanData[field]) {
                newErrors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
                isValid = false;
            }
        });

        if (parseFloat(loanData.loanAmount) <= 0) {
            newErrors.loanAmount = 'Loan amount must be greater than 0';
            isValid = false;
        }

        if (parseFloat(loanData.principalAmount) <= 0) {
            newErrors.principalAmount = 'Principal amount must be greater than 0';
            isValid = false;
        }

        if (parseFloat(loanData.interestRate) < 0) {
            newErrors.interestRate = 'Interest rate must be non-negative';
            isValid = false;
        }

        if (documents.length === 0) {
            newErrors.documents = 'At least one document is required';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleCreateLoan = async () => {
        if (!validateForm()) {
            showToast('error', 'Validation Error', 'Please correct the errors before submitting');
            return;
        }

        try {
            setLoading(true);

            const formData = new FormData();

            Object.keys(loanData).forEach(key => {
                if (loanData[key] instanceof Date) {
                    formData.append(key, loanData[key].toISOString());
                } else {
                    formData.append(key, loanData[key]);
                }
            });

            formData.append('documents', JSON.stringify(documents.map(doc => ({
                fieldname: doc.fieldname,
                documentName: doc.documentName,
                documentType: doc.documentType
            }))));

            documents.forEach((doc, index) => {
                formData.append(doc.fieldname, {
                    uri: doc.uri,
                    type: doc.type,
                    name: doc.name,
                });
            });

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

    const renderInput = (icon, title, placeholder, name, keyboardType = 'default', value, onChangeText, disabled = false) => (
        <View style={styles.inputWrapper}>
            <Text style={styles.inputTitle}>{title}</Text>
            <View style={styles.inputContainer}>
                <Icon name={icon} size={24} color="#6366F1" style={styles.inputIcon} />
                <TextInput
                    style={[styles.input, disabled && styles.disabledInput]}
                    placeholder={placeholder}
                    placeholderTextColor="#9CA3AF"
                    keyboardType={keyboardType}
                    value={value}
                    onChangeText={onChangeText}
                    editable={!disabled}
                />
            </View>
            {errors[name] && <Text style={styles.errorText}>{errors[name]}</Text>}
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
            {errors[name] && <Text style={styles.errorText}>{errors[name]}</Text>}
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

    const renderDocumentUpload = () => (
        <View style={styles.uploadWrapper}>
            <Text style={styles.inputTitle}>Upload Document</Text>
            <View style={styles.documentInputContainer}>
                <TextInput
                    style={styles.documentInput}
                    placeholder="Enter document name"
                    value={newDocumentName}
                    onChangeText={setNewDocumentName}
                    placeholderTextColor={'#9CA3AF'}
                />
                <Picker
                    selectedValue={newDocumentType}
                    style={styles.documentTypePicker}
                    onValueChange={(itemValue) => setNewDocumentType(itemValue)}
                >
                    <Picker.Item label="Id Proof" value="Id Proof" />
                    <Picker.Item label="Bank" value="Bank" />
                    <Picker.Item label="Goverment" value="Goverment" />
                    <Picker.Item label="Photo" value="Photo" />
                    <Picker.Item label="Signature" value="Signature" />
                    <Picker.Item label="Other" value="Other" />

                </Picker>
            </View>
            <TouchableOpacity
                style={styles.uploadButton}
                onPress={handleDocumentUpload}
            >
                <Icon name="file-upload" size={24} color="#fff" />
                <Text style={styles.uploadButtonText}>Upload Document</Text>
            </TouchableOpacity>
            <View style={styles.imagePreviewContainer}>
                {documents.map((doc, index) => (
                    <View key={index} style={styles.uploadedImageContainer}>
                        <TouchableOpacity onPress={() => handleViewImage(doc.uri)}>
                            <Image source={{ uri: doc.uri }} style={styles.uploadedImage} />
                        </TouchableOpacity>
                        <Text style={styles.documentNameText}>{doc.documentName}</Text>
                        <TouchableOpacity
                            style={styles.removeImageButton}
                            onPress={() => handleRemoveDocument(index)}
                        >
                            <Icon name="close" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                ))}
            </View>
            {errors.documents && <Text style={styles.errorText}>{errors.documents}</Text>}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidingView}
            >
                <ScrollView contentContainerStyle={styles.scrollViewContent}>
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Loan Details</Text>
                        {renderInput('pound-box', 'Loan Number', 'Enter loan number', 'loanNumber', 'numeric', loanData.loanNumber, (text) => handleInputChange('loanNumber', text))}

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
                        <Text style={styles.sectionTitle}>Business Details</Text>
                        {renderInput('domain', 'Business Firm Name', 'Enter business firm name', 'businessFirmName', 'default', loanData.businessFirmName, (text) => handleInputChange('businessFirmName', text))}
                        {renderInput('map-marker', 'Business Address', 'Enter business address', 'businessAddress', 'default', loanData.businessAddress, (text) => handleInputChange('businessAddress', text))}
                        {renderInput('phone', 'Business Phone', 'Enter business phone', 'businessPhone', 'phone-pad', loanData.businessPhone, (text) => handleInputChange('businessPhone', text))}
                        {renderInput('email', 'Business Email', 'Enter business email', 'businessEmail', 'email-address', loanData.businessEmail, (text) => handleInputChange('businessEmail', text))}
                    </View>
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Document Upload</Text>
                        {renderDocumentUpload()}
                    </View>

                    <View style={styles.createLoanButtonContainer}>
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
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
            <CustomToast />
            <Modal visible={showImageModal} transparent={true} onRequestClose={() => setShowImageModal(false)}>
                <View style={styles.modalContainer}>
                    <TouchableOpacity style={styles.closeButton} onPress={() => setShowImageModal(false)}>
                        <Icon name="close" size={30} color="#fff" />
                    </TouchableOpacity>
                    <Image source={{ uri: selectedImage }} style={styles.modalImage} resizeMode="contain" />
                </View>
            </Modal>
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
    },
    errorText: {
        color: 'red',
        fontSize: 12,
        marginTop: 4,
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
        marginBottom: 16,
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
    documentInputContainer: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    documentInput: {
        flex: 1.2,
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        color: '#111827',
    },
    documentTypePicker: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        color: '#111827',
    },
    documentNameText: {
        fontSize: 12,
        color: '#4B5563',
        textAlign: 'center',
        marginTop: 4,
    },
    disabledInput: {
        backgroundColor: '#F0F0F0',
        color: '#A0A0A0',
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
        marginBottom: 16,
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#6366F1',
        paddingVertical: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    uploadButtonText: {
        marginLeft: 8,
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    imagePreviewContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 8,
    },
    uploadedImageContainer: {
        position: 'relative',
        marginRight: 8,
        marginBottom: 8,
    },
    uploadedImage: {
        width: 80,
        height: 80,
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
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalImage: {
        width: '90%',
        height: '90%',
    },
    closeButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 1,
    },
    createLoanButtonContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    createButton: {
        backgroundColor: '#6366F1',
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    createButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
export default CreateLoan;