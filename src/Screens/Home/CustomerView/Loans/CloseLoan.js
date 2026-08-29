import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { apiCall } from '../../../../components/api/apiUtils';
import { showToast, CustomToast } from '../../../../components/toast/CustomToast';
import { currencyFormatter } from '../../../../components/utils/formatters';
import { colors, spacing, type, radii, shadow } from '../../../../theme/tokens';
import EviButton from '../../../../components/ui/EviButton';

const CloseLoan = ({ route, navigation }) => {
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Initialize form with more specific validation triggers
  const { control, handleSubmit, formState: { errors }, watch, setValue, trigger } = useForm({
    mode: 'onChange',
    defaultValues: {
      totalAmountPaying: '',
      forgiveLoan: false,
      forgivePenalties: false,
      deleteLoanDocuments: false,
    }
  });

  const { loanId } = route.params || {};
  const fadeAnim = useState(new Animated.Value(0))[0];
  const modalAnim = useState(new Animated.Value(0))[0];

  // Watch form values for validation and calculations
  const amountPaying = watch('totalAmountPaying', '0');
  const forgiveLoan = watch('forgiveLoan', false);
  const forgivePenalties = watch('forgivePenalties', false);

  useEffect(() => {
    fetchLoanDetails();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Adjust payment validation based on loan data and forgiveness options
  useEffect(() => {
    if (loan) {
      // When loan data is available, set initial amount if not already set
      if (!amountPaying && !forgiveLoan) {
        setValue('totalAmountPaying', loan.outstandingAmount.toString(), { shouldValidate: true });
      }

      // Always trigger validation when forgiveLoan changes or when loan data loads
      trigger('totalAmountPaying');
    }
  }, [loan, forgiveLoan]);

  // Re-validate whenever amount changes
  useEffect(() => {
    if (loan) {
      trigger('totalAmountPaying');
    }
  }, [amountPaying]);

  const fetchLoanDetails = async () => {
    try {
      setLoading(true);
      const response = await apiCall(`/api/admin/loan?loanId=${loanId}`);
      if (response.status === 'success' && response.data?.[0]) {
        setLoan(response.data[0]);
      } else {
        showToast('error', response.message || 'Failed to fetch loan details');
      }
    } catch (error) {
      showToast('error', 'Failed to fetch loan details');
    } finally {
      setLoading(false);
    }
  };

  const showConfirmationModal = () => {
    // Validate before showing confirmation
    if (!validateForm()) return;

    setModalVisible(true);
    Animated.spring(modalAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const hideConfirmationModal = () => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setModalVisible(false));
  };

  const validateForm = () => {
    if (!loan) {
      showToast('error', 'Loan data not available');
      return false;
    }

    const paymentAmount = parseFloat(amountPaying || 0);
    const maxAmount = loan.outstandingAmount + loan.totalPenaltyAmount;

    // Validate payment amount
    if (isNaN(paymentAmount) || paymentAmount < 0) {
      Alert.alert(
        "Invalid Payment",
        "Please enter a valid payment amount."
      );
      return false;
    }

    // If loan forgiveness is not enabled, ensure payment covers outstanding amount
    if (!forgiveLoan && paymentAmount < loan.outstandingAmount) {
      Alert.alert(
        "Invalid Payment",
        `When not forgiving the loan, payment amount must be at least ${currencyFormatter.format(loan.outstandingAmount)}.`
      );
      return false;
    }

    // Prevent overpayment
    if (paymentAmount > maxAmount) {
      Alert.alert(
        "Invalid Payment",
        `Payment amount cannot exceed the total due amount of ${currencyFormatter.format(maxAmount)}.`
      );
      return false;
    }

    return true;
  };

  const onSubmit = async (data) => {
    // Final validation before submission
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const response = await apiCall('/api/admin/loan/close', 'POST', {
        loanId,
        totalRemainingAmountCustomerIsPaying: parseFloat(data.totalAmountPaying || 0),
        deleteLoanDocuments: data.deleteLoanDocuments,
        forgiveLoan: data.forgiveLoan,
        forgivePenalties: data.forgivePenalties,
      });

      if (response.status !== 200) {
        showToast('error', response.message || 'Unknown error');
        return;
      }
      showToast('success', 'Loan closed successfully');
      //Wait for 2 seconds before navigating back
      setTimeout(() => {
        navigation.goBack();
      }, 1000);

    } catch (error) {
      showToast('error', error.message || 'Failed to close loan');
    } finally {
      setSubmitting(false);
      hideConfirmationModal();
    }
  };

  const calculateRemainingBalance = () => {
    if (!loan || !amountPaying) return loan?.outstandingAmount || 0;

    const paymentAmount = parseFloat(amountPaying || 0);
    const outstandingAmount = loan.outstandingAmount;

    // If forgiveLoan is true, remaining balance can be 0 regardless of payment
    if (forgiveLoan) {
      return 0;
    }

    return Math.max(0, outstandingAmount - paymentAmount);
  };

  const calculateRemainingPenalties = () => {
    if (!loan || !amountPaying) return loan?.totalPenaltyAmount || 0;

    const paymentAmount = parseFloat(amountPaying || 0);
    const outstandingAmount = loan.outstandingAmount;
    const totalPenaltyAmount = loan.totalPenaltyAmount;

    // If forgivePenalties is true, remaining penalties are 0
    if (forgivePenalties) {
      return 0;
    }

    // Calculate how much of the payment goes to penalties
    // First, cover the outstanding amount
    const amountForPenalties = Math.max(0, paymentAmount - outstandingAmount);

    // Then apply the rest to penalties
    return Math.max(0, totalPenaltyAmount - amountForPenalties);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Loan Details Card */}
        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
          <View style={styles.header}>
            <View style={styles.headerIconRing}>
              <Icon name="bank" size={20} color={colors.brand} />
            </View>
            <Text style={styles.headerText}>Loan Summary</Text>
          </View>

          <View style={styles.details}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Loan Amount:</Text>
              <Text style={styles.detailValue}>{currencyFormatter.format(loan.loanAmount)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Outstanding Principal:</Text>
              <Text style={styles.detailValue}>{currencyFormatter.format(loan.outstandingAmount)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Paid:</Text>
              <Text style={styles.detailValue}>{currencyFormatter.format(loan.totalPaid)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Penalties:</Text>
              <Text style={styles.detailValue}>{currencyFormatter.format(loan.totalPenaltyAmount)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.totalLabel}>Total Outstanding:</Text>
              <Text style={styles.totalValue}>
                {currencyFormatter.format(loan.outstandingAmount + loan.totalPenaltyAmount)}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Payment Options Card */}
        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
          <View style={styles.header}>
            <View style={styles.headerIconRing}>
              <Icon name="cash-multiple" size={20} color={colors.brand} />
            </View>
            <Text style={styles.headerText}>Payment Options</Text>
          </View>

          {/* Amount Input */}
          <Text style={styles.inputLabel}>Amount Paying</Text>
          <Controller
            control={control}
            render={({ field: { onChange, onBlur, value } }) => {
              const maxAmount = loan ? loan.outstandingAmount + loan.totalPenaltyAmount : 0;
              const minAmount = forgiveLoan ? 0 : loan.outstandingAmount;

              return (
                <View style={styles.inputContainer}>
                  <View style={styles.currencyInputContainer}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <TextInput
                      style={[
                        styles.input,
                        errors.totalAmountPaying && styles.inputError
                      ]}
                      onBlur={() => {
                        onBlur();
                        trigger('totalAmountPaying');
                      }}
                      onChangeText={(text) => {
                        onChange(text);
                        // Force validation on every change
                        setTimeout(() => trigger('totalAmountPaying'), 100);
                      }}
                      value={value}
                      placeholder="0.00"
                      placeholderTextColor={colors.inkFaint}
                      keyboardType="numeric"
                    />
                  </View>

                  {errors.totalAmountPaying && (
                    <Text style={styles.errorText}>
                      {forgiveLoan
                        ? `Amount must be between 0 and ${currencyFormatter.format(maxAmount)}`
                        : `Amount must be at least ${currencyFormatter.format(minAmount)} and at most ${currencyFormatter.format(maxAmount)}`}
                    </Text>
                  )}
                </View>
              );
            }}
            name="totalAmountPaying"
            rules={{
              required: "Payment amount is required",
              validate: (value) => {
                if (!loan) return true; // Skip validation if loan data isn't loaded yet

                const numValue = parseFloat(value || 0);
                const maxAmount = loan.outstandingAmount + loan.totalPenaltyAmount;

                if (isNaN(numValue)) return "Please enter a valid number";
                if (numValue < 0) return "Amount cannot be negative";
                if (numValue > maxAmount) return `Amount cannot exceed ${currencyFormatter.format(maxAmount)}`;

                // This is the key validation rule that was missing
                if (!forgiveLoan && numValue < loan.outstandingAmount) {
                  return `When not forgiving the loan, amount must be at least ${currencyFormatter.format(loan.outstandingAmount)}`;
                }

                return true;
              }
            }}
          />

          {/* Forgiveness Options */}
          <View style={styles.optionsContainer}>
            <Text style={styles.sectionTitle}>Forgiveness Options</Text>

            <Controller
              control={control}
              render={({ field: { onChange, value } }) => (
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => {
                    onChange(!value);
                    // When toggling forgiveness, re-validate the amount
                    setTimeout(() => trigger('totalAmountPaying'), 100);
                  }}
                >
                  <View style={[styles.checkbox, value && styles.checkboxChecked]}>
                    {value && <Icon name="check" size={16} color="#fff" />}
                  </View>
                  <View style={styles.checkboxTextContainer}>
                    <Text style={styles.checkboxLabel}>Forgive Loan</Text>
                    <Text style={styles.checkboxHint}>
                      Allow closing with partial or no payment of principal
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              name="forgiveLoan"
            />

            <Controller
              control={control}
              render={({ field: { onChange, value } }) => (
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => onChange(!value)}
                >
                  <View style={[styles.checkbox, value && styles.checkboxChecked]}>
                    {value && <Icon name="check" size={16} color="#fff" />}
                  </View>
                  <View style={styles.checkboxTextContainer}>
                    <Text style={styles.checkboxLabel}>Forgive Penalties</Text>
                    <Text style={styles.checkboxHint}>
                      Waive all pending penalties
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              name="forgivePenalties"
            />
          </View>

          {/* Document Options */}
          <View style={styles.optionsContainer}>
            <Text style={styles.sectionTitle}>Document Options</Text>

            <Controller
              control={control}
              render={({ field: { onChange, value } }) => (
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => onChange(!value)}
                >
                  <View style={[styles.checkbox, value && styles.checkboxChecked]}>
                    {value && <Icon name="check" size={16} color="#fff" />}
                  </View>
                  <View style={styles.checkboxTextContainer}>
                    <Text style={styles.checkboxLabel}>Delete Loan Documents</Text>
                    <Text style={styles.checkboxHint}>
                      Remove all documents associated with this loan
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              name="deleteLoanDocuments"
            />
          </View>
        </Animated.View>

        {/* Payment Summary Card */}
        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
          <View style={styles.header}>
            <View style={styles.headerIconRing}>
              <Icon name="calculator" size={20} color={colors.brand} />
            </View>
            <Text style={styles.headerText}>Payment Summary</Text>
          </View>

          <View style={styles.details}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Amount:</Text>
              <Text style={styles.detailValue}>
                {currencyFormatter.format(parseFloat(amountPaying || 0))}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Forgive Principal:</Text>
              <Text style={[styles.detailValue, forgiveLoan ? styles.highlightText : null]}>
                {forgiveLoan ? 'Yes' : 'No'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Forgive Penalties:</Text>
              <Text style={[styles.detailValue, forgivePenalties ? styles.highlightText : null]}>
                {forgivePenalties ? 'Yes' : 'No'}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Remaining Principal:</Text>
              <Text style={[
                styles.detailValue,
                calculateRemainingBalance() > 0 ? styles.warningText : null
              ]}>
                {currencyFormatter.format(calculateRemainingBalance())}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Remaining Penalties:</Text>
              <Text style={[
                styles.detailValue,
                calculateRemainingPenalties() > 0 ? styles.warningText : null
              ]}>
                {currencyFormatter.format(calculateRemainingPenalties())}
              </Text>
            </View>
          </View>
        </Animated.View>

        <EviButton
          title="Close Loan"
          onPress={handleSubmit(showConfirmationModal)}
          disabled={submitting || Object.keys(errors).length > 0}
          icon="check-circle"
          variant="primary"
          size="lg"
          style={styles.closeLoanButton}
        />
      </ScrollView>

      {modalVisible && (
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [
                  { scale: modalAnim },
                  { translateY: modalAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) },
                ],
              },
            ]}
          >
            <Text style={styles.modalTitle}>Confirm Loan Closure</Text>
            <View style={styles.modalContent}>
              <Text style={styles.modalMessage}>
                Are you sure you want to close this loan with the following settings?
              </Text>

              <View style={styles.modalDivider} />

              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Payment Amount:</Text>
                <Text style={styles.modalDetailValue}>
                  {currencyFormatter.format(parseFloat(amountPaying || 0))}
                </Text>
              </View>

              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Outstanding Amount:</Text>
                <Text style={styles.modalDetailValue}>
                  {currencyFormatter.format(loan.outstandingAmount)}
                </Text>
              </View>

              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Penalties:</Text>
                <Text style={styles.modalDetailValue}>
                  {currencyFormatter.format(loan.totalPenaltyAmount)}
                </Text>
              </View>

              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Forgive Principal:</Text>
                <Text style={styles.modalDetailValue}>
                  {forgiveLoan ? 'Yes' : 'No'}
                </Text>
              </View>

              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Forgive Penalties:</Text>
                <Text style={styles.modalDetailValue}>
                  {forgivePenalties ? 'Yes' : 'No'}
                </Text>
              </View>

              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Delete Documents:</Text>
                <Text style={styles.modalDetailValue}>
                  {watch('deleteLoanDocuments') ? 'Yes' : 'No'}
                </Text>
              </View>

              <View style={styles.modalDivider} />

              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Remaining Balance:</Text>
                <Text style={[
                  styles.modalDetailValue,
                  calculateRemainingBalance() > 0 && !forgiveLoan ? styles.warningText : null
                ]}>
                  {currencyFormatter.format(calculateRemainingBalance())}
                </Text>
              </View>

              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Remaining Penalties:</Text>
                <Text style={[
                  styles.modalDetailValue,
                  calculateRemainingPenalties() > 0 && !forgivePenalties ? styles.warningText : null
                ]}>
                  {currencyFormatter.format(calculateRemainingPenalties())}
                </Text>
              </View>

              {calculateRemainingBalance() > 0 && !forgiveLoan && (
                <Text style={styles.modalWarning}>
                  Warning: There will be remaining principal without loan forgiveness!
                </Text>
              )}

              {calculateRemainingPenalties() > 0 && !forgivePenalties && (
                <Text style={styles.modalWarning}>
                  Warning: There will be remaining penalties without penalty forgiveness!
                </Text>
              )}
            </View>

            <View style={styles.modalButtons}>
              <EviButton
                title="Cancel"
                onPress={hideConfirmationModal}
                disabled={submitting}
                variant="secondary"
                size="lg"
                style={styles.modalButton}
              />
              <EviButton
                title="Confirm"
                onPress={handleSubmit(onSubmit)}
                loading={submitting}
                disabled={submitting}
                variant="primary"
                size="lg"
                style={styles.modalButton}
              />
            </View>
          </Animated.View>
        </View>
      )}
      <CustomToast />

    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerIconRing: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    backgroundColor: colors.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  headerText: {
    fontSize: type.sizes.lg,
    fontWeight: type.weights.bold,
    color: colors.ink,
  },
  details: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  detailLabel: {
    fontSize: type.sizes.md,
    color: colors.inkSoft,
  },
  detailValue: {
    fontSize: type.sizes.md,
    color: colors.ink,
    fontWeight: type.weights.medium,
    textAlign: 'right',
  },
  totalLabel: {
    fontSize: type.sizes.lg,
    color: colors.ink,
    fontWeight: type.weights.semibold,
  },
  totalValue: {
    fontSize: type.sizes.lg,
    color: colors.brand,
    fontWeight: type.weights.bold,
  },
  highlightText: {
    color: colors.success,
    fontWeight: type.weights.bold,
  },
  warningText: {
    color: colors.warning,
    fontWeight: type.weights.bold,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: spacing.md,
  },
  inputLabel: {
    fontSize: type.sizes.md,
    fontWeight: type.weights.medium,
    color: colors.inkSoft,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  currencyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  currencySymbol: {
    fontSize: type.sizes.lg,
    color: colors.inkSoft,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
  },
  input: {
    flex: 1,
    padding: spacing.md,
    fontSize: type.sizes.lg,
    color: colors.ink,
    backgroundColor: 'transparent',
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: type.sizes.sm,
    marginTop: spacing.xs,
  },
  optionsContainer: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: type.sizes.lg,
    fontWeight: type.weights.semibold,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  checkboxTextContainer: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: type.sizes.lg,
    color: colors.ink,
    fontWeight: type.weights.medium,
  },
  checkboxHint: {
    fontSize: type.sizes.sm,
    color: colors.inkSoft,
    marginTop: 2,
  },
  closeLoanButton: {
    marginTop: spacing.lg,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 31, 22, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing.xl,
    width: '92%',
    maxWidth: 400,
    ...shadow.card,
  },
  modalTitle: {
    fontSize: type.sizes.xl,
    fontWeight: type.weights.bold,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalContent: {
    marginBottom: spacing.xl,
  },
  modalMessage: {
    fontSize: type.sizes.md,
    color: colors.inkSoft,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  modalDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: spacing.md,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  modalDetailLabel: {
    fontSize: type.sizes.md,
    color: colors.inkSoft,
  },
  modalDetailValue: {
    fontSize: type.sizes.md,
    color: colors.ink,
    fontWeight: type.weights.medium,
    textAlign: 'right',
  },
  modalWarning: {
    color: colors.danger,
    fontSize: type.sizes.sm,
    fontWeight: type.weights.medium,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
});

export default CloseLoan;
