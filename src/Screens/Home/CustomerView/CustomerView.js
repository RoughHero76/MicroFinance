import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { apiCall } from "../../../components/api/apiUtils";
import { useRoute, useNavigation} from "@react-navigation/native";
import ProfilePicturePlaceHolder from '../../../assets/placeholders/profile.jpg'

const CustomerView = () => {
    const [customerData, setCustomerData] = useState(null);
    const navigation = useNavigation();
    const route = useRoute();
    const { uid } = route.params;

    useEffect(() => {
        fetchCustomerData(uid);
    }, [uid]);

    const fetchCustomerData = async (uid) => {
        try {
            const response = await apiCall(`/api/admin/customer?uid=${uid}`, 'GET');
            if (response.status === 'success') {
                setCustomerData(response.data[0]);
            } else {
                console.error('Failed to fetch customer data');
            }
        } catch (error) {
            console.error('Error fetching customer data:', error);
        }
    };

    const handleRepaymentSchedule = (loanId) => {
        // Add logic to view repayment schedule
        console.log(`View repayment schedule for loan ID: ${loanId}`);
        navigation.navigate("RepaymentSchedule", { loanId });

    };

    const handleRepaymentHistory = (loanId) => {
        // Add logic to view repayment history
        console.log(`View repayment history for loan ID: ${loanId}`);
    };

    if (!customerData) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Loading...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.profileContainer}>
                    <Image
                        source={customerData.profileImageUrl || ProfilePicturePlaceHolder}
                        style={styles.profileImage}
                    />
                    <Text style={styles.customerName}>
                        {customerData.fname} {customerData.lname}
                    </Text>
                </View>
                <TouchableOpacity onPress={() => fetchCustomerData(uid)}>
                    <Icon name="refresh" size={28} color="#4CAF50" />
                </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <Text style={styles.customerDetail}>Username: {customerData.userName}</Text>
            <Text style={styles.customerDetail}>Email: {customerData.email}</Text>
            <Text style={styles.customerDetail}>Phone: {customerData.phoneNumber}</Text>
            <Text style={styles.customerDetail}>
                Address: {customerData.address}, {customerData.city}, {customerData.state}, {customerData.country}
            </Text>

            <Text style={styles.sectionTitle}>Loans</Text>
            {customerData.loans.length > 0 ? (
                customerData.loans.map((loan) => (
                    <View key={loan._id} style={styles.loanContainer}>
                        <Text style={styles.loanDetails}>
                            <Icon name="currency-inr" size={20} color="#4CAF50" /> Loan Amount: {loan.loanAmount}
                        </Text>
                        <Text style={styles.loanDetails}>
                            <Icon name="calendar-clock" size={20} color="#4CAF50" /> Loan Duration: {loan.loanDuration}
                        </Text>
                        <Text style={styles.loanDetails}>
                            <Icon name="calendar-month" size={20} color="#4CAF50" /> Installments: {loan.numberOfInstallments} ({loan.installmentFrequency})
                        </Text>
                        <Text style={styles.loanDetails}>
                            <Icon name="progress-check" size={20} color={loan.status === "pending" ? "#ff9800" : loan.status === "approved" ? "#4CAF50" : "#f44336"} />
                            Status: {loan.status}
                        </Text>
                        <Text style={styles.loanDetails}>
                            <Icon name="cash" size={20} color="#4CAF50" /> Total Paid: {loan.totalPaid}
                        </Text>

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={styles.button}
                                onPress={() => handleRepaymentSchedule(loan._id)}
                            >
                                <Text style={styles.buttonText}>View Repayment Schedule</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.button, styles.secondaryButton]}
                                onPress={() => handleRepaymentHistory(loan._id)}
                            >
                                <Text style={styles.buttonText}>View Repayment History</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                ))
            ) : (
                <Text style={styles.noLoansText}>No Loans</Text>
            )}

        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f9f9f9',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    profileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
    },
    customerName: {
        fontSize: 24,
        fontWeight: '600',
        color: '#333',
    },
    customerDetail: {
        fontSize: 18,
        marginBottom: 8,
        color: '#555',
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginTop: 30,
        marginBottom: 10,
        color: '#4CAF50',
    },
    loanContainer: {
        padding: 15,
        backgroundColor: '#fff',
        borderRadius: 12,
        marginTop: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
    },
    loanDetails: {
        fontSize: 16,
        marginBottom: 5,
        color: '#333',
    },
    noLoansText: {
        fontSize: 16,
        color: '#999',
        marginTop: 10,
    },
    divider: {
        height: 1,
        backgroundColor: '#ccc',
        marginVertical: 15,
    },
    buttonContainer: {
        flexDirection: 'column',
        marginTop: 10,
        justifyContent: 'space-between',
    },
    button: {
        backgroundColor: '#4CAF50',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        marginVertical: 5,
    },
    secondaryButton: {
        backgroundColor: '#2196F3',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default CustomerView;
