import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import Toast from 'react-native-toast-message';
import { apiCall } from '../../components/api/apiUtils';

const LoanCalculator = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [loanAmount, setLoanAmount] = useState('');
  const [loanStartDate, setLoanStartDate] = useState(new Date());
  const [loanDuration, setLoanDuration] = useState('');
  const [installmentFrequency, setInstallmentFrequency] = useState('');
  const [gracePeriod, setGracePeriod] = useState('0');
  const [interestRate, setInterestRate] = useState('0');

  const onSubmit = async () => {
    if (!loanAmount || !loanDuration || !installmentFrequency) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please fill in all required fields.',
      });
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
      Toast.show({
        type: 'success',
        text1: 'Calculation Successful',
        text2: 'Your loan details have been calculated.',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Calculation Failed',
        text2: error.message || 'An error occurred while calculating loan details.',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'INR' }).format(value);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.title}>Loan Calculator</Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              placeholder="Loan Amount"
              placeholderTextColor={styles.placeholderText.color}
              style={styles.input}
              value={loanAmount}
              onChangeText={setLoanAmount}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
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
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              placeholder="Loan Duration (in days)"
              placeholderTextColor={styles.placeholderText.color}
              style={styles.input}
              value={loanDuration}
              onChangeText={setLoanDuration}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.pickerContainer}>
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

          <View style={styles.inputContainer}>
            <TextInput
              placeholder="Grace Period (in days)"
              placeholderTextColor={styles.placeholderText.color}
              style={[styles.input, styles.disabledInput]}
              value={gracePeriod}
              editable={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              placeholder="Interest Rate (%)"
              placeholderTextColor={styles.placeholderText.color}
              style={[styles.input, styles.disabledInput]}
              value={interestRate}
              editable={false}
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={onSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Calculate</Text>
            )}
          </TouchableOpacity>
        </View>

        {result && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Loan Details</Text>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Loan Amount:</Text>
              <Text style={styles.resultValue}>{formatCurrency(result.loanAmount)}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Loan Start Date:</Text>
              <Text style={styles.resultValue}>{new Date(result.loanStartDate).toLocaleDateString()}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Loan End Date:</Text>
              <Text style={styles.resultValue}>{new Date(result.loanEndDate).toLocaleDateString()}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Number of Installments:</Text>
              <Text style={styles.resultValue}>{result.numberOfInstallments}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Repayment per Installment:</Text>
              <Text style={styles.resultValue}>{formatCurrency(result.repaymentAmountPerInstallment)}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Total Repayment:</Text>
              <Text style={styles.resultValue}>{formatCurrency(result.totalRepaymentAmount)}</Text>
            </View>
          </View>
        )}
      </ScrollView>
      <Toast />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#333333',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    color: '#333333',
  },
  placeholderText: {
    color: '#999999',
  },
  disabledInput: {
    backgroundColor: '#f0f0f0',
    color: '#888888',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 4,
    marginBottom: 16,
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#333333',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 4,
    padding: 12,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333333',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 4,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333333',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultLabel: {
    fontWeight: 'bold',
    color: '#555555',
  },
  resultValue: {
    color: '#333333',
  },
});

export default LoanCalculator;
