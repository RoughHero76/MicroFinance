import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { apiCall } from "../../../components/api/apiUtils";
import { showToast, CustomToast } from "../../../components/toast/CustomToast";
import { useNavigation, useRoute } from "@react-navigation/native";
import ProfilePicturePlaceHolder from "../../../assets/placeholders/profile.jpg";
import Icon from "../../../design/Icon";
import Card from "../../../design/components/Card";
import Button from "../../../design/components/Button";
import TextField from "../../../design/components/TextField";
import EmptyState from "../../../design/components/EmptyState";
import Skeleton from "../../../design/components/Skeleton";
import { colors, spacing, radius, type } from "../../../design/tokens";

/**
 * Lead details — rebuilt on the "Ink & Amber" design system.
 *  - behaviour preserved 1:1: the GET /api/employee/lead/:id fetch (with
 *    the goBack on failure), the PATCH .../followup update (remarks
 *    required, followupDate ISO, followupStatus, remarksEmployee), the
 *    .../request-conversion POST (remarks required + the exact
 *    confirmation Alert), the followup-status Completed/ Pending toggle,
 *    the minimum-today date picker, the conditional conversion section
 *    (only when followup is Completed and not InProgress), the InProgress
 *    and Approved/Rejected info banners, and all 3-arg toasts verbatim
 *  - status colours mapped to semantic tokens: Pending → warning,
 *    InProgress → info, Approved → success, Rejected → danger, else
 *    neutral (the original's solid badges)
 *  - fix: the original crashed on `lead.loanAmount.toLocaleString` when
 *    loanAmount was missing; now a safe Number() fallback
 *  - design: profile card with avatar + status pill, icon detail-row
 *    cards for loan / address / status, a design followup form (segmented
 *    status control, date button, multiline remarks), info banners with
 *    tinted icon chips, skeleton loading and a proper "not found" state
 */

const STATUS_CONFIG = {
  Pending: { bg: colors.warningSoft, fg: colors.warningInk },
  InProgress: { bg: colors.infoSoft, fg: colors.infoInk },
  Approved: { bg: colors.successSoft, fg: colors.successInk },
  Rejected: { bg: colors.dangerSoft, fg: colors.dangerInk },
};

const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || { bg: colors.neutralSoft, fg: colors.neutralInk };
  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
      <Text style={[styles.statusBadgeText, { color: config.fg }]} numberOfLines={1}>
        {status}
      </Text>
    </View>
  );
};

const DetailRow = ({ icon, label, children, valueColor }) => (
  <View style={styles.detailRow}>
    <Icon name={icon} size={16} color={colors.inkMuted} />
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={[styles.detailValue, valueColor ? { color: valueColor } : null]} numberOfLines={2}>
      {children}
    </Text>
  </View>
);

const InfoBanner = ({ icon, tone, children }) => (
  <View style={[styles.infoBanner, { backgroundColor: tone.bg }]}>
    <View style={[styles.infoIconChip, { backgroundColor: tone.bg }]}>
      <Icon name={icon} size={20} color={tone.fg} />
    </View>
    <Text style={[styles.infoText, { color: tone.fg }]}>{children}</Text>
  </View>
);

const LoadingDetail = () => (
  <View style={styles.page}>
    <Card padded={false} style={{ marginBottom: spacing.md }}>
      <View style={{ padding: spacing.lg, flexDirection: 'row', gap: spacing.md }}>
        <Skeleton width={72} height={72} radius={radius.full} />
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Skeleton width="45%" height={18} />
          <Skeleton width="60%" height={12} />
          <Skeleton width="35%" height={24} radius={radius.full} />
        </View>
      </View>
    </Card>
    {[0, 1].map((i) => (
      <Card key={i} padded={false} style={{ marginBottom: spacing.md }}>
        <View style={{ padding: spacing.lg, gap: spacing.sm }}>
          <Skeleton width="30%" height={16} />
          <Skeleton width="85%" height={12} />
          <Skeleton width="70%" height={12} />
          <Skeleton width="60%" height={12} />
        </View>
      </Card>
    ))}
  </View>
);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleConfirmConversion = async () => {
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
  };

  const handleRequestConversion = () => {
    if (!conversionRemarks.trim()) {
      showToast("error", "Error", "Please enter conversion remarks");
      return;
    }

    // Confirmation dialog
    Alert.alert(
      "Request Lead Conversion",
      "Are you sure you want to request this lead to be converted to a customer?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", onPress: handleConfirmConversion },
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
        <LoadingDetail />
        <CustomToast />
      </SafeAreaView>
    );
  }

  if (!lead) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="alert-circle"
          title="Lead not found"
          subtitle="The lead may have been removed."
          style={{ marginTop: spacing.xxxl }}
        />
        <View style={styles.notFoundActions}>
          <Button label="Go Back" icon="arrow-left" variant="outline" onPress={() => navigation.goBack()} />
        </View>
        <CustomToast />
      </SafeAreaView>
    );
  }

  const followupStatusColor = lead.followupStatus === "Completed" ? colors.successInk : colors.warningInk;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.page}>
        {/* Lead profile card */}
        <Card elevation="subtle" style={{ marginBottom: spacing.md }}>
          <View style={styles.profileRow}>
            <Image source={imageSource} style={styles.profileImage} resizeMode="cover" />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName} numberOfLines={1}>
                {lead.name}
              </Text>
              <View style={styles.profileMeta}>
                <Icon name="phone" size={15} color={colors.inkMuted} />
                <Text style={styles.profileDetail} numberOfLines={1}>
                  {lead.phone}
                </Text>
              </View>
              {lead.email ? (
                <View style={styles.profileMeta}>
                  <Icon name="email-outline" size={15} color={colors.inkMuted} />
                  <Text style={styles.profileDetail} numberOfLines={1}>
                    {lead.email}
                  </Text>
                </View>
              ) : null}
              <View style={styles.statusWrap}>
                <StatusBadge status={lead.status} />
              </View>
            </View>
          </View>
        </Card>

        {/* Loan details */}
        <Card padded={false} style={{ marginBottom: spacing.md }}>
          <Text style={styles.cardTitle}>Loan Details</Text>
          <View style={styles.detailsWrap}>
            <DetailRow icon="briefcase" label="Type">
              {lead.loanType}
            </DetailRow>
            <DetailRow icon="currency-inr" label="Amount">
              ₹{Number(lead.loanAmount || 0).toLocaleString("en-IN")}
            </DetailRow>
            <DetailRow icon="calendar-clock" label="Duration">
              {lead.loanDuration}
            </DetailRow>
            <DetailRow icon="target" label="Purpose">
              {lead.loanPurpose}
            </DetailRow>
          </View>
        </Card>

        {/* Address details */}
        <Card padded={false} style={{ marginBottom: spacing.md }}>
          <Text style={styles.cardTitle}>Address Details</Text>
          <View style={styles.detailsWrap}>
            <DetailRow icon="map-marker" label="Address">
              {lead.address}
            </DetailRow>
            <DetailRow icon="city" label="City">
              {lead.city}
            </DetailRow>
            <DetailRow icon="globe" label="State">
              {lead.state}
            </DetailRow>
          </View>
        </Card>

        {/* Lead status */}
        <Card padded={false} style={{ marginBottom: spacing.md }}>
          <Text style={styles.cardTitle}>Lead Status</Text>
          <View style={styles.detailsWrap}>
            <DetailRow icon="calendar-month-outline" label="Added">
              {formatDate(lead.date)}
            </DetailRow>
            <DetailRow icon="progress-check" label="Status">
              {lead.status}
            </DetailRow>
            {lead.followupDate ? (
              <DetailRow icon="calendar-clock" label="Followup">
                {formatDate(lead.followupDate)}
              </DetailRow>
            ) : null}
            {lead.followupStatus ? (
              <DetailRow icon="clock" label="Followup" valueColor={followupStatusColor}>
                {lead.followupStatus}
              </DetailRow>
            ) : null}
          </View>
          <View style={styles.remarksWrap}>
            {lead.remarksEmployee ? (
              <View style={styles.remarksBlock}>
                <Text style={styles.remarksLabel}>Your Remarks</Text>
                <Text style={styles.remarksText}>{lead.remarksEmployee}</Text>
              </View>
            ) : null}
            {lead.remarksByAdmin ? (
              <View style={styles.remarksBlock}>
                <Text style={styles.remarksLabel}>Admin Remarks</Text>
                <Text style={styles.remarksText}>{lead.remarksByAdmin}</Text>
              </View>
            ) : null}
          </View>
        </Card>

        {/* Update followup form */}
        <Card padded={false} style={{ marginBottom: spacing.md }}>
          <Text style={styles.cardTitle}>Update Followup</Text>
          <View style={styles.formWrap}>
            <Text style={styles.fieldLabel}>Followup Date</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
              <Icon name="calendar" size={18} color={colors.accentDeep} />
              <Text style={styles.dateText}>
                {followupDate.toLocaleDateString("en-IN")}
              </Text>
            </TouchableOpacity>
            {showDatePicker ? (
              <DateTimePicker
                value={followupDate}
                mode="date"
                display="default"
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            ) : null}

            <Text style={styles.fieldLabel}>Followup Status</Text>
            <View style={styles.segmented}>
              <TouchableOpacity
                style={[styles.segment, followupStatus === "Pending" && styles.segmentActiveWarning]}
                onPress={() => setFollowupStatus("Pending")}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.segmentText,
                    followupStatus === "Pending" && styles.segmentTextWarningActive,
                  ]}
                >
                  Pending
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segment, followupStatus === "Completed" && styles.segmentActiveSuccess]}
                onPress={() => setFollowupStatus("Completed")}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.segmentText,
                    followupStatus === "Completed" && styles.segmentTextSuccessActive,
                  ]}
                >
                  Completed
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Remarks</Text>
            <TextField
              value={remarks}
              onChangeText={setRemarks}
              placeholder="Enter your remarks about this lead..."
              multiline
            />

            <Button
              label="Update Followup"
              icon="pencil"
              variant="accent"
              full
              loading={submitting}
              onPress={handleUpdateFollowup}
            />
          </View>
        </Card>

        {/* Request conversion — only when followup is completed */}
        {lead.followupStatus === "Completed" && lead.status !== "InProgress" ? (
          <Card padded={false} style={{ marginBottom: spacing.md }}>
            <Text style={styles.cardTitle}>Request Conversion to Customer</Text>
            <View style={styles.formWrap}>
              <Text style={styles.fieldLabel}>Conversion Remarks</Text>
              <TextField
                value={conversionRemarks}
                onChangeText={setConversionRemarks}
                placeholder="Enter detailed remarks for conversion request..."
                multiline
              />
              <Button
                label="Request Conversion"
                icon="swap-horizontal"
                variant="primary"
                full
                loading={submitting}
                onPress={handleRequestConversion}
              />
            </View>
          </Card>
        ) : null}

        {/* Conversion in progress banner */}
        {lead.status === "InProgress" ? (
          <InfoBanner icon="information-outline" tone={{ bg: colors.infoSoft, fg: colors.infoInk }}>
            Conversion request has been submitted and is pending approval from admin.
          </InfoBanner>
        ) : null}

        {/* Approved / Rejected banner */}
        {lead.status === "Approved" || lead.status === "Rejected" ? (
          <InfoBanner
            icon={lead.status === "Approved" ? "check-circle-outline" : "close-circle-outline"}
            tone={
              lead.status === "Approved"
                ? { bg: colors.successSoft, fg: colors.successInk }
                : { bg: colors.dangerSoft, fg: colors.dangerInk }
            }
          >
            This lead has been {lead.status.toLowerCase()}.{" "}
            {lead.remarksByAdmin ? `Admin remarks: ${lead.remarksByAdmin}` : ""}
          </InfoBanner>
        ) : null}
      </ScrollView>
      <CustomToast />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  page: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  scrollView: {
    flex: 1,
  },

  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileImage: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    marginRight: spacing.md,
    backgroundColor: colors.surfaceAlt,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...type.h1,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  profileMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  profileDetail: {
    ...type.sub,
    color: colors.inkSecondary,
    marginLeft: spacing.xs,
    flexShrink: 1,
  },
  statusWrap: {
    marginTop: spacing.xs,
  },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  statusBadgeText: {
    ...type.micro,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  cardTitle: {
    ...type.title,
    color: colors.ink,
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  detailsWrap: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    gap: spacing.xs + 2,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  detailLabel: {
    ...type.sub,
    color: colors.inkMuted,
    marginLeft: spacing.sm,
    width: 82,
  },
  detailValue: {
    ...type.sub,
    color: colors.ink,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  remarksWrap: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  remarksBlock: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 6,
  },
  remarksLabel: {
    ...type.caption,
    fontWeight: "700",
    color: colors.inkSecondary,
  },
  remarksText: {
    ...type.sub,
    color: colors.ink,
    lineHeight: 20,
  },

  formWrap: {
    padding: spacing.lg,
    paddingTop: 0,
    gap: spacing.sm,
  },
  fieldLabel: {
    ...type.sub,
    color: colors.inkSecondary,
    marginTop: spacing.xs,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  dateText: {
    ...type.body,
    color: colors.ink,
    fontWeight: "600",
  },
  segmented: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  segmentActiveWarning: {
    backgroundColor: colors.warning,
  },
  segmentActiveSuccess: {
    backgroundColor: colors.success,
  },
  segmentText: {
    ...type.bodyBold,
    color: colors.inkSecondary,
  },
  segmentTextWarningActive: {
    color: colors.surface,
  },
  segmentTextSuccessActive: {
    color: colors.surface,
  },

  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoIconChip: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  infoText: {
    ...type.sub,
    flex: 1,
    lineHeight: 20,
  },

  notFoundActions: {
    padding: spacing.lg,
    alignItems: "center",
  },
});

export default LeadDetailsScreen;
