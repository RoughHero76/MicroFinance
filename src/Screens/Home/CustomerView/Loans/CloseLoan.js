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

const CloseLoan = ({ route, navigation }) => {
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const { control, handleSubmit, formState: { errors }, watch, setValue } = useForm({
    mode: 'onChange',
    defaultValues: {
      totalAmountPaying: '',
      forgiveLoan: false,
      forgivePenalties: false,
      deleteLoanDocuments: false,
    }
  });

  const { loanId } = route.params;
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

  // Adjust payment validation based on forgiveLoan flag
  useEffect(() => {
    if (forgiveLoan) {
      // When loan forgiveness is enabled, payment can be any amount
      setValue('totalAmountPaying', amountPaying, { shouldValidate: true });
    } else if (loan) {
      // When loan forgiveness is disabled, payment must cover outstanding amount
      const minRequired = loan.outstandingAmount;
      if (parseFloat(amountPaying || 0) < minRequired) {
        setValue('totalAmountPaying', amountPaying, { shouldValidate: true });
      }
    }
  }, [forgiveLoan, loan]);

  const fetchLoanDetails = async () => {
    try {
      setLoading(true);
      const response = await apiCall(`/api/admin/loan?loanId=${loanId}`);
      setLoan(response.data[0]);
    } catch (error) {
      showToast('error', 'Failed to fetch loan details');
    } finally {
      setLoading(false);
    }
  };

  const showConfirmationModal = () => {
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

  const validateForm = (data) => {
    const paymentAmount = parseFloat(data.totalAmountPaying || 0);
    
    if (!loan) return false;
    
    // If loan forgiveness is not enabled, ensure payment covers outstanding amount
    if (!data.forgiveLoan && paymentAmount < loan.outstandingAmount) {
      Alert.alert(
        "Invalid Payment",
        "When not forgiving the loan, payment amount must cover the outstanding principal."
      );
      return false;
    }
    
    // Prevent overpayment
    const totalDue = loan.outstandingAmount + loan.totalPenaltyAmount;
    if (paymentAmount > totalDue) {
      Alert.alert(
        "Invalid Payment",
        "Payment amount cannot exceed the total due amount."
      );
      return false;
    }
    
    return true;
  };

  const onSubmit = async (data) => {
    if (!validateForm(data)) return;
    
    try {
      setSubmitting(true);
      await apiCall('/api/admin/loan/close', 'POST', {
        loanId,
        totalRemainingAmountCustomerIsPaying: parseFloat(data.totalAmountPaying || 0),
        deleteLoanDocuments: data.deleteLoanDocuments,
        forgiveLoan: data.forgiveLoan,
        forgivePenalties: data.forgivePenalties,
      });
      showToast('success', 'Loan closed successfully');
      navigation.goBack();
    } catch (error) {
      showToast('error', error.message || 'Failed to close loan');
    } finally {
      setSubmitting(false);
      hideConfirmationModal();
    }
  };

  const calculateRemainingBalance = () => {
    if (!loan || !amountPaying) return 0;
    
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
        <ActivityIndicator size="large" color="#1E88E5" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <CustomToast />
        
        {/* Loan Details Card */}
        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
          <View style={styles.header}>
            <Icon name="bank" size={24} color="#1E88E5" />
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
            <Icon name="cash-multiple" size={24} color="#1E88E5" />
            <Text style={styles.headerText}>Payment Options</Text>
          </View>
          
          {/* Amount Input */}
          <Text style={styles.inputLabel}>Amount Paying</Text>
          <Controller
            control={control}
            render={({ field: { onChange, onBlur, value } }) => {
              const maxAmount = loan ? loan.outstandingAmount + loan.totalPenaltyAmount : 0;
              return (
                <View style={styles.inputContainer}>
                  <View style={styles.currencyInputContainer}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <TextInput
                      style={[
                        styles.input, 
                        errors.totalAmountPaying && styles.inputError
                      ]}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      placeholder="0.00"
                      placeholderTextColor="#90A4AE"
                      keyboardType="numeric"
                    />
                  </View>
                  
                  {errors.totalAmountPaying && (
                    <Text style={styles.errorText}>
                      {forgiveLoan 
                        ? `Amount must be between 0 and ${maxAmount}` 
                        : `Amount must be at least ${loan.outstandingAmount} and at most ${maxAmount}`}
                    </Text>
                  )}
                </View>
              );
            }}
            name="totalAmountPaying"
            rules={{
              required: true,
              validate: (value) => {
                const numValue = parseFloat(value || 0);
                const maxAmount = loan ? loan.outstandingAmount + loan.totalPenaltyAmount : 0;
                
                if (numValue < 0 || numValue > maxAmount) {
                  return false;
                }
                
                if (!forgiveLoan && numValue < loan.outstandingAmount) {
                  return "Payment must cover outstanding amount";
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
                  onPress={() => onChange(!value)}
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
            <Icon name="calculator" size={24} color="#1E88E5" />
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
              <Text style={styles.detailValue}>
                {currencyFormatter.format(calculateRemainingBalance())}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Remaining Penalties:</Text>
              <Text style={styles.detailValue}>
                {currencyFormatter.format(calculateRemainingPenalties())}
              </Text>
            </View>
          </View>
        </Animated.View>

        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit(showConfirmationModal)}
          disabled={submitting}
        >
          <Text style={styles.buttonText}>Close Loan</Text>
        </TouchableOpacity>
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
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={hideConfirmationModal}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, submitting && styles.buttonDisabled]}
                onPress={handleSubmit(onSubmit)}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E88E5',
    marginLeft: 8,
  },
  details: {
    borderTopWidth: 1,
    borderTopColor: '#ECEFF1',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 15,
    color: '#546E7A',
  },
  detailValue: {
    fontSize: 15,
    color: '#37474F',
    fontWeight: '500',
  },
  totalLabel: {
    fontSize: 16,
    color: '#455A64',
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 16,
    color: '#1E88E5',
    fontWeight: '700',
  },
  highlightText: {
    color: '#4CAF50',
    fontWeight: '700',
  },
  warningText: {
    color: '#F57C00',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#ECEFF1',
    marginVertical: 12,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#455A64',
    marginBottom: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  currencyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CFD8DC',
  },
  currencySymbol: {
    fontSize: 16,
    color: '#546E7A',
    paddingLeft: 12,
    paddingRight: 4,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#37474F',
  },
  inputError: {
    borderColor: '#EF5350',
  },
  errorText: {
    color: '#EF5350',
    fontSize: 14,
    marginTop: 4,
  },
  optionsContainer: {
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#455A64',
    marginBottom: 12,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#1E88E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#1E88E5',
    borderColor: '#1E88E5',
  },
  checkboxTextContainer: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#37474F',
    fontWeight: '500',
  },
  checkboxHint: {
    fontSize: 14,
    color: '#78909C',
    marginTop: 2,
  },
  button: {
    backgroundColor: '#1E88E5',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#90CAF9',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E88E5',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalContent: {
    marginBottom: 24,
  },
  modalMessage: {
    fontSize: 16,
    color: '#455A64',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#ECEFF1',
    marginVertical: 12,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalDetailLabel: {
    fontSize: 15,
    color: '#546E7A',
  },
  modalDetailValue: {
    fontSize: 15,
    color: '#37474F',
    fontWeight: '500',
  },
  modalWarning: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#ECEFF1',
    borderWidth: 1,
    borderColor: '#CFD8DC',
  },
  confirmButton: {
    backgroundColor: '#1E88E5',
  },
  cancelButtonText: {
    color: '#455A64',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CloseLoan;