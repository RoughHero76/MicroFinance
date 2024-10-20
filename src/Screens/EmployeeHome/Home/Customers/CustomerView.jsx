import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { apiCall } from "../../../../components/api/apiUtils";
import { useRoute, useNavigation } from "@react-navigation/native";
import ProfilePicturePlaceHolder from "../../../../assets/placeholders/profile.jpg";
import { showToast, CustomToast } from "../../../../components/toast/CustomToast";
import ImageModal from "../../../../components/Image/ImageModal";

const CustomerView = () => {
    const [customerData, setCustomerData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigation = useNavigation();
    const route = useRoute();
    const { id } = route.params;

    const [imageModalVisible, setImageModalVisible] = useState(false);
    const [currentImage, setCurrentImage] = useState(null);
    const handleImageOpen = () => {
        setCurrentImage(customerData?.profilePic || ProfilePicturePlaceHolder);
        setImageModalVisible(true);
    };

    const handleDownloadProfilePicture = () => {
        console.log('DownloadIamge')
    };

    useEffect(() => {
        fetchCustomerData(id);
    }, [id]);

    const fetchCustomerData = async (id) => {
        try {
            setLoading(true);
            const response = await apiCall(`/api/employee/loan/customer/profile?customerId=${id}`, "GET");
            if (response.status === "success") {
                setCustomerData(response.data);
            } else {
                showToast("error", "Error", response.message || "Failed to fetch customer data");
            }
        } catch (error) {
            console.error("Error fetching customer data:", error);
        } finally {
            setLoading(false);
        }
    };



    const handleRepaymentSchedule = (loanId) => {
        navigation.navigate("RepaymentSchedule", { loanId });
    };

    const handleRepaymentHistory = (loanId) => {
        navigation.navigate("PaymentHistory", { loanId });
    };



    const handleViewLoanDetails = (loanId) => {
        navigation.navigate("LoanDetails", { loanId });
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView>
                <View style={styles.header}>

                    <TouchableOpacity onPress={() => handleImageOpen()}>
                        <Image
                            source={customerData?.profilePic ? { uri: customerData.profilePic } : ProfilePicturePlaceHolder}
                            style={styles.profileImage}
                        />
                    </TouchableOpacity>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.customerName}>
                            {customerData?.fname} {customerData?.lname}
                        </Text>
                        <Text style={styles.customerEmail}>{customerData?.email}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.refreshButton}
                        onPress={() => fetchCustomerData(id)}
                    >
                        <Icon name="refresh" size={24} color="#4CAF50" />
                    </TouchableOpacity>
                </View>

                <View style={styles.infoCard}>
                    <InfoItem icon="phone" label="Phone" value={customerData.phoneNumber} />
                    <InfoItem
                        icon="map-marker"
                        label="Address"
                        value={`${customerData.address}, ${customerData.city}, ${customerData.state}, ${customerData.country}`}
                    />

                    <InfoItem icon="email" label="Email" value={customerData.email} />

                </View>

                {customerData?.loans.length > 0 ? (
                    customerData.loans.map((loan) => (
                        <View key={loan._id} style={styles.loanCard}>
                            <View style={styles.loanHeader}>
                                <Text style={styles.loanAmount}>₹{loan.loanAmount}</Text>
                                <Text style={styles.loanNumber}>Loan #{loan?.loanNumber ?? 'N/A'}</Text>
                                <LoanStatus status={loan.status} />
                            </View>
                            <Text style={styles.loanInfo}>
                                Outstanding: ₹{loan.outstandingAmount} | Start Date: {new Date(loan.loanStartDate).toLocaleDateString()} | End Date: {new Date(loan.loanEndDate).toLocaleDateString()}
                            </Text>
                            <InfoItem icon="domain" label="Business Name" value={loan.businessFirmName} />
                            <InfoItem icon="home" label="Business Address" value={loan.businessAddress} />
                            <View style={styles.loanButtonsContainer}>
                                <TouchableOpacity
                                    style={[styles.loanButton, styles.scheduleButton]}
                                    onPress={() => handleRepaymentSchedule(loan._id)}
                                    disabled={true}
                                >
                                    <Text style={styles.loanButtonText}>Schedule</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.loanButton, styles.historyButton]}
                                    onPress={() => handleRepaymentHistory(loan._id)}
                                >
                                    <Text style={styles.loanButtonText}>History</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.loanButton, styles.detailsButton]}
                                    onPress={() => handleViewLoanDetails(loan._id)}
                                    disabled={true}
                                >
                                    <Text style={styles.loanButtonText}>Details</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                ) : (
                    <Text style={styles.noLoansText}>No loans found</Text>
                )}
            </ScrollView>
            <ImageModal
                isVisible={imageModalVisible}
                imageUri={currentImage}
                onDownload={handleDownloadProfilePicture}
                onClose={() => setImageModalVisible(false)}
            />
            <CustomToast />
        </SafeAreaView>
    );
};

const InfoItem = ({ icon, label, value }) => (
    <View style={styles.infoItem}>
        <Icon name={icon} size={24} color="#4CAF50" style={styles.infoIcon} />
        <View>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue} numberOfLines={3} ellipsizeMode="tail">
                {value}
            </Text>
        </View>
    </View>
);
const LoanStatus = ({ status }) => {
    const getStatusColor = () => {
        switch (status) {
            case "Active":
                return "#4CAF50";
            case "Pending":
                return "#FFC107";
            case "Rejected":
                return "#F44336";
            case "Closed":
                return "#9E9E9E";
            default:
                return "#F44336";
        }
    };

    return (
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{status}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f0f0f0",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        padding: 20,
        backgroundColor: "#fff",
    },
    profileImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginRight: 15,
    },
    headerTextContainer: {
        flex: 1,
    },
    customerName: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#333",
    },

    refreshButton: {
        padding: 10,
    },
    infoCard: {
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 15,
        margin: 10,
        elevation: 3,
    },
    infoItem: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    infoIcon: {
        marginRight: 10,
    },
    infoLabel: {
        fontSize: 14,
        color: "#666",
    },
    infoValue: {
        fontSize: 16,
        color: "#333",
        flexWrap: "wrap", // Allow text to wrap onto multiple lines
        maxWidth: 250, // Adjust max width as needed
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 15,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#333",
    },
    addLoanButton: {
        backgroundColor: "#4CAF50",
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
    },
    loanCard: {
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 15,
        margin: 10,
        elevation: 3,
    },
    loanHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    loanAmount: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#333",
    },
    loanNumber: {
        fontSize: 16,
        color: "black",
        fontWeight: "bold",
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 15,
    },
    statusText: {
        color: "#fff",
        fontWeight: "bold",
    },
    loanInfo: {
        fontSize: 14,
        color: "#666",
        marginBottom: 5,
    },
    loanButtonsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 10,
    },
    loanButton: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 5,
        alignItems: "center",
        marginHorizontal: 5,
    },
    scheduleButton: {
        backgroundColor: "#2196F3",
    },
    historyButton: {
        backgroundColor: "#FF9800",
    },
    detailsButton: {
        backgroundColor: "#4CAF50",
    },
    loanButtonText: {
        color: "#fff",
        fontWeight: "bold",
    },
    noLoansText: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
        marginTop: 20,
    },
});

export default CustomerView;