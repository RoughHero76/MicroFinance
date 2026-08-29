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
    Modal,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { apiCall } from '../../../../components/api/apiUtils';
import { CustomToast, showToast } from '../../../../components/toast/CustomToast';
import { useNavigation, useRoute } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { colors, spacing, type, radii, shadow } from '../../../../theme/tokens';
import EviCard from '../../../../components/ui/EviCard';
import EviButton from '../../../../components/ui/EviButton';

const CreateLoan = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { customerUid } = route.params || {};

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

    const formatAmount = (amount) => {
        if (!amount) return '';
        return parseFloat(amount).toLocaleString('en-IN');
    };

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
            quality: 0.3,
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

    const createLoan = async () => {
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
    }

    const handleCreateLoan = async () => {
        Alert.alert('Confirm Loan Creation', 'Are you sure you want to create this loan?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'OK', onPress: () => createLoan() }
        ])
    };

    const renderInput = (icon, title, placeholder, name, keyboardType = 'default', value, onChangeText, disabled = false) => (
        <View style={styles.inputWrapper}>
            <Text style={styles.inputTitle}>{title}</Text>
            <View style={styles.inputContainer}>
                <Icon name={icon} size={20} color={colors.brand} style={styles.inputIcon} />
                <TextInput
                    style={[styles.input, disabled && styles.disabledInput]}
                    placeholder={placeholder}
                    placeholderTextColor={colors.inkFaint}
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
            <View style={styles.pickerWrap}>
                <Icon name={icon} size={20} color={colors.brand} style={styles.inputIcon} />
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
                <Icon name="calendar" size={20} color={colors.brand} style={styles.inputIcon} />
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
                    placeholderTextColor={colors.inkFaint}
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
            <EviButton
                title="Upload Document"
                icon="file-upload"
                variant="secondary"
                size="md"
                style={styles.uploadButton}
                onPress={handleDocumentUpload}
            />
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
                            <Icon name="close" size={14} color={colors.white} />
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
                    <EviCard elevated={false} style={styles.section}>
                        <Text style={styles.sectionTitle}>Loan Details</Text>
                        {renderInput('pound-box', 'Loan Number', 'Enter loan number', 'loanNumber', 'numeric', loanData.loanNumber, (text) => handleInputChange('loanNumber', text))}

                        <View style={styles.row}>
                            {renderInput('currency-inr', 'Loan Amount', 'Enter loan amount', 'loanAmount', 'numeric', formatAmount(loanData.loanAmount), (text) => handleInputChange('loanAmount', text.replace(/,/g, '')))}
                            {renderInput('cash', 'Principal Amount', 'Enter principal amount', 'principalAmount', 'numeric', formatAmount(loanData.principalAmount), (text) => handleInputChange('principalAmount', text.replace(/,/g, '')))}

                        </View>
                        <View style={styles.row}>
                            {renderPicker('calendar-range', 'Loan Duration', 'loanDuration', [
                                { label: 'Select Loan Duration', value: '' },
                                { label: '100 days', value: '100 days' },
                                { label: '200 days', value: '200 days' },
                                { label: '300 days', value: '300 days' },
                                { label: '400 days', value: '400 days' },
                                { label: '500 days', value: '500 days' },
                                { label: '600 days', value: '600 days' },
                                { label: '700 days', value: '700 days' },
                                { label: '800 days', value: '800 days' },
                                { label: '900 days', value: '900 days' },
                                { label: '1000 days', value: '1000 days' },
                                { label: '1100 days', value: '1100 days' },
                                { label: '1200 days', value: '1200 days' },
                                { label: '1300 days', value: '1300 days' },
                                { label: '1400 days', value: '1400 days' },
                                { label: '1500 days', value: '1500 days' },
                                { label: '1600 days', value: '1600 days' },
                                { label: '1700 days', value: '1700 days' },
                                { label: '1800 days', value: '1800 days' },
                                { label: '1900 days', value: '1900 days' },
                                { label: '2000 days', value: '2000 days' },
                                { label: '2100 days', value: '2100 days' },
                                { label: '2200 days', value: '2200 days' },
                            ], loanData.loanDuration, (itemValue) => handleInputChange('loanDuration', itemValue))}
                            {renderPicker('calendar-clock', 'Installment Frequency', 'installmentFrequency', [
                                { label: 'Select Frequency', value: '' },
                                { label: 'Daily', value: 'Daily' },
                                { label: 'Weekly', value: 'Weekly' },
                                { label: 'Monthly', value: 'Monthly' },
                            ], loanData.installmentFrequency, (itemValue) => handleInputChange('installmentFrequency', itemValue))}
                        </View>
                        <View style={styles.row}>
                            {renderInput('percent', 'Interest Rate', 'Enter interest rate', 'interestRate', 'numeric', loanData.interestRate, disabled = true, (text) => handleInputChange('interestRate', text))}
                            {renderInput('timer-sand', 'Grace Period', 'Enter grace period (days)', 'gracePeriod', 'numeric', loanData.gracePeriod, disabled = true, (text) => handleInputChange('gracePeriod', text))}
                        </View>
                        {renderDatePicker()}
                    </EviCard>

                    <EviCard elevated={false} style={styles.section}>
                        <Text style={styles.sectionTitle}>Business Details</Text>
                        {renderInput('domain', 'Business Firm Name', 'Enter business firm name', 'businessFirmName', 'default', loanData.businessFirmName, (text) => handleInputChange('businessFirmName', text))}
                        {renderInput('map-marker', 'Business Address', 'Enter business address', 'businessAddress', 'default', loanData.businessAddress, (text) => handleInputChange('businessAddress', text))}
                        {renderInput('phone', 'Business Phone', 'Enter business phone', 'businessPhone', 'phone-pad', loanData.businessPhone, (text) => handleInputChange('businessPhone', text))}
                        {renderInput('email', 'Business Email', 'Enter business email', 'businessEmail', 'email-address', loanData.businessEmail, (text) => handleInputChange('businessEmail', text))}
                    </EviCard>
                    <EviCard elevated={false} style={styles.section}>
                        <Text style={styles.sectionTitle}>Document Upload</Text>
                        {renderDocumentUpload()}
                    </EviCard>

                    <EviButton
                        title="Create Loan"
                        onPress={handleCreateLoan}
                        disabled={loading}
                        loading={loading}
                        icon="plus-circle"
                        variant="primary"
                        size="lg"
                        style={styles.createLoanButton}
                    />
                </ScrollView>
            </KeyboardAvoidingView>
            <Modal visible={showImageModal} transparent={true} onRequestClose={() => setShowImageModal(false)}>
                <View style={styles.modalContainer}>
                    <TouchableOpacity style={styles.closeButton} onPress={() => setShowImageModal(false)}>
                        <Icon name="close" size={20} color={colors.inkSoft} />
                    </TouchableOpacity>
                    <Image source={{ uri: selectedImage }} style={styles.modalImage} resizeMode="contain" />
                </View>
                <CustomToast />
            </Modal>
        </SafeAreaView>
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surface,
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    scrollViewContent: {
        padding: spacing.lg,
        paddingBottom: spacing.xxl,
    },
    errorText: {
        color: colors.danger,
        fontSize: type.sizes.sm,
        marginTop: spacing.xs,
    },
    section: {
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        fontSize: type.sizes.xl,
        fontWeight: type.weights.bold,
        color: colors.ink,
        marginBottom: spacing.lg,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    inputWrapper: {
        flex: 1,
        marginRight: spacing.sm,
        marginBottom: spacing.lg,
    },
    inputTitle: {
        fontSize: type.sizes.sm,
        fontWeight: type.weights.semibold,
        color: colors.inkSoft,
        marginBottom: spacing.xs,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radii.md,
        paddingHorizontal: spacing.md,
        borderWidth: 1,
        borderColor: colors.line,
    },
    inputIcon: {
        marginRight: spacing.sm,
    },
    input: {
        flex: 1,
        fontSize: type.sizes.md,
        paddingVertical: spacing.md,
        color: colors.ink,
    },
    documentInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    documentInput: {
        flex: 1.2,
        backgroundColor: colors.surface,
        borderRadius: radii.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginRight: spacing.sm,
        borderWidth: 1,
        borderColor: colors.line,
        color: colors.ink,
        fontSize: type.sizes.md,
    },
    documentTypePicker: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.line,
        color: colors.ink,
    },
    documentNameText: {
        fontSize: type.sizes.xs,
        color: colors.inkSoft,
        textAlign: 'center',
        marginTop: spacing.xs,
    },
    disabledInput: {
        color: colors.inkFaint,
    },
    pickerWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.line,
        paddingHorizontal: spacing.md,
    },
    picker: {
        flex: 1,
        height: 48,
        color: colors.ink,
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.line,
    },
    datePickerButtonText: {
        marginLeft: spacing.sm,
        fontSize: type.sizes.md,
        color: colors.ink,
    },
    uploadWrapper: {
        marginBottom: spacing.md,
    },
    uploadButton: {
        marginBottom: spacing.sm,
    },
    imagePreviewContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: spacing.sm,
    },
    uploadedImageContainer: {
        position: 'relative',
        marginRight: spacing.sm,
        marginBottom: spacing.sm,
    },
    uploadedImage: {
        width: 80,
        height: 80,
        borderRadius: radii.md,
    },
    removeImageButton: {
        position: 'absolute',
        top: spacing.xs,
        right: spacing.xs,
        backgroundColor: colors.danger,
        borderRadius: radii.pill,
        padding: spacing.xs,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(10, 31, 22, 0.92)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalImage: {
        width: '90%',
        height: '90%',
    },
    closeButton: {
        position: 'absolute',
        top: spacing.xl,
        right: spacing.lg,
        zIndex: 1,
        width: 36,
        height: 36,
        borderRadius: radii.pill,
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
    },
    createLoanButton: {
        marginTop: spacing.sm,
        marginBottom: spacing.lg,
    },
});
export default CreateLoan;
