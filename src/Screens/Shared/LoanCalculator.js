import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { showToast, CustomToast } from '../../components/toast/CustomToast';
import { apiCall } from '../../components/api/apiUtils';
import { colors, spacing, type, radii } from '../../theme/tokens';
import EviTextField from '../../components/ui/EviTextField';
import EviButton from '../../components/ui/EviButton';
import EviCard from '../../components/ui/EviCard';

const LoanCalculator = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [loanAmount, setLoanAmount] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [loanStartDate, setLoanStartDate] = useState(new Date());
  const [loanDuration, setLoanDuration] = useState('');
  const [installmentFrequency, setInstallmentFrequency] = useState('');
  const [gracePeriod, setGracePeriod] = useState('0');
  const [interestRate, setInterestRate] = useState('0');

  const onSubmit = async () => {
    if (!principalAmount || !loanAmount || !loanDuration || !installmentFrequency) {
      showToast(
        'error',
        'Validation Error',
        'Please fill in all required fields.',
      );
      return;
    }

    setLoading(true);
    try {
      const response = await apiCall('/api/shared/loan/calculate', 'POST', {
        loanAmount,
        loanStartDate: loanStartDate.toISOString().split('T')[0],
        loanDuration,
        installmentFrequency,
        gracePeriod,
        interestRate,
      });
      setResult(response.data);
      showToast(
        'success',
        'Calculation Successful',
        'Your loan details have been calculated.',
      );
    } catch (error) {
      showToast(
        'error',
        'Calculation Failed',
        error.message || 'An error occurred while calculating loan details.',
      );
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'INR' }).format(value);
  };

  const fieldLeft = (icon) => <Icon name={icon} size={20} color={colors.inkFaint} style={styles.iconPad} />;

  const ResultRow = ({ label, value }) => (
    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={styles.resultValue}>{value}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.headerIconRing}>
            <Icon name="calculator-variant" size={26} color={colors.brand} />
          </View>
          <Text style={styles.headerText}>Loan Calculator</Text>
          <Text style={styles.headerSub}>Estimate EMIs and total repayment</Text>
        </View>

        <EviCard elevated={false} style={styles.formCard}>
          <EviTextField
            label="Loan Amount"
            value={loanAmount}
            onChangeText={setLoanAmount}
            keyboardType="numeric"
            left={fieldLeft("cash")}
          />
          <EviTextField
            label="Principal Amount"
            value={principalAmount}
            onChangeText={setPrincipalAmount}
            keyboardType="numeric"
            left={fieldLeft("calculator")}
          />

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Icon name="calendar-month" size={20} color={colors.inkFaint} style={styles.iconPad} />
            <Text style={styles.dateButtonText}>{loanStartDate.toDateString()}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={loanStartDate}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setLoanStartDate(selectedDate);
                }
              }}
            />
          )}

          <EviTextField
            label="Loan Duration (in days)"
            value={loanDuration}
            onChangeText={setLoanDuration}
            keyboardType="numeric"
            left={fieldLeft("timer-outline")}
          />

          <View style={styles.pickerWrap}>
            <Icon name="repeat-variant" size={20} color={colors.inkFaint} style={styles.iconPad} />
            <Picker
              selectedValue={installmentFrequency}
              onValueChange={setInstallmentFrequency}
              style={styles.picker}
            >
              <Picker.Item label="Select Frequency" value="" />
              <Picker.Item label="Daily" value="Daily" />
              <Picker.Item label="Weekly" value="Weekly" />
              <Picker.Item label="Monthly" value="Monthly" />
            </Picker>
          </View>

          <EviTextField
            label="Grace Period (in days)"
            value={gracePeriod}
            editable={false}
            left={fieldLeft("calendar-clock")}
          />
          <EviTextField
            label="Interest Rate (%)"
            value={interestRate}
            editable={false}
            left={fieldLeft("percent")}
          />
        </EviCard>

        <EviButton
          title="Calculate"
          onPress={onSubmit}
          loading={loading}
          icon="calculator-variant"
          variant="primary"
          size="lg"
          style={styles.calculateButton}
        />

        {result && (
          <EviCard style={styles.resultCard} elevated={false}>
            <View style={styles.resultHeaderRow}>
              <View style={styles.resultIconRing}>
                <Icon name="receipt-outline" size={20} color={colors.brand} />
              </View>
              <Text style={styles.resultTitle}>Loan Details</Text>
            </View>
            <ResultRow label="Loan Amount" value={formatCurrency(result.loanAmount)} />
            <ResultRow label="Principal Amount" value={formatCurrency(principalAmount)} />
            <ResultRow label="Loan Start Date" value={new Date(result.loanStartDate).toLocaleDateString()} />
            <ResultRow label="Loan End Date" value={new Date(result.loanEndDate).toLocaleDateString()} />
            <ResultRow label="Number of Installments" value={result.numberOfInstallments} />
            <ResultRow label="Repayment per Installment" value={formatCurrency(result.repaymentAmountPerInstallment)} />
            <View style={styles.resultDivider} />
            <ResultRow label="Total Repayment" value={formatCurrency(result.totalRepaymentAmount)} />
          </EviCard>
        )}
      </ScrollView>
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
    padding: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerIconRing: {
    width: 56,
    height: 56,
    borderRadius: radii.xl,
    backgroundColor: colors.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  headerText: {
    fontSize: type.sizes.xxl,
    fontWeight: type.weights.bold,
    color: colors.ink,
  },
  headerSub: {
    fontSize: type.sizes.sm,
    color: colors.inkSoft,
    marginTop: spacing.xs,
  },
  formCard: {
    padding: spacing.md,
  },
  iconPad: {
    margin: spacing.md,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing.md,
  },
  dateButtonText: {
    flex: 1,
    fontSize: type.sizes.md,
    color: colors.ink,
    paddingVertical: spacing.md,
  },
  pickerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing.md,
  },
  picker: {
    flex: 1,
    height: 56,
    color: colors.ink,
  },
  calculateButton: {
    marginTop: spacing.lg,
  },
  resultCard: {
    marginTop: spacing.xl,
    padding: spacing.lg,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  resultIconRing: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    backgroundColor: colors.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  resultTitle: {
    fontSize: type.sizes.lg,
    fontWeight: type.weights.bold,
    color: colors.ink,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  resultLabel: {
    fontSize: type.sizes.sm,
    fontWeight: type.weights.medium,
    color: colors.inkSoft,
    flex: 1,
    marginRight: spacing.md,
  },
  resultValue: {
    fontSize: type.sizes.sm,
    fontWeight: type.weights.semibold,
    color: colors.ink,
  },
  resultDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: spacing.md,
  },
});

export default LoanCalculator;
