import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { showToast, CustomToast } from '../../components/toast/CustomToast';
import { apiCall } from '../../components/api/apiUtils';
import Screen from '../../design/components/Screen';
import Card from '../../design/components/Card';
import Button from '../../design/components/Button';
import TextField from '../../design/components/TextField';
import Icon from '../../design/Icon';
import { colors, spacing, radius, type } from '../../design/tokens';

/**
 * LoanCalculator — shared loan EMI estimator, rebuilt on the
 * "Ink & Amber" design system.
 *  - same behaviour: identical field set (grace period and interest
 *    rate stay the original fixed "0" values), the same required-field
 *    validation copy, the same POST /api/shared/loan/calculate payload,
 *    the same success/error toasts and the same result rows (INR
 *    formatting, start/end date, installments, per-installment and
 *    total repayment)
 *  - presentation: design TextField rows with icon affordances, the
 *    frequency Picker in a themed wrapper, and a result card with
 *    label/value rows instead of the old flat white box
 */

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'INR' }).format(value);

const ResultRow = ({ label, value }) => (
  <View style={styles.resultRow}>
    <Text style={styles.resultLabel}>{label}</Text>
    <Text style={styles.resultValue} numberOfLines={1}>{value}</Text>
  </View>
);

const LoanCalculator = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [loanAmount, setLoanAmount] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [loanStartDate, setLoanStartDate] = useState(new Date());
  const [loanDuration, setLoanDuration] = useState('');
  const [installmentFrequency, setInstallmentFrequency] = useState('');
  const gracePeriod = '0';
  const interestRate = '0';

  const onSubmit = async () => {
    if (!principalAmount || !loanAmount || !loanDuration || !installmentFrequency) {
      showToast('error', 'Validation Error', 'Please fill in all required fields.');
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
      showToast('success', 'Calculation Successful', 'Your loan details have been calculated.');
    } catch (error) {
      showToast(
        'error',
        'Calculation Failed',
        error.message || 'An error occurred while calculating loan details.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll keyboardAvoid bg={colors.bg}>
      <View style={styles.page}>
        <Card>
          <Text style={styles.cardTitle}>Loan Calculator</Text>

          <TextField
            label="Loan Amount"
            placeholder="₹ Loan amount"
            value={loanAmount}
            onChangeText={setLoanAmount}
            leftIcon="cash"
            keyboardType="numeric"
          />
          <TextField
            label="Principal Amount"
            placeholder="₹ Principal amount"
            value={principalAmount}
            onChangeText={setPrincipalAmount}
            leftIcon="currency-inr"
            keyboardType="numeric"
          />

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Loan Start Date</Text>
            <Pressable
              style={({ pressed }) => [styles.dateBtn, pressed && { opacity: 0.85 }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Icon name="calendar" size={18} color={colors.inkSecondary} />
              <Text style={styles.dateBtnText}>{loanStartDate.toDateString()}</Text>
              <Icon name="chevron-right" size={16} color={colors.inkMuted} />
            </Pressable>
          </View>

          <TextField
            label="Loan Duration (in days)"
            placeholder="e.g. 90"
            value={loanDuration}
            onChangeText={setLoanDuration}
            leftIcon="calendar-range"
            keyboardType="numeric"
          />

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Installment Frequency</Text>
            <View style={styles.pickerWrap}>
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
              <Icon name="chevron-down" size={16} color={colors.inkMuted} />
            </View>
          </View>

          <View style={styles.fixedRow}>
            <View style={styles.fixedCell}>
              <Icon name="clock" size={15} color={colors.inkMuted} />
              <Text style={styles.fixedLabel}>Grace Period</Text>
              <Text style={styles.fixedValue}>0 days</Text>
            </View>
            <View style={styles.fixedDivider} />
            <View style={styles.fixedCell}>
              <Icon name="percent" size={15} color={colors.inkMuted} />
              <Text style={styles.fixedLabel}>Interest Rate</Text>
              <Text style={styles.fixedValue}>0%</Text>
            </View>
          </View>

          <Button
            label="Calculate"
            icon="calculator"
            variant="accent"
            size="lg"
            full
            loading={loading}
            disabled={loading}
            onPress={onSubmit}
            style={{ marginTop: spacing.md }}
          />
        </Card>

        {result && (
          <Card>
            <View style={styles.resultTitleRow}>
              <View style={styles.resultTitleChip}>
                <Icon name="calculator" size={16} color={colors.accentDeep} />
              </View>
              <Text style={styles.resultTitle}>Loan Details</Text>
            </View>
            <ResultRow label="Loan Amount" value={formatCurrency(result.loanAmount)} />
            <ResultRow label="Principal Amount" value={formatCurrency(principalAmount)} />
            <ResultRow
              label="Loan Start Date"
              value={new Date(result.loanStartDate).toLocaleDateString()}
            />
            <ResultRow
              label="Loan End Date"
              value={new Date(result.loanEndDate).toLocaleDateString()}
            />
            <ResultRow label="Number of Installments" value={String(result.numberOfInstallments ?? 'N/A')} />
            <ResultRow
              label="Repayment per Installment"
              value={formatCurrency(result.repaymentAmountPerInstallment)}
            />
            <ResultRow
              label="Total Repayment"
              value={formatCurrency(result.totalRepaymentAmount)}
              strong
            />
          </Card>
        )}
      </View>

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

      <CustomToast />
    </Screen>
  );
};

const styles = StyleSheet.create({
  page: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  cardTitle: {
    ...type.h1,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  field: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...type.caption,
    color: colors.inkSecondary,
    marginBottom: 6,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateBtnText: {
    flex: 1,
    ...type.body,
    color: colors.ink,
    fontWeight: '600',
  },
  pickerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingRight: spacing.sm,
  },
  picker: {
    flex: 1,
    height: 52,
    color: colors.ink,
  },
  fixedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  fixedCell: {
    flex: 1,
    gap: 3,
  },
  fixedDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  fixedLabel: {
    ...type.caption,
    color: colors.inkMuted,
  },
  fixedValue: {
    ...type.bodyBold,
    color: colors.inkSecondary,
  },
  resultTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  resultTitleChip: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: {
    ...type.h2,
    color: colors.ink,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.md,
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultLabel: {
    ...type.sub,
    color: colors.inkSecondary,
    flexShrink: 1,
  },
  resultValue: {
    ...type.bodyBold,
    color: colors.ink,
    flexShrink: 1,
    textAlign: 'right',
  },
});

export default LoanCalculator;
