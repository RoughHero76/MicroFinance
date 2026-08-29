import React, { useState } from 'react';
import {
    View,
    ScrollView,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Image,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { Picker } from '@react-native-picker/picker';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'react-native-linear-gradient';
import { apiCall } from "../../../components/api/apiUtils";
import { showToast } from "../../../components/toast/CustomToast";
import CustomToast from "../../../components/toast/CustomToast";
import { colors, spacing, radii, type, shadow } from "../../../theme/tokens";
import EviButton from "../../../components/ui/EviButton";
import EviCard from "../../../components/ui/EviCard";

const loanTypes = [
    'Personal Loan',
    'Home Loan',
    'Business Loan',
    'Education Loan',
    'Vehicle Loan',
    'Gold Loan',
    'Other',
];

const loanDurations = [
    '100 days',
    '200 days',
    '300 days',
    '400 days',
    '500 days',
    '600 days',
    '700 days',
    '800 days',
    '900 days',
    '1000 days',
    '1100 days',
    '1200 days',
    '1300 days',
    '1400 days',
    '1500 days',
    '1600 days',
    '1700 days',
    '1800 days',
    '1900 days',
    '2000 days',
    '2100 days',
    '2200 days'
];

const CreateLeadScreen = () => {
    const navigation = useNavigation();
    const { control, handleSubmit, formState: { errors }, reset } = useForm({
        defaultValues: {
            name: '',
            phone: '',
            email: '',
            address: '',
            city: '',
            state: '',
            loanType: loanTypes[0],
            loanAmount: '',
            loanDuration: loanDurations[0],
            loanPurpose: '',
        }
    });

    const [loading, setLoading] = useState(false);
    const [picture, setPicture] = useState(null);

    const pickImage = async (sourceType) => {
        const options = {
            mediaType: 'photo',
            quality: 0.7,
            maxWidth: 800,
            maxHeight: 800,
            includeBase64: false,
        };

        try {
            const result = sourceType === 'camera'
                ? await launchCamera(options)
                : await launchImageLibrary(options);

            if (result.didCancel) {
                return;
            }

            if (result.errorCode) {
                showToast('error', 'Error', result.errorMessage);
                return;
            }

            if (result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setPicture({
                    uri: Platform.OS === 'android' ? asset.uri : asset.uri.replace('file://', ''),
                    type: asset.type || 'image/jpeg',
                    name: asset.fileName || `image-${Date.now()}.jpg`,
                });
            }
        } catch (error) {
            console.error('Image picker error:', error);
            showToast('error', 'Error', 'Failed to pick image');
        }
    };

    const onSubmit = async (data) => {
        if (!picture) {
            showToast('error', 'Missing Field', 'Please upload applicant picture');
            return;
        }

        // Convert loan amount to number and validate
        const loanAmount = parseFloat(data.loanAmount);
        if (isNaN(loanAmount) || loanAmount <= 0) {
            showToast('error', 'Invalid Input', 'Please enter a valid loan amount');
            return;
        }

        setLoading(true);

        try {
            // Create form data properly
            const formData = new FormData();

            // Append all form fields with proper data types
            formData.append('name', data.name.trim());
            formData.append('phone', data.phone.trim());
            formData.append('email', data.email ? data.email.trim() : '');
            formData.append('address', data.address.trim());
            formData.append('city', data.city.trim());
            formData.append('state', data.state.trim());
            formData.append('loanType', data.loanType);
            formData.append('loanAmount', loanAmount.toString());
            formData.append('loanDuration', data.loanDuration);
            formData.append('loanPurpose', data.loanPurpose.trim());

            // Append the image with exact required format for multer
            formData.append('picture', {
                uri: picture.uri,
                type: picture.type,
                name: picture.name
            });
            const response = await apiCall('/api/employee/lead/create', 'POST', formData, true);

            if (response.error) {
                showToast('error', 'Error', response.message || 'Failed to create lead');
            } else {
                showToast('success', 'Success', 'Lead created successfully');
                // Reset form
                setPicture(null);
                reset();
                // Navigate back or to leads list
                navigation.goBack();
            }
        } catch (error) {
            console.error('Form submission error:', error);
            Alert.alert(
                'Error',
                'Failed to create lead. Please check your input and try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient
            colors={['#ffffff', colors.brandTint]}
            style={styles.container}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <View style={styles.header}>
                        <View style={styles.headerIcon}>
                            <Icon name="file-plus-outline" size={28} color={colors.brand} />
                        </View>
                        <Text style={styles.headerTitle}>Create Lead</Text>
                        <Text style={styles.headerSubtitle}>Add a potential loan applicant</Text>
                    </View>

                    <View style={styles.formContainer}>
                        {/* Profile Picture */}
                        <View style={styles.imageSection}>
                            <View style={styles.imagePicker}>
                                {picture ? (
                                    <Image source={{ uri: picture.uri }} style={styles.selectedImage} />
                                ) : (
                                    <Icon name="account-circle" size={80} color={colors.inkFaint} />
                                )}
                            </View>
                            <View style={styles.imageButtonsContainer}>
                                <TouchableOpacity
                                    style={styles.imageButton}
                                    onPress={() => pickImage('camera')}
                                >
                                    <Icon name="camera" size={18} color={colors.brand} />
                                    <Text style={styles.imageButtonText}>Camera</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.imageButton}
                                    onPress={() => pickImage('gallery')}
                                >
                                    <Icon name="image" size={18} color={colors.brand} />
                                    <Text style={styles.imageButtonText}>Gallery</Text>
                                </TouchableOpacity>
                            </View>
                            {!picture && (
                                <Text style={styles.requiredFieldText}>*Profile picture is required</Text>
                            )}
                        </View>

                        {/* Personal Information */}
                        <EviCard elevated={false} style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>Personal Information</Text>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Full Name *</Text>
                                <Controller
                                    control={control}
                                    rules={{
                                        required: "Name is required",
                                        minLength: { value: 3, message: "Name must be at least 3 characters" }
                                    }}
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <TextInput
                                            style={[styles.input, errors.name && styles.errorInput]}
                                            placeholder="Enter full name"
                                            placeholderTextColor={colors.inkFaint}
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value}
                                        />
                                    )}
                                    name="name"
                                />
                                {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Phone Number *</Text>
                                <Controller
                                    control={control}
                                    rules={{
                                        required: "Phone number is required",
                                        pattern: { value: /^[0-9]{10}$/, message: "Enter a valid 10-digit phone number" }
                                    }}
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <TextInput
                                            style={[styles.input, errors.phone && styles.errorInput]}
                                            placeholder="Enter 10-digit phone number"
                                            placeholderTextColor={colors.inkFaint}
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value}
                                            keyboardType="phone-pad"
                                            maxLength={10}
                                        />
                                    )}
                                    name="phone"
                                />
                                {errors.phone && <Text style={styles.errorText}>{errors.phone.message}</Text>}
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Email Address</Text>
                                <Controller
                                    control={control}
                                    rules={{
                                        pattern: {
                                            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                            message: "Enter a valid email address or leave empty"
                                        }
                                    }}
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <TextInput
                                            style={[styles.input, errors.email && styles.errorInput]}
                                            placeholder="Enter email address (optional)"
                                            placeholderTextColor={colors.inkFaint}
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                        />
                                    )}
                                    name="email"
                                />
                                {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
                            </View>
                        </EviCard>

                        {/* Address Information */}
                        <EviCard elevated={false} style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>Address Information</Text>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Address *</Text>
                                <Controller
                                    control={control}
                                    rules={{
                                        required: "Address is required",
                                        minLength: { value: 5, message: "Address must be at least 5 characters" }
                                    }}
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <TextInput
                                            style={[styles.input, errors.address && styles.errorInput]}
                                            placeholder="Enter street address"
                                            placeholderTextColor={colors.inkFaint}
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value}
                                        />
                                    )}
                                    name="address"
                                />
                                {errors.address && <Text style={styles.errorText}>{errors.address.message}</Text>}
                            </View>

                            <View style={styles.rowContainer}>
                                <View style={[styles.inputContainer, { flex: 1, marginRight: spacing.xs }]}>
                                    <Text style={styles.label}>City *</Text>
                                    <Controller
                                        control={control}
                                        rules={{
                                            required: "City is required"
                                        }}
                                        render={({ field: { onChange, onBlur, value } }) => (
                                            <TextInput
                                                style={[styles.input, errors.city && styles.errorInput]}
                                                placeholder="Enter city"
                                                placeholderTextColor={colors.inkFaint}
                                                onBlur={onBlur}
                                                onChangeText={onChange}
                                                value={value}
                                            />
                                        )}
                                        name="city"
                                    />
                                    {errors.city && <Text style={styles.errorText}>{errors.city.message}</Text>}
                                </View>

                                <View style={[styles.inputContainer, { flex: 1, marginLeft: spacing.xs }]}>
                                    <Text style={styles.label}>State *</Text>
                                    <Controller
                                        control={control}
                                        rules={{
                                            required: "State is required"
                                        }}
                                        render={({ field: { onChange, onBlur, value } }) => (
                                            <TextInput
                                                style={[styles.input, errors.state && styles.errorInput]}
                                                placeholder="Enter state"
                                                placeholderTextColor={colors.inkFaint}
                                                onBlur={onBlur}
                                                onChangeText={onChange}
                                                value={value}
                                            />
                                        )}
                                        name="state"
                                    />
                                    {errors.state && <Text style={styles.errorText}>{errors.state.message}</Text>}
                                </View>
                            </View>
                        </EviCard>

                        {/* Loan Information */}
                        <EviCard elevated={false} style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>Loan Details</Text>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Loan Type *</Text>
                                <View style={styles.pickerContainer}>
                                    <Controller
                                        control={control}
                                        rules={{ required: true }}
                                        render={({ field: { onChange, value } }) => (
                                            <Picker
                                                selectedValue={value}
                                                onValueChange={onChange}
                                                style={styles.picker}
                                            >
                                                {loanTypes.map((type, index) => (
                                                    <Picker.Item key={index} label={type} value={type} />
                                                ))}
                                            </Picker>
                                        )}
                                        name="loanType"
                                    />
                                </View>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Loan Amount (₹) *</Text>
                                <Controller
                                    control={control}
                                    rules={{
                                        required: "Loan amount is required",
                                        pattern: {
                                            value: /^[0-9]+(\.[0-9]{1,2})?$/,
                                            message: "Enter a valid amount (numbers only)"
                                        },
                                        validate: value => parseFloat(value) > 0 || "Amount must be greater than zero"
                                    }}
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <TextInput
                                            style={[styles.input, errors.loanAmount && styles.errorInput]}
                                            placeholder="Enter loan amount"
                                            placeholderTextColor={colors.inkFaint}
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value}
                                            keyboardType="numeric"
                                        />
                                    )}
                                    name="loanAmount"
                                />
                                {errors.loanAmount && <Text style={styles.errorText}>{errors.loanAmount.message}</Text>}
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Loan Duration *</Text>
                                <View style={styles.pickerContainer}>
                                    <Controller
                                        control={control}
                                        rules={{ required: true }}
                                        render={({ field: { onChange, value } }) => (
                                            <Picker
                                                selectedValue={value}
                                                onValueChange={onChange}
                                                style={styles.picker}
                                            >
                                                {loanDurations.map((duration, index) => (
                                                    <Picker.Item key={index} label={duration} value={duration} />
                                                ))}
                                            </Picker>
                                        )}
                                        name="loanDuration"
                                    />
                                </View>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Loan Purpose *</Text>
                                <Controller
                                    control={control}
                                    rules={{
                                        required: "Loan purpose is required",
                                        minLength: { value: 10, message: "Please provide a detailed purpose (min 10 characters)" }
                                    }}
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <TextInput
                                            style={[styles.input, errors.loanPurpose && styles.errorInput, styles.textArea]}
                                            placeholder="Describe loan purpose"
                                            placeholderTextColor={colors.inkFaint}
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value}
                                            multiline={true}
                                            numberOfLines={3}
                                            textAlignVertical="top"
                                        />
                                    )}
                                    name="loanPurpose"
                                />
                                {errors.loanPurpose && <Text style={styles.errorText}>{errors.loanPurpose.message}</Text>}
                            </View>
                        </EviCard>

                        {/* Submit Button */}
                        <EviButton
                            title="Create Lead"
                            variant="primary"
                            size="lg"
                            fullWidth
                            icon="check-circle"
                            loading={loading}
                            style={styles.submitButton}
                            onPress={handleSubmit(onSubmit)}
                        />
                        <View style={{ height: spacing.xxl }} />
                    </View>
                </ScrollView>
                <CustomToast />
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xl,
        paddingBottom: spacing.md,
    },
    headerIcon: {
        width: 56,
        height: 56,
        borderRadius: radii.xl,
        backgroundColor: colors.brandTint,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    headerTitle: {
        fontSize: type.sizes.xxl,
        fontWeight: type.weights.bold,
        color: colors.ink,
        marginBottom: spacing.xs,
    },
    headerSubtitle: {
        fontSize: type.sizes.sm,
        color: colors.inkSoft,
    },
    formContainer: {
        padding: spacing.lg,
    },
    imageSection: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    imagePicker: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: colors.line,
    },
    selectedImage: {
        width: '100%',
        height: '100%',
    },
    imageButtonsContainer: {
        flexDirection: 'row',
        marginTop: spacing.md,
    },
    imageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.brandTint,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radii.pill,
        marginHorizontal: spacing.xs,
    },
    imageButtonText: {
        color: colors.brand,
        marginLeft: spacing.xs,
        fontWeight: type.weights.medium,
        fontSize: type.sizes.sm,
    },
    requiredFieldText: {
        color: colors.danger,
        fontSize: type.sizes.xs,
        marginTop: spacing.sm,
    },
    sectionCard: {
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        fontSize: type.sizes.lg,
        fontWeight: type.weights.bold,
        color: colors.ink,
        marginBottom: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
        paddingBottom: spacing.sm,
    },
    inputContainer: {
        marginBottom: spacing.lg,
    },
    rowContainer: {
        flexDirection: 'row',
    },
    label: {
        fontSize: type.sizes.sm,
        color: colors.inkSoft,
        marginBottom: spacing.xs,
        fontWeight: type.weights.medium,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radii.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: 10,
        fontSize: type.sizes.md,
        backgroundColor: colors.surface,
        color: colors.ink,
    },
    textArea: {
        minHeight: 96,
        paddingTop: spacing.sm,
    },
    errorInput: {
        borderColor: colors.danger,
    },
    errorText: {
        color: colors.danger,
        fontSize: type.sizes.xs,
        marginTop: spacing.xs,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radii.sm,
        overflow: 'hidden',
        backgroundColor: colors.surface,
    },
    picker: {
        flex: 1,
        height: 48,
        color: colors.ink,
    },
    submitButton: {
        marginTop: spacing.xs,
    },
});

export default CreateLeadScreen;
