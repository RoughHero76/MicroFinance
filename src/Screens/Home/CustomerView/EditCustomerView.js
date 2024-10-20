import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { apiCall } from '../../../components/api/apiUtils';
import { showToast } from '../../../components/toast/CustomToast';
import { useNavigation, useRoute } from '@react-navigation/native';

const EditCustomerScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { customerData } = route.params;

    const [formData, setFormData] = useState({
        fname: customerData.fname,
        lname: customerData.lname,
        gender: customerData.gender,
        email: customerData.email,
        userName: customerData.userName,
        phoneNumber: customerData.phoneNumber,
        address: customerData.address,
        city: customerData.city,
        state: customerData.state,
        country: customerData.country,
        pincode: customerData.pincode,
    });

    const handleChange = (name, value) => {
        setFormData(prevState => ({
            ...prevState,
            [name]: value,
        }));
    };

    const handleSubmit = async () => {
        try {
            const response = await apiCall(`/api/admin/customer?uid=${customerData.uid}`, 'PUT', formData);
            if (response.status === 'success') {
                showToast('success', 'Success', 'Customer updated successfully');
                navigation.goBack();
            } else {
                showToast('error', 'Error', response.message || 'Failed to update customer');
            }
        } catch (error) {
            console.error('Error updating customer:', error);
            showToast('error', 'Error', 'Failed to update customer');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.card}>
                    <Text style={styles.heading}>Edit Customer</Text>

                    <View style={styles.inputContainer}>
                        <Icon name="account-outline" size={20} color="#666" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="First Name"
                            value={formData.fname}
                            onChangeText={(value) => handleChange('fname', value)}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Icon name="account-outline" size={20} color="#666" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Last Name"
                            value={formData.lname}
                            onChangeText={(value) => handleChange('lname', value)}
                        />
                    </View>

                    <View style={styles.pickerContainer}>
                        <Icon name="gender-male-female" size={20} color="#666" style={styles.icon} />
                        <Picker
                            selectedValue={formData.gender}
                            style={styles.picker}
                            onValueChange={(value) => handleChange('gender', value)}
                        >
                            <Picker.Item label="Select Gender" value="" />
                            <Picker.Item label="Male" value="Male" />
                            <Picker.Item label="Female" value="Female" />
                            <Picker.Item label="Other" value="Other" />
                        </Picker>
                    </View>

                    <View style={styles.inputContainer}>
                        <Icon name="email-outline" size={20} color="#666" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            value={formData.email}
                            onChangeText={(value) => handleChange('email', value)}
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Icon name="account-circle-outline" size={20} color="#666" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Username"
                            value={formData.userName}
                            onChangeText={(value) => handleChange('userName', value)}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Icon name="phone-outline" size={20} color="#666" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Phone Number"
                            value={formData.phoneNumber}
                            onChangeText={(value) => handleChange('phoneNumber', value)}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Icon name="home-outline" size={20} color="#666" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Address"
                            value={formData.address}
                            onChangeText={(value) => handleChange('address', value)}
                            multiline
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Icon name="city" size={20} color="#666" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="City"
                            value={formData.city}
                            onChangeText={(value) => handleChange('city', value)}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Icon name="map-outline" size={20} color="#666" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="State"
                            value={formData.state}
                            onChangeText={(value) => handleChange('state', value)}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Icon name="earth" size={20} color="#666" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Country"
                            value={formData.country}
                            onChangeText={(value) => handleChange('country', value)}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Icon name="map-marker-radius-outline" size={20} color="#666" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Pincode"
                            value={formData.pincode}
                            onChangeText={(value) => handleChange('pincode', value)}
                            keyboardType="numeric"
                        />
                    </View>

                    <TouchableOpacity style={styles.button} onPress={handleSubmit}>
                        <Text style={styles.buttonText}>Update Customer</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#e5e5e5',
    },
    scrollContainer: {
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    heading: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
        textAlign: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        paddingLeft: 10,
        paddingRight: 10,
        marginBottom: 15,
    },
    input: {
        flex: 1,
        padding: 10,
        fontSize: 16,
        color: '#333',
    },
    icon: {
        marginRight: 10,
    },
    pickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        paddingLeft: 10,
        marginBottom: 15,
    },
    picker: {
        flex: 1,
    },
    button: {
        backgroundColor: '#4CAF50',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default EditCustomerScreen;
