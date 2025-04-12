// src/screens/CreateLeadScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import { apiCall } from "../../../components/api/apiUtils";
import { showToast } from "../../../components/toast/CustomToast";
import { useNavigation } from '@react-navigation/native';
import ProfilePicturePlaceHolder from "../../../assets/placeholders/profile.jpg";


const CreateLeadScreen = () => {
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    loanType: '',
    loanAmount: '',
    loanDuration: '',
    loanPurpose: '',
    followupDate: '',
  });
  const [picture, setPicture] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const selectPicture = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.7 }, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        showToast('error', 'Error', 'Failed to select image');
      } else if (response.assets && response.assets.length > 0) {
        setPicture(response.assets[0]);
      }
    });
  };

  const handleSubmit = async () => {
    if (!picture) {
      showToast('error', 'Error', 'Please select a picture');
      return;
    }

    const requiredFields = [
      'name',
      'phone',
      'address',
      'city',
      'state',
      'loanType',
      'loanAmount',
      'loanDuration',
      'loanPurpose',
    ];
    const missingFields = requiredFields.filter((field) => !formData[field]);
    if (missingFields.length > 0) {
      showToast('error', 'Error', `Missing fields: ${missingFields.join(', ')}`);
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        if (formData[key]) {
          data.append(key, formData[key]);
        }
      });
      data.append('picture', {
        uri: picture.uri,
        type: picture.type,
        name: picture.fileName || 'photo.jpg',
      });

      const response = await apiCall('/api/employee/lead/create', 'POST', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.status === 'success') {
        showToast('success', 'Success', 'Lead created successfully');
        navigation.goBack();
      } else {
        showToast('error', 'Error', response.message || 'Failed to create lead');
      }
    } catch (error) {
      console.error('Error creating lead:', error);
      showToast('error', 'Error', 'An error occurred while creating the lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create New Lead</Text>
      </View>
      <ScrollView contentContainerStyle={styles.formContainer}>
        <TouchableOpacity style={styles.imagePicker} onPress={selectPicture}>
          <Image
            source={picture ? { uri: picture.uri } : ProfilePicturePlaceHolder}
            style={styles.leadImage}
          />
          <Text style={styles.imagePickerText}>Select Picture</Text>
        </TouchableOpacity>

        {[
          { label: 'Name', field: 'name' },
          { label: 'Phone', field: 'phone', keyboardType: 'phone-pad' },
          { label: 'Email', field: 'email', keyboardType: 'email-address' },
          { label: 'Address', field: 'address' },
          { label: 'City', field: 'city' },
          { label: 'State', field: 'state' },
          { label: 'Loan Type', field: 'loanType' },
          { label: 'Loan Amount', field: 'loanAmount', keyboardType: 'numeric' },
          { label: 'Loan Duration', field: 'loanDuration' },
          { label: 'Loan Purpose', field: 'loanPurpose' },
          { label: 'Follow-up Date (YYYY-MM-DD)', field: 'followupDate' },
        ].map(({ label, field, keyboardType }) => (
          <View key={field} style={styles.inputContainer}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              style={styles.input}
              value={formData[field]}
              onChangeText={(text) => handleInputChange(field, text)}
              keyboardType={keyboardType || 'default'}
              placeholder={`Enter ${label}`}
            />
          </View>
        ))}

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Create Lead</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  formContainer: {
    padding: 15,
  },
  imagePicker: {
    alignItems: 'center',
    marginBottom: 20,
  },
  leadImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  imagePickerText: {
    fontSize: 16,
    color: '#4CAF50',
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CreateLeadScreen;