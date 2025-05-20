import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Image,
    TextInput,
    Platform,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { apiCall } from "../../../components/api/apiUtils";
import { showToast } from "../../../components/toast/CustomToast";
import { useNavigation, useRoute } from "@react-navigation/native";
import ProfilePicturePlaceHolder from "../../../assets/placeholders/profile.jpg";

const LeadDetailsScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { leadId } = route.params;
    const [lead, setLead] = useState(null);
    const [loading, setLoading] = useState(true);
    const [imageSource, setImageSource] = useState(ProfilePicturePlaceHolder);

    // Form states for followup
    const [followupDate, setFollowupDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [followupStatus, setFollowupStatus] = useState("Pending");
    const [remarks, setRemarks] = useState("");

    // Convert to customer form
    const [conversionRemarks, setConversionRemarks] = useState("");

    // Form submission states
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchLeadDetails();
    }, [leadId]);

    const fetchLeadDetails = async () => {
        try {
            setLoading(true);
            const response = await apiCall(`/api/employee/lead/${leadId}`, "GET");

            if (response.status === "success") {
                setLead(response.data);

                // Set current values if available
                if (response.data.followupDate) {
                    setFollowupDate(new Date(response.data.followupDate));
                }
                if (response.data.followupStatus) {
                    setFollowupStatus(response.data.followupStatus);
                }
                if (response.data.remarksEmployee) {
                    setRemarks(response.data.remarksEmployee);
                }

                // Load and cache the image
                if (response.data.pictureUrl) {
                    setImageSource({ uri: response.data.pictureUrl });
                }
            } else {
                showToast("error", "Error", response.message || "Failed to fetch lead details");
                navigation.goBack();
            }
        } catch (error) {
            console.error("Error fetching lead details:", error);
            showToast("error", "Error", "An error occurred while fetching lead details");
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "Pending":
                return "#FFC107";
            case "InProgress":
                return "#2196F3";
            case "Approved":
                return "#4CAF50";
            case "Rejected":
                return "#F44336";
            default:
                return "#9E9E9E";
        }
    };

    const handleUpdateFollowup = async () => {
        if (!remarks.trim()) {
            showToast("error", "Error", "Please enter remarks");
            return;
        }

        try {
            setSubmitting(true);
            const response = await apiCall(`/api/employee/lead/${leadId}/followup`, "PATCH", {
                followupDate: followupDate.toISOString(),
                followupStatus,
                remarksEmployee: remarks,
            });

            if (response.status === "success") {
                showToast("success", "Success", "Followup updated successfully");
                fetchLeadDetails(); // Refresh data
            } else {
                showToast("error", "Error", response.message || "Failed to update followup");
            }
        } catch (error) {
            console.error("Error updating followup:", error);
            showToast("error", "Error", "An error occurred while updating followup");
        } finally {
            setSubmitting(false);
        }
    };

    const handleRequestConversion = async () => {
        if (!conversionRemarks.trim()) {
            showToast("error", "Error", "Please enter conversion remarks");
            return;
        }

        // Confirmation dialog
        Alert.alert(
            "Request Lead Conversion",
            "Are you sure you want to request this lead to be converted to a customer?",
            [
                {
                    text: "Cancel",
                    style: "cancel",
                },
                {
                    text: "Confirm",
                    onPress: async () => {
                        try {
                            setSubmitting(true);
                            const response = await apiCall(
                                `/api/employee/lead/${leadId}/request-conversion`,
                                "POST",
                                {
                                    remarksEmployee: conversionRemarks,
                                }
                            );

                            if (response.status === "success") {
                                showToast("success", "Success", "Conversion request submitted successfully");
                                fetchLeadDetails(); // Refresh data
                            } else {
                                showToast("error", "Error", response.message || "Failed to submit conversion request");
                            }
                        } catch (error) {
                            console.error("Error requesting conversion:", error);
                            showToast("error", "Error", "An error occurred while requesting conversion");
                        } finally {
                            setSubmitting(false);
                        }
                    },
                },
            ]
        );
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const handleDateChange = (event, selectedDate) => {
        setShowDatePicker(Platform.OS === "ios");
        if (selectedDate) {
            setFollowupDate(selectedDate);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                </View>
            </SafeAreaView>
        );
    }

    if (!lead) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Lead not found</Text>
                    <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
                        <Text style={styles.buttonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>

            <ScrollView style={styles.scrollView}>
                {/* Lead Basic Info Card */}
                <View style={styles.profileCard}>
                    <Image source={imageSource} style={styles.profileImage} />
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{lead.name}</Text>
                        <Text style={styles.profileDetail}>Phone: {lead.phone}</Text>
                        {lead.email && <Text style={styles.profileDetail}>Email: {lead.email}</Text>}
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(lead.status) }]}>
                            <Text style={styles.statusText}>{lead.status}</Text>
                        </View>
                    </View>
                </View>

                {/* Loan Details Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Loan Details</Text>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Loan Type</Text>
                        <Text style={styles.detailValue}>{lead.loanType}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Amount</Text>
                        <Text style={styles.detailValue}>₹{lead.loanAmount.toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Duration</Text>
                        <Text style={styles.detailValue}>{lead.loanDuration}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Purpose</Text>
                        <Text style={styles.detailValue}>{lead.loanPurpose}</Text>
                    </View>
                </View>

                {/* Address Details Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Address Details</Text>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Address</Text>
                        <Text style={styles.detailValue}>{lead.address}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>City</Text>
                        <Text style={styles.detailValue}>{lead.city}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>State</Text>
                        <Text style={styles.detailValue}>{lead.state}</Text>
                    </View>
                </View>

                {/* Lead Status Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Lead Status</Text>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Added Date</Text>
                        <Text style={styles.detailValue}>{formatDate(lead.date)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Current Status</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(lead.status) }]}>
                            <Text style={styles.statusText}>{lead.status}</Text>
                        </View>
                    </View>
                    {lead.followupDate && (
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Followup Date</Text>
                            <Text style={styles.detailValue}>{formatDate(lead.followupDate)}</Text>
                        </View>
                    )}
                    {lead.followupStatus && (
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Followup Status</Text>
                            <Text
                                style={[
                                    styles.detailValue,
                                    {
                                        color: lead.followupStatus === "Completed" ? "#4CAF50" : "#FFC107"
                                    }
                                ]}
                            >
                                {lead.followupStatus}
                            </Text>
                        </View>
                    )}
                    {lead.remarksEmployee && (
                        <View style={styles.remarksRow}>
                            <Text style={styles.detailLabel}>Your Remarks</Text>
                            <Text style={styles.remarksText}>{lead.remarksEmployee}</Text>
                        </View>
                    )}
                    {lead.remarksByAdmin && (
                        <View style={styles.remarksRow}>
                            <Text style={styles.detailLabel}>Admin Remarks</Text>
                            <Text style={styles.remarksText}>{lead.remarksByAdmin}</Text>
                        </View>
                    )}
                </View>

                {/* Followup Update Form */}
                <View style={styles.formCard}>
                    <Text style={styles.cardTitle}>Update Followup</Text>

                    <Text style={styles.inputLabel}>Followup Date</Text>
                    <TouchableOpacity
                        style={styles.datePickerButton}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Text style={styles.dateText}>
                            {followupDate.toLocaleDateString('en-IN')}
                        </Text>
                        <Icon name="calendar" size={20} color="#666" />
                    </TouchableOpacity>

                    {showDatePicker && (
                        <DateTimePicker
                            value={followupDate}
                            mode="date"
                            display="default"
                            onChange={handleDateChange}
                            minimumDate={new Date()}
                        />
                    )}

                    <Text style={styles.inputLabel}>Followup Status</Text>
                    <View style={styles.statusButtons}>
                        <TouchableOpacity
                            style={[
                                styles.statusButton,
                                followupStatus === "Pending" && styles.statusButtonActive
                            ]}
                            onPress={() => setFollowupStatus("Pending")}
                        >
                            <Text
                                style={[
                                    styles.statusButtonText,
                                    followupStatus === "Pending" && styles.statusButtonTextActive
                                ]}
                            >
                                Pending
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.statusButton,
                                followupStatus === "Completed" && styles.statusButtonActive
                            ]}
                            onPress={() => setFollowupStatus("Completed")}
                        >
                            <Text
                                style={[
                                    styles.statusButtonText,
                                    followupStatus === "Completed" && styles.statusButtonTextActive
                                ]}
                            >
                                Completed
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.inputLabel}>Remarks</Text>
                    <TextInput
                        style={styles.inputMultiline}
                        placeholder="Enter your remarks about this lead..."
                        value={remarks}
                        onChangeText={setRemarks}
                        multiline
                        numberOfLines={4}
                    />

                    <TouchableOpacity
                        style={[styles.submitButton, submitting && styles.disabledButton]}
                        onPress={handleUpdateFollowup}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.submitButtonText}>Update Followup</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Request Conversion - Only available if followup is completed */}
                {lead.followupStatus === "Completed" && lead.status !== "InProgress" && (
                    <View style={styles.formCard}>
                        <Text style={styles.cardTitle}>Request Conversion to Customer</Text>

                        <Text style={styles.inputLabel}>Conversion Remarks</Text>
                        <TextInput
                            style={styles.inputMultiline}
                            placeholder="Enter detailed remarks for conversion request..."
                            value={conversionRemarks}
                            onChangeText={setConversionRemarks}
                            multiline
                            numberOfLines={4}
                        />

                        <TouchableOpacity
                            style={[styles.submitButton, submitting && styles.disabledButton]}
                            onPress={handleRequestConversion}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.submitButtonText}>Request Conversion</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* If conversion is already requested (status is InProgress) */}
                {lead.status === "InProgress" && (
                    <View style={styles.card}>
                        <View style={styles.infoBox}>
                            <Icon name="information-outline" size={24} color="#2196F3" />
                            <Text style={styles.infoText}>
                                Conversion request has been submitted and is pending approval from admin.
                            </Text>
                        </View>
                    </View>
                )}

                {/* If lead is already approved/rejected */}
                {(lead.status === "Approved" || lead.status === "Rejected") && (
                    <View style={styles.card}>
                        <View style={styles.infoBox}>
                            <Icon
                                name={lead.status === "Approved" ? "check-circle-outline" : "close-circle-outline"}
                                size={24}
                                color={lead.status === "Approved" ? "#4CAF50" : "#F44336"}
                            />
                            <Text style={styles.infoText}>
                                This lead has been {lead.status.toLowerCase()}. {lead.remarksByAdmin ? `Admin remarks: ${lead.remarksByAdmin}` : ''}
                            </Text>
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
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
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        color: "#F44336",
        marginBottom: 20,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 15,
        backgroundColor: "#fff",
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#333",
    },
    scrollView: {
        flex: 1,
    },
    profileCard: {
        flexDirection: "row",
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 15,
        margin: 10,
        elevation: 3,
    },
    profileImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginRight: 15,
    },
    profileInfo: {
        flex: 1,
        justifyContent: "center",
    },
    profileName: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 5,
    },
    profileDetail: {
        fontSize: 14,
        color: "#666",
        marginBottom: 3,
    },
    statusBadge: {
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 15,
        marginTop: 5,
    },
    statusText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 12,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 15,
        margin: 10,
        elevation: 3,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 15,
    },
    detailRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10,
        alignItems: "center",
    },
    detailLabel: {
        fontSize: 14,
        color: "#666",
        flex: 1,
    },
    detailValue: {
        fontSize: 16,
        color: "#333",
        fontWeight: "500",
        flex: 2,
        textAlign: "right",
    },
    remarksRow: {
        marginTop: 10,
        marginBottom: 10,
    },
    remarksText: {
        fontSize: 14,
        color: "#333",
        marginTop: 5,
        backgroundColor: "#f9f9f9",
        padding: 10,
        borderRadius: 5,
    },
    formCard: {
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 15,
        margin: 10,
        elevation: 3,
    },
    inputLabel: {
        fontSize: 14,
        color: "#666",
        marginBottom: 5,
    },
    datePickerButton: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
        padding: 12,
        borderRadius: 5,
        marginBottom: 15,
    },
    dateText: {
        fontSize: 16,
        color: "#333",
    },
    statusButtons: {
        flexDirection: "row",
        marginBottom: 15,
    },
    statusButton: {
        flex: 1,
        padding: 10,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#ccc",
        marginHorizontal: 5,
        borderRadius: 5,
    },
    statusButtonActive: {
        backgroundColor: "#4CAF50",
        borderColor: "#4CAF50",
    },
    statusButtonText: {
        color: "#666",
        fontWeight: "bold",
    },
    statusButtonTextActive: {
        color: "#fff",
    },
    inputMultiline: {
        backgroundColor: "#f5f5f5",
        borderRadius: 5,
        padding: 10,
        textAlignVertical: "top",
        minHeight: 100,
        fontSize: 16,
        color: "#333",
        marginBottom: 15,
    },
    submitButton: {
        backgroundColor: "#4CAF50",
        padding: 15,
        borderRadius: 5,
        alignItems: "center",
    },
    disabledButton: {
        backgroundColor: "#a5d6a7",
    },
    submitButtonText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 16,
    },
    infoBox: {
        flexDirection: "row",
        backgroundColor: "#e3f2fd",
        padding: 15,
        borderRadius: 5,
        alignItems: "center",
    },
    infoText: {
        marginLeft: 10,
        flex: 1,
        color: "#333",
        fontSize: 14,
    },
    button: {
        backgroundColor: "#4CAF50",
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
    },
    buttonText: {
        color: "#fff",
        fontWeight: "bold",
    },
});

export default LeadDetailsScreen;