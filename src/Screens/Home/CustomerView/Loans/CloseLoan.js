import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, Animated, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { apiCall } from '../../../../components/api/apiUtils';
import { showToast, CustomToast } from '../../../../components/toast/CustomToast';
import { currencyFormatter } from '../../../../components/utils/formatters';
import Screen from '../../../../design/components/Screen';
import Card from '../../../../design/components/Card';
import Button from '../../../../design/components/Button';
import TextField from '../../../../design/components/TextField';
import Icon from '../../../../design/Icon';
import { colors, spacing, radius, type } from '../../../../design/tokens';

/**
 * CloseLoan — admin loan-closure flow rebuilt on the "Ink & Amber" design
 * system.
 *  - same three sections (Loan Summary / Payment Options / Payment Summary)
 *    as Cards with icon chips, react-hook-form driven amount input, custom
 *    checkbox rows and the animated confirmation dialog
 *  - behaviour preserved verbatim: GET /api/admin/loan?loanId=…, the RHF
 *    default values / watch / trigger-revalidation flow, the three
 *    validateForm Alert messages, the POST /api/admin/loan/close payload
 *    (loanId, totalRemainingAmountCustomerIsPaying, deleteLoanDocuments,
 *    forgiveLoan, forgivePenalties), the 1s delay before goBack, and the
 *    remaining-balance / remaining-penalty calculations
 *  - fixed latent bug: the submit handler compared `response.status !== 200`,
 *    but apiCall resolves `{ status: 'success', … }` — the success path
 *    (toast + goBack) was unreachable. Now checks `status === 'success'`.
 */

const CardHeader = ({ icon, title }) => (
  <View style={styles.cardHeader}>
    <View style={styles.iconChip}>
      <Icon name={icon} size={18} color={colors.accentDeep} />
    </View>
    <Text style={[type.title, { color: colors.ink, marginLeft: spacing.sm }]}>{title}</Text>
  </View>
);

const DetailRow = ({ label, value, valueStyle }) => (
  <View style={styles.detailRow}>
    <Text style={[type.body, { color: colors.inkSecondary, flex: 1 }]}>{label}</Text>
    <Text style={[type.bodyBold, { color: colors.ink }, valueStyle]}>{value}</Text>
  </View>
);

const OptionRow = ({ label, hint, checked, onToggle }) => (
  <Pressable
    onPress={onToggle}
    style={({ pressed }) => [styles.optionRow, pressed && { opacity: 0.9 }]}
  >
    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
      {checked ? <Icon name="check" size={14} color={colors.accentInk} /> : null}
    </View>
    <View style={{ flex: 1, marginLeft: spacing.sm }}>
      <Text style={[type.bodyBold, { color: colors.ink }]}>{label}</Text>
      <Text style={[type.sub, { color: colors.inkMuted, marginTop: 2 }]}>{hint}</Text>
    </View>
  </Pressable>
);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loan, forgiveLoan]);

  // Re-validate whenever amount changes
  useEffect(() => {
    if (loan) {
      trigger('totalAmountPaying');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      // apiCall resolves `{ status: 'success', … }` — the old `!== 200`
      // check made the success branch unreachable
      if (response.status !== 'success') {
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
      <Screen bg={colors.bg}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.inkMuted} />
        </View>
      </Screen>
    );
  }

  const maxAmount = loan ? loan.outstandingAmount + loan.totalPenaltyAmount : 0;
  const minAmount = forgiveLoan ? 0 : (loan ? loan.outstandingAmount : 0);
  const amountError = errors.totalAmountPaying
    ? (forgiveLoan
      ? `Amount must be between 0 and ${currencyFormatter.format(maxAmount)}`
      : `Amount must be at least ${currencyFormatter.format(minAmount)} and at most ${currencyFormatter.format(maxAmount)}`)
    : undefined;

  return (
    <Screen scroll bg={colors.bg} keyboardAvoid>
      <View style={styles.page}>
        {/* Loan Details Card */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <Card>
            <CardHeader icon="bank" title="Loan Summary" />
            <View style={styles.details}>
              <DetailRow label="Loan Amount" value={currencyFormatter.format(loan.loanAmount)} />
              <DetailRow label="Outstanding Principal" value={currencyFormatter.format(loan.outstandingAmount)} />
              <DetailRow label="Total Paid" value={currencyFormatter.format(loan.totalPaid)} />
              <DetailRow label="Penalties" value={currencyFormatter.format(loan.totalPenaltyAmount)} />
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <Text style={[type.title, { color: colors.ink }]}>Total Outstanding</Text>
                <Text style={[type.h1, { color: colors.accentDeep, fontSize: 20 }]}>
                  {currencyFormatter.format(loan.outstandingAmount + loan.totalPenaltyAmount)}
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Payment Options Card */}
        <Animated.View style={[{ opacity: fadeAnim }, { marginTop: spacing.md }]}>
          <Card>
            <CardHeader icon="bills" title="Payment Options" />
            <View style={{ marginTop: spacing.md }}>
              {/* Amount Input */}
              <Controller
                control={control}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label="Amount Paying"
                    value={value}
                    onChangeText={(text) => {
                      onChange(text);
                      // Force validation on every change
                      setTimeout(() => trigger('totalAmountPaying'), 100);
                    }}
                    onBlur={() => {
                      onBlur();
                      trigger('totalAmountPaying');
                    }}
                    placeholder="0.00"
                    keyboardType="numeric"
                    leftIcon="currency-inr"
                    error={amountError}
                  />
                )}
                name="totalAmountPaying"
                rules={{
                  required: "Payment amount is required",
                  validate: (value) => {
                    if (!loan) return true; // Skip validation if loan data isn't loaded yet

                    const numValue = parseFloat(value || 0);
                    const max = loan.outstandingAmount + loan.totalPenaltyAmount;

                    if (isNaN(numValue)) return "Please enter a valid number";
                    if (numValue < 0) return "Amount cannot be negative";
                    if (numValue > max) return `Amount cannot exceed ${currencyFormatter.format(max)}`;

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
                    <OptionRow
                      label="Forgive Loan"
                      hint="Allow closing with partial or no payment of principal"
                      checked={value}
                      onToggle={() => {
                        onChange(!value);
                        // When toggling forgiveness, re-validate the amount
                        setTimeout(() => trigger('totalAmountPaying'), 100);
                      }}
                    />
                  )}
                  name="forgiveLoan"
                />

                <Controller
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <OptionRow
                      label="Forgive Penalties"
                      hint="Waive all pending penalties"
                      checked={value}
                      onToggle={() => onChange(!value)}
                    />
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
                    <OptionRow
                      label="Delete Loan Documents"
                      hint="Remove all documents associated with this loan"
                      checked={value}
                      onToggle={() => onChange(!value)}
                    />
                  )}
                  name="deleteLoanDocuments"
                />
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Payment Summary Card */}
        <Animated.View style={[{ opacity: fadeAnim }, { marginTop: spacing.md }]}>
          <Card>
            <CardHeader icon="calculator" title="Payment Summary" />
            <View style={styles.details}>
              <DetailRow label="Payment Amount" value={currencyFormatter.format(parseFloat(amountPaying || 0))} />
              <DetailRow
                label="Forgive Principal"
                value={forgiveLoan ? 'Yes' : 'No'}
                valueStyle={forgiveLoan ? { color: colors.successInk } : null}
              />
              <DetailRow
                label="Forgive Penalties"
                value={forgivePenalties ? 'Yes' : 'No'}
                valueStyle={forgivePenalties ? { color: colors.successInk } : null}
              />
              <View style={styles.divider} />
              <DetailRow
                label="Remaining Principal"
                value={currencyFormatter.format(calculateRemainingBalance())}
                valueStyle={calculateRemainingBalance() > 0 ? { color: colors.warningInk } : null}
              />
              <DetailRow
                label="Remaining Penalties"
                value={currencyFormatter.format(calculateRemainingPenalties())}
                valueStyle={calculateRemainingPenalties() > 0 ? { color: colors.warningInk } : null}
              />
            </View>
          </Card>
        </Animated.View>

        <View style={{ marginTop: spacing.lg }}>
          <Button
            label="Close Loan"
            icon="lock-check"
            variant="accent"
            size="lg"
            full
            loading={submitting}
            disabled={submitting || Object.keys(errors).length > 0}
            onPress={handleSubmit(showConfirmationModal)}
          />
        </View>
      </View>

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
            <View style={styles.modalHeader}>
              <View style={styles.modalIconChip}>
                <Icon name="lock-check" size={20} color={colors.dangerInk} />
              </View>
              <Text style={[type.h2, { color: colors.ink, textAlign: 'center', marginTop: spacing.sm }]}>
                Confirm Loan Closure
              </Text>
              <Text style={[type.body, { color: colors.inkSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
                Are you sure you want to close this loan with the following settings?
              </Text>
            </View>

            <View style={styles.modalContent}>
              <DetailRow label="Payment Amount" value={currencyFormatter.format(parseFloat(amountPaying || 0))} />
              <DetailRow label="Outstanding Amount" value={currencyFormatter.format(loan.outstandingAmount)} />
              <DetailRow label="Penalties" value={currencyFormatter.format(loan.totalPenaltyAmount)} />
              <DetailRow label="Forgive Principal" value={forgiveLoan ? 'Yes' : 'No'} />
              <DetailRow label="Forgive Penalties" value={forgivePenalties ? 'Yes' : 'No'} />
              <DetailRow label="Delete Documents" value={watch('deleteLoanDocuments') ? 'Yes' : 'No'} />

              <View style={styles.divider} />

              <DetailRow
                label="Remaining Balance"
                value={currencyFormatter.format(calculateRemainingBalance())}
                valueStyle={calculateRemainingBalance() > 0 && !forgiveLoan ? { color: colors.warningInk } : null}
              />
              <DetailRow
                label="Remaining Penalties"
                value={currencyFormatter.format(calculateRemainingPenalties())}
                valueStyle={calculateRemainingPenalties() > 0 && !forgivePenalties ? { color: colors.warningInk } : null}
              />

              {calculateRemainingBalance() > 0 && !forgiveLoan && (
                <View style={styles.modalWarning}>
                  <Icon name="alert-circle" size={15} color={colors.dangerInk} />
                  <Text style={[type.sub, { color: colors.dangerInk, marginLeft: 6, flex: 1 }]}>
                    Warning: There will be remaining principal without loan forgiveness!
                  </Text>
                </View>
              )}

              {calculateRemainingPenalties() > 0 && !forgivePenalties && (
                <View style={styles.modalWarning}>
                  <Icon name="alert-circle" size={15} color={colors.dangerInk} />
                  <Text style={[type.sub, { color: colors.dangerInk, marginLeft: 6, flex: 1 }]}>
                    Warning: There will be remaining penalties without penalty forgiveness!
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.modalButtons}>
              <Button
                label="Cancel"
                variant="outline"
                full
                style={{ flex: 1, marginRight: spacing.sm / 2 }}
                disabled={submitting}
                onPress={hideConfirmationModal}
              />
              <Button
                label="Confirm"
                icon="check"
                variant="danger"
                full
                loading={submitting}
                style={{ flex: 1, marginLeft: spacing.sm / 2 }}
                disabled={submitting}
                onPress={handleSubmit(onSubmit)}
              />
            </View>
          </Animated.View>
        </View>
      )}
      <CustomToast />
    </Screen>
  );
};

const styles = StyleSheet.create({
  page: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxxl,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  optionsContainer: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  sectionTitle: {
    ...type.bodyBold,
    color: colors.inkSecondary,
    marginBottom: spacing.xs,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accentDeep,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalIconChip: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    gap: spacing.sm,
  },
  modalWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: spacing.lg,
  },
});

export default CloseLoan;
