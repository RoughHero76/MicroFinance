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
import CustomToast from "../../../components/toast/CustomToast";
import { useNavigation, useRoute } from "@react-navigation/native";
import ProfilePicturePlaceHolder from "../../../assets/placeholders/profile.jpg";
import { colors, spacing, radii, type, shadow } from "../../../theme/tokens";
import StatusBadge from "../../../components/ui/StatusBadge";
import EviButton from "../../../components/ui/EviButton";
import EmptyState from "../../../components/ui/EmptyState";

const LeadDetailsScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { leadId } = route.params || {};
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
                    <ActivityIndicator size="large" color={colors.brand} />
                </View>
            </SafeAreaView>
        );
    }

    if (!lead) {
        return (
            <SafeAreaView style={styles.container}>
                <EmptyState
                    icon="file-question-outline"
                    title="Lead Not Found"
                    message="This lead could not be loaded."
                    actionLabel="Go Back"
                    onAction={() => navigation.goBack()}
                    style={{ flex: 1, justifyContent: 'center' }}
                />
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
                        <View style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }}>
                            <StatusBadge status={lead.status} />
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
                        <StatusBadge status={lead.status} />
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
                                        color: lead.followupStatus === "Completed" ? colors.success : colors.warning
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
                        <Icon name="calendar" size={20} color={colors.brand} />
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
                        placeholderTextColor={colors.inkFaint}
                        value={remarks}
                        onChangeText={setRemarks}
                        multiline
                        numberOfLines={4}
                    />

                    <EviButton
                        title="Update Followup"
                        size="lg"
                        fullWidth
                        loading={submitting}
                        style={{ marginTop: spacing.lg }}
                        onPress={handleUpdateFollowup}
                    />
                </View>

                {/* Request Conversion - Only available if followup is completed */}
                {lead.followupStatus === "Completed" && lead.status !== "InProgress" && (
                    <View style={styles.formCard}>
                        <Text style={styles.cardTitle}>Request Conversion to Customer</Text>

                        <Text style={styles.inputLabel}>Conversion Remarks</Text>
                        <TextInput
                            style={styles.inputMultiline}
                            placeholder="Enter detailed remarks for conversion request..."
                            placeholderTextColor={colors.inkFaint}
                            value={conversionRemarks}
                            onChangeText={setConversionRemarks}
                            multiline
                            numberOfLines={4}
                        />

                        <EviButton
                            title="Request Conversion"
                            size="lg"
                            fullWidth
                            loading={submitting}
                            style={{ marginTop: spacing.lg }}
                            onPress={handleRequestConversion}
                        />
                    </View>
                )}

                {/* If conversion is already requested (status is InProgress) */}
                {lead.status === "InProgress" && (
                    <View style={styles.card}>
                        <View style={[styles.infoBox, { backgroundColor: colors.infoTint }]}>
                            <Icon name="information-outline" size={24} color={colors.info} />
                            <Text style={styles.infoText}>
                                Conversion request has been submitted and is pending approval from admin.
                            </Text>
                        </View>
                    </View>
                )}

                {/* If lead is already approved/rejected */}
                {(lead.status === "Approved" || lead.status === "Rejected") && (
                    <View style={styles.card}>
                        <View style={[
                            styles.infoBox,
                            { backgroundColor: lead.status === "Approved" ? colors.successTint : colors.dangerTint }
                        ]}>
                            <Icon
                                name={lead.status === "Approved" ? "check-circle-outline" : "close-circle-outline"}
                                size={24}
                                color={lead.status === "Approved" ? colors.success : colors.danger}
                            />
                            <Text style={styles.infoText}>
                                This lead has been {lead.status.toLowerCase()}. {lead.remarksByAdmin ? `Admin remarks: ${lead.remarksByAdmin}` : ''}
                            </Text>
                        </View>
                    </View>
                )}
            </ScrollView>
            <CustomToast />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.surface,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    scrollView: {
        flex: 1,
    },
    profileCard: {
        flexDirection: "row",
        backgroundColor: colors.card,
        borderRadius: radii.lg,
        padding: spacing.lg,
        margin: spacing.sm,
        ...shadow.card,
    },
    profileImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginRight: spacing.lg,
    },
    profileInfo: {
        flex: 1,
        justifyContent: "center",
    },
    profileName: {
        fontSize: type.sizes.xl,
        fontWeight: type.weights.bold,
        color: colors.ink,
        marginBottom: spacing.sm,
    },
    profileDetail: {
        fontSize: type.sizes.sm,
        color: colors.inkSoft,
        marginBottom: spacing.xs,
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: radii.lg,
        padding: spacing.lg,
        margin: spacing.sm,
        ...shadow.card,
    },
    cardTitle: {
        fontSize: type.sizes.xl,
        fontWeight: type.weights.bold,
        color: colors.ink,
        marginBottom: spacing.lg,
    },
    detailRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: spacing.md,
        alignItems: "center",
    },
    detailLabel: {
        fontSize: type.sizes.sm,
        color: colors.inkSoft,
        flex: 1,
    },
    detailValue: {
        fontSize: type.sizes.md,
        color: colors.ink,
        fontWeight: type.weights.medium,
        flex: 2,
        textAlign: "right",
    },
    remarksRow: {
        marginTop: spacing.md,
        marginBottom: spacing.md,
    },
    remarksText: {
        fontSize: type.sizes.sm,
        color: colors.ink,
        marginTop: spacing.sm,
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: radii.sm,
    },
    formCard: {
        backgroundColor: colors.card,
        borderRadius: radii.lg,
        padding: spacing.lg,
        margin: spacing.sm,
        ...shadow.card,
    },
    inputLabel: {
        fontSize: type.sizes.sm,
        color: colors.inkSoft,
        marginBottom: spacing.sm,
        fontWeight: type.weights.medium,
    },
    datePickerButton: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        height: 52,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radii.md,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.lg,
    },
    dateText: {
        fontSize: type.sizes.md,
        color: colors.ink,
        fontWeight: type.weights.medium,
    },
    statusButtons: {
        flexDirection: "row",
        marginBottom: spacing.lg,
    },
    statusButton: {
        flex: 1,
        paddingVertical: spacing.sm,
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.line,
        marginHorizontal: spacing.xs,
        borderRadius: radii.md,
        backgroundColor: colors.surface,
    },
    statusButtonActive: {
        backgroundColor: colors.brand,
        borderColor: colors.brand,
    },
    statusButtonText: {
        color: colors.inkSoft,
        fontWeight: type.weights.bold,
        fontSize: type.sizes.sm,
    },
    statusButtonTextActive: {
        color: colors.white,
    },
    inputMultiline: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: radii.md,
        padding: spacing.md,
        textAlignVertical: "top",
        minHeight: 100,
        fontSize: type.sizes.md,
        color: colors.ink,
        marginBottom: spacing.lg,
    },
    infoBox: {
        flexDirection: "row",
        padding: spacing.lg,
        borderRadius: radii.md,
        alignItems: "center",
    },
    infoText: {
        marginLeft: spacing.md,
        flex: 1,
        color: colors.ink,
        fontSize: type.sizes.sm,
    },
});

export default LeadDetailsScreen;
