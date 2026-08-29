import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Modal, Alert, Pressable } from 'react-native';
import { apiCall } from '../../../../components/api/apiUtils';
import { CustomToast, showToast } from '../../../../components/toast/CustomToast';
import { useNavigation, useRoute } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import Screen from '../../../../design/components/Screen';
import Card from '../../../../design/components/Card';
import Button from '../../../../design/components/Button';
import TextField from '../../../../design/components/TextField';
import Icon from '../../../../design/Icon';
import { colors, spacing, radius, type } from '../../../../design/tokens';

/**
 * CreateLoan — admin loan creation rebuilt on the "Ink & Amber" design
 * system.
 *  - the same three sections (Loan / Business / Documents) rendered as
 *    Cards, with design TextFields, styled Pickers, the native date
 *    picker and a photo-attachment flow with preview grid + viewer modal
 *  - payload preserved exactly: every loanData key (Date → ISO string),
 *    the `documents` JSON list, one file part per document keyed by
 *    `fieldname`, plus `customerUid` → POST /api/admin/loan (multipart)
 *  - backend quirks kept verbatim: interestRate pre-filled "3.38",
 *    gracePeriod "0", disabled rate/grace inputs, "Goverment" option
 *    label/value, duration options 100–2200 days
 *  - icon names swapped to the verified custom SVG set
 */

const DURATION_OPTIONS = [
  { label: 'Select Loan Duration', value: '' },
  ...[100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200]
    .map((days) => ({ label: `${days} days`, value: `${days} days` })),
];

const FREQUENCY_OPTIONS = [
  { label: 'Select Frequency', value: '' },
  { label: 'Daily', value: 'Daily' },
  { label: 'Weekly', value: 'Weekly' },
  { label: 'Monthly', value: 'Monthly' },
];

const DOCUMENT_TYPES = [
  { label: 'Id Proof', value: 'Id Proof' },
  { label: 'Bank', value: 'Bank' },
  { label: 'Goverment', value: 'Goverment' },
  { label: 'Photo', value: 'Photo' },
  { label: 'Signature', value: 'Signature' },
  { label: 'Other', value: 'Other' },
];

const SectionLabel = ({ children }) => (
  <Text
    style={[
      type.caption,
      {
        color: colors.inkMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: spacing.sm,
      },
    ]}
  >
    {children}
  </Text>
);

const LabeledPicker = ({ label, icon, options, value, onValueChange, error }) => (
  <View style={{ marginBottom: spacing.md }}>
    <Text style={[type.caption, { color: colors.inkSecondary, marginBottom: 6 }]}>{label}</Text>
    <View style={styles.pickerWrap}>
      <Icon name={icon} size={20} color={colors.inkMuted} />
      <Picker
        selectedValue={value}
        onValueChange={(itemValue) => onValueChange(itemValue)}
        style={[styles.picker, value === '' && { color: colors.inkMuted }]}
      >
        {options.map((option) => (
          <Picker.Item key={option.value} label={option.label} value={option.value} />
        ))}
      </Picker>
      <Icon name="chevron-down" size={18} color={colors.inkMuted} />
    </View>
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

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
    setLoanData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prevErrors) => ({ ...prevErrors, [name]: null }));
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setLoanData((prev) => ({ ...prev, loanStartDate: selectedDate }));
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
        setDocuments((prev) => [...prev, newDocument]);
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
  };

  const handleCreateLoan = () => {
    Alert.alert('Confirm Loan Creation', 'Are you sure you want to create this loan?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK', onPress: () => createLoan() }
    ]);
  };

  const field = (name, label, placeholder, icon, props = {}) => (
    <TextField
      label={label}
      value={loanData[name]}
      onChangeText={(text) => handleInputChange(name, text)}
      placeholder={placeholder}
      leftIcon={icon}
      error={errors[name]}
      style={{ marginBottom: spacing.md }}
      {...props}
    />
  );

  return (
    <Screen scroll bg={colors.bg} keyboardAvoid keyboardShouldPersistTaps="handled">
      <View style={styles.page}>
        <SectionLabel>Loan Details</SectionLabel>
        <Card>
          <View style={styles.cardBody}>
            {field('loanNumber', 'Loan Number', 'Enter loan number', 'receipt', { keyboardType: 'numeric' })}

            <View style={styles.row}>
              <View style={styles.half}>
                {field('loanAmount', 'Loan Amount', 'Enter loan amount', 'currency-inr', {
                  keyboardType: 'numeric',
                  value: formatAmount(loanData.loanAmount),
                  onChangeText: (text) => handleInputChange('loanAmount', text.replace(/,/g, '')),
                  style: { marginBottom: 0 },
                })}
              </View>
              <View style={[styles.half, { marginLeft: spacing.sm }]}>
                {field('principalAmount', 'Principal Amount', 'Enter principal', 'cash', {
                  keyboardType: 'numeric',
                  value: formatAmount(loanData.principalAmount),
                  onChangeText: (text) => handleInputChange('principalAmount', text.replace(/,/g, '')),
                  style: { marginBottom: 0 },
                })}
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.half}>
                <LabeledPicker
                  label="Loan Duration"
                  icon="calendar-range"
                  options={DURATION_OPTIONS}
                  value={loanData.loanDuration}
                  onValueChange={(v) => handleInputChange('loanDuration', v)}
                  error={errors.loanDuration}
                />
              </View>
              <View style={[styles.half, { marginLeft: spacing.sm }]}>
                <LabeledPicker
                  label="Installment Frequency"
                  icon="calendar-clock"
                  options={FREQUENCY_OPTIONS}
                  value={loanData.installmentFrequency}
                  onValueChange={(v) => handleInputChange('installmentFrequency', v)}
                  error={errors.installmentFrequency}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.half}>
                {field('interestRate', 'Interest Rate (%)', 'Interest rate', 'percent', { disabled: true })}
              </View>
              <View style={[styles.half, { marginLeft: spacing.sm }]}>
                {field('gracePeriod', 'Grace Period (days)', 'Grace period', 'clock', { disabled: true })}
              </View>
            </View>

            <View>
              <Text style={[type.caption, { color: colors.inkSecondary, marginBottom: 6 }]}>Loan Start Date</Text>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={({ pressed }) => [styles.dateButton, pressed && { opacity: 0.85 }]}
              >
                <Icon name="calendar" size={20} color={colors.inkMuted} />
                <Text style={[type.body, { color: colors.ink, marginLeft: 8 }]}>
                  {loanData.loanStartDate.toDateString()}
                </Text>
                <Icon name="chevron-down" size={16} color={colors.inkMuted} style={{ marginLeft: 'auto' }} />
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={loanData.loanStartDate}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                />
              )}
            </View>
          </View>
        </Card>

        <SectionLabel>Business Details</SectionLabel>
        <Card>
          <View style={styles.cardBody}>
            {field('businessFirmName', 'Business Firm Name', 'Enter business firm name', 'briefcase')}
            {field('businessAddress', 'Business Address', 'Enter business address', 'map-marker', { multiline: true })}
            {field('businessPhone', 'Business Phone', 'Enter business phone', 'phone', { keyboardType: 'phone-pad' })}
            {field('businessEmail', 'Business Email', 'Enter business email', 'email', { keyboardType: 'email-address' })}
          </View>
        </Card>

        <SectionLabel>Document Upload</SectionLabel>
        <Card>
          <View style={styles.cardBody}>
            <TextField
              label="Document Name"
              value={newDocumentName}
              onChangeText={setNewDocumentName}
              placeholder="Enter document name"
              leftIcon="file"
            />
            <LabeledPicker
              label="Document Type"
              icon="clipboard"
              options={DOCUMENT_TYPES}
              value={newDocumentType}
              onValueChange={setNewDocumentType}
            />
            <Button
              label="Add Document"
              icon="upload"
              variant="accent"
              full
              onPress={handleDocumentUpload}
            />

            {documents.length > 0 && (
              <View style={styles.previewGrid}>
                {documents.map((doc, index) => (
                  <View key={index} style={styles.previewTile}>
                    <Pressable onPress={() => handleViewImage(doc.uri)}>
                      <Image source={{ uri: doc.uri }} style={styles.previewImage} />
                    </Pressable>
                    <Text numberOfLines={1} style={[type.micro, { color: colors.inkSecondary, marginTop: 4, textAlign: 'center' }]}>
                      {doc.documentName}
                    </Text>
                    <Pressable
                      style={styles.removeBadge}
                      onPress={() => handleRemoveDocument(index)}
                    >
                      <Icon name="close" size={12} color={colors.white} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            {errors.documents ? <Text style={styles.errorText}>{errors.documents}</Text> : null}
          </View>
        </Card>

        <View style={{ marginTop: spacing.lg }}>
          <Button
            label="Create Loan"
            icon="check-circle"
            variant="accent"
            size="lg"
            full
            loading={loading}
            onPress={handleCreateLoan}
          />
        </View>
      </View>

      <Modal visible={showImageModal} transparent onRequestClose={() => setShowImageModal(false)}>
        <View style={styles.modalContainer}>
          <Pressable
            style={styles.closeButton}
            onPress={() => setShowImageModal(false)}
          >
            <Icon name="close" size={24} color={colors.white} />
          </Pressable>
          <Image source={{ uri: selectedImage }} style={styles.modalImage} resizeMode="contain" />
        </View>
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
  cardBody: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  half: {
    flex: 1,
  },
  pickerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: spacing.sm,
  },
  picker: {
    flex: 1,
    height: 54,
    color: colors.ink,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md - 2,
  },
  errorText: {
    ...type.caption,
    color: colors.danger,
    marginTop: 4,
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  previewTile: {
    width: 84,
  },
  previewImage: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    backgroundColor: colors.inkFaint,
  },
  removeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.danger,
    borderRadius: radius.full,
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
    top: 48,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: radius.full,
    padding: spacing.sm,
    zIndex: 1,
  },
});

export default CreateLoan;
