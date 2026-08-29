import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  Linking
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { apiCall } from "../../../components/api/apiUtils";
import { useRoute, useNavigation } from "@react-navigation/native";
import ProfilePicturePlaceHolder from "../../../assets/placeholders/profile.jpg";
import { CustomToast, showToast } from "../../../components/toast/CustomToast";
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import ImageModal from "../../../components/Image/ImageModal";
import { useHomeContext } from "../../../components/context/HomeContext";
import { cacheImage, deleteImage } from "../../../components/Image/ImageCache";
import { colors, tones, spacing, radii, type, getStatusTone } from "../../../theme/tokens";
import StatusBadge from "../../../components/ui/StatusBadge";
import EviCard from "../../../components/ui/EviCard";
import EviButton from "../../../components/ui/EviButton";
import EmptyState from "../../../components/ui/EmptyState";
import ErrorState from "../../../components/ui/ErrorState";
import SectionHeader from "../../../components/ui/SectionHeader";

const CustomerView = () => {
  const [customerData, setCustomerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profilePicUploadLoading, setProfilePicUploadLoading] = useState(false);
  const { employees } = useHomeContext();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState(null);
  const [errorView, setErrorView] = useState(false);

  //Image Related
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);

  const [optionModalVisible, setOptionModalVisible] = useState(false);
  const [optionModalPosition, setOptionModalPosition] = useState({ top: 0, right: 0 });

  const [imageSource, setImageSource] = useState(
    customerData?.profilePic ? { uri: customerData.profilePic } : ProfilePicturePlaceHolder
  );

  const navigation = useNavigation();
  const route = useRoute();
  const { uid } = route.params || {};

  useEffect(() => {
    const loadCachedImage = async () => {
      if (customerData?.profilePic) {
        const cachedUri = await cacheImage(customerData.profilePic);
        if (cachedUri) {
          setImageSource({ uri: cachedUri });
        }
      }
    };

    loadCachedImage();
  }, [customerData?.profilePic]);

  useEffect(() => {
    fetchCustomerData(uid);
  }, [uid]);

  const openOptionModal = (event) => {
    const { pageY } = event.nativeEvent;
    setOptionModalPosition({ top: pageY + 10, right: 10 });
    setOptionModalVisible(true);
  };

  const closeOptionModal = () => {
    setOptionModalVisible(false);
  };

  const handleEditCustomer = () => {
    closeOptionModal();
    navigation.navigate("EditCustomer", { customerData });
  };

  const handleImageOpen = () => {
    setCurrentImage(customerData?.profilePic || ProfilePicturePlaceHolder);
    closeOptionModal();
    setImageModalVisible(true);
  };

  const handleDownloadProfilePicture = () => {
    console.log('DownloadIamge')
  };

  const handleDeleteCustomer = () => {
    closeOptionModal();
    Alert.alert(
      "Delete Customer",
      "Are you sure you want to delete this customer?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await apiCall(`/api/admin/customer?uid=${customerData.uid}`, "DELETE");
              if (response.status === "success") {
                showToast("success", "Success", "Customer deleted successfully");
                navigation.goBack();
              } else {
                showToast("error", "Error", response.message || "Failed to delete customer");
              }
            } catch (error) {
              console.error("Error deleting customer:", error);
              showToast("error", "Error", "Failed to delete customer");
            }
          }
        }
      ]
    );
  };

  const fetchCustomerData = async (uid) => {
    try {
      setLoading(true);
      const response = await apiCall(`/api/admin/customer?uid=${uid}`, "GET");
      if (response.status === "success" && response.data?.[0]) {
        setCustomerData(response.data[0]);
      } else {
        showToast("error", "Error", response.message || "Failed to fetch customer data");
        setErrorView(true);
      }
    } catch (error) {
      console.error("Error fetching customer data:", error);
      setErrorView(true);
    } finally {
      setLoading(false);
    }
  };

  const handleImagePicker = () => {
    Alert.alert(
      "Update Profile Picture",
      "Choose an option",
      [
        {
          text: "Take Photo",
          onPress: () => launchCamera({ mediaType: 'photo', quality: 0.3 }, handleImageSelection)
        },
        {
          text: "Choose from Library",
          onPress: () => launchImageLibrary({ mediaType: 'photo', quality: 0.3 }, handleImageSelection)
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    );
  };

  const handleImageSelection = async (response) => {
    if (response.didCancel) {
      return;
    }

    if (response.error) {
      console.error('ImagePicker Error: ', response.error);
      return;
    }

    try {
      setProfilePicUploadLoading(true);
      const asset = response.assets[0];

      // Create a new File object from the asset
      const file = {
        uri: asset.uri,
        type: asset.type,
        name: 'profilePic.jpg',
      };

      const formData = new FormData();
      formData.append('profilePic', file);

      const uploadResponse = await apiCall(
        `/api/admin/customer/profile/porfilePicture?uid=${customerData.uid}`,
        'POST',
        formData,
        true,
        {
          'Content-Type': 'multipart/form-data',
        }
      );

      console.log('Upload response:', uploadResponse);

      if (uploadResponse.status === 'success') {
        showToast("success", "Success", "Profile picture updated successfully");
        deleteImage(customerData.profilePic);
        fetchCustomerData(uid);
      } else {
        showToast("error", "Error", uploadResponse.message || "Failed to update profile picture");
      }
    } catch (error) {
      console.error('Error processing image:', error);
      showToast("error", "Error", "Failed to process image");
    } finally {
      setProfilePicUploadLoading(false);
    }
  };

  const handleRepaymentSchedule = (loanId) => {
    navigation.navigate("RepaymentSchedule", { loanId });
  };

  const handleRepaymentHistory = (loanId) => {
    navigation.navigate("PaymentHistory", { loanId });
  };

  const handleAddLoan = () => {
    navigation.navigate("CreateLoan", { customerUid: uid });
  };

  const handleViewLoanDetails = (loanId) => {
    navigation.navigate("LoanDetails", { loanId });
  };

  const handleAssignEmployee = (loanId) => {
    setSelectedLoanId(loanId);
    setModalVisible(true);
  };

  const handleCloseLoan = (loanId) => {
    navigation.navigate("CloseLoan", { loanId });
  };

  const assignEmployee = async (employeeId) => {
    try {
      const response = await apiCall('/api/admin/loan/assign', 'POST', {
        loanId: selectedLoanId,
        employeeId: employeeId
      });
      if (response.status === 'success') {
        showToast("success", "Success", "Employee assigned successfully");
        fetchCustomerData(uid);
      } else {
        showToast("error", "Error", response.message || "Failed to assign employee");
      }
    } catch (error) {
      console.error("Error assigning employee:", error);
      showToast("error", "Error", "Failed to assign employee");
    } finally {
      setModalVisible(false);
    }
  };

  if (errorView) {
    return (
      <View style={styles.container}>
        <ErrorState
          message="Failed to fetch customer data. Please try again later."
          retryLabel="Try again"
          onRetry={() => {
            setErrorView(false);
            fetchCustomerData(uid);
          }}
        />
        <CustomToast />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  const renderLoanActions = (loan) => {
    const isClosed = loan.status === "Closed";
    return (
      <View>
        <View style={styles.actionsRow}>
          <ActionButton label="Schedule" tone="brand" onPress={() => handleRepaymentSchedule(loan._id)} />
          <ActionButton label="History" tone="info" onPress={() => handleRepaymentHistory(loan._id)} />
          <ActionButton label="Details" tone="neutral" onPress={() => handleViewLoanDetails(loan._id)} />
          {!isClosed && (
            <ActionButton
              label={loan.assignedTo ? "Reassign" : "Assign"}
              tone="warning"
              onPress={() => handleAssignEmployee(loan._id)}
            />
          )}
        </View>
        {isClosed ? (
          <Text style={styles.closedNote}>This loan has been closed.</Text>
        ) : (
          <View style={styles.closeRow}>
            <ActionButton label="Close loan" tone="danger" fullWidth onPress={() => handleCloseLoan(loan._id)} />
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <EviCard style={styles.headerCard} elevated={false} padding={spacing.lg}>
          <View style={styles.headerRow}>
            <View style={styles.avatarWrap}>
              {profilePicUploadLoading ? (
                <View style={styles.avatarPlaceholder}>
                  <ActivityIndicator size="small" color={colors.brand} />
                </View>
              ) : (
                <TouchableOpacity onPress={() => handleImageOpen()}>
                  <Image source={imageSource} style={styles.profileImage} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.editIconContainer} onPress={handleImagePicker}>
                <Icon name="pencil" size={14} color={colors.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.headerTextContainer}>
              <Text style={styles.customerName}>
                {customerData.fname} {customerData.lname}
              </Text>
              <Text style={styles.customerUsername}>@{customerData.userName}</Text>
            </View>
          </View>

          <View style={styles.headerActionsRow}>
            <TouchableOpacity style={styles.iconButton} onPress={() => fetchCustomerData(uid)}>
              <Icon name="refresh" size={22} color={colors.brand} />
              <Text style={styles.iconButtonLabel}>Refresh</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={openOptionModal}>
              <Icon name="dots-vertical" size={22} color={colors.inkSoft} />
              <Text style={styles.iconButtonLabel}>More</Text>
            </TouchableOpacity>
          </View>
        </EviCard>

        <EviCard style={styles.infoCard} elevated={false}>
          <InfoItem icon="email" label="Email" value={customerData.email} />
          <InfoItem icon="phone" label="Phone" value={customerData.phoneNumber} />
          <InfoItem
            icon="map-marker"
            label="Address"
            value={`${customerData.address}, ${customerData.city}, ${customerData.state}, ${customerData.country}`}
          />
        </EviCard>

        <SectionHeader title="Loans" actionLabel="+ New loan" onAction={handleAddLoan} style={styles.sectionHeader} />

        {customerData?.loans?.length > 0 ? (
          customerData.loans.map((loan) => (
            <EviCard key={loan._id} style={styles.loanCard} elevated={false}>
              <View style={styles.loanHeader}>
                <View>
                  <Text style={styles.loanAmount}>₹{loan.loanAmount}</Text>
                  <Text style={styles.loanNumber}>Loan #{loan.loanNumber}</Text>
                </View>
                <StatusBadge status={loan.status} />
              </View>
              <Text style={styles.loanInfo}>
                Duration: {loan.loanDuration} | Installments: {loan.numberOfInstallments} ({loan.installmentFrequency})
              </Text>
              <Text style={styles.loanInfo}>Total Paid: ₹{loan.totalPaid}</Text>
              <InfoItem icon="domain" label="Business Name" value={loan.businessFirmName} />
              <InfoItem icon="home" label="Business Address" value={loan.businessAddress} />
              {loan.assignedTo ? (
                <Text style={styles.assignedEmployee}>
                  Assigned to: {loan.assignedTo.fname} {loan.assignedTo.lname}
                </Text>
              ) : (
                <Text style={styles.noAssignment}>No employee assigned</Text>
              )}
              <View style={styles.loanActionsWrap}>
                {renderLoanActions(loan)}
              </View>
            </EviCard>
          ))
        ) : (
          <EmptyState
            icon="file-document-outline"
            title="No loans yet"
            message="Add the first loan for this customer to get started."
            actionLabel="Add loan"
            onAction={handleAddLoan}
            style={styles.noLoans}
          />
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      <CustomToast />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Assign Employee</Text>
            <ScrollView style={styles.employeeList}>
              {employees?.map((employee) => (
                <TouchableOpacity
                  key={employee._id}
                  style={styles.employeeItem}
                  onPress={() => assignEmployee(employee._id)}
                >
                  <Icon name="account-circle-outline" size={22} color={colors.brand} style={styles.employeeIcon} />
                  <Text style={styles.employeeName}>
                    {employee.fname} {employee.lname}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <EviButton
              title="Close"
              variant="secondary"
              size="md"
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            />
          </View>
          <CustomToast />
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={optionModalVisible}
        onRequestClose={closeOptionModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeOptionModal}
        >
          <View
            style={styles.optionMenu}
            {...{ position: 'absolute', top: optionModalPosition.top, right: optionModalPosition.right }}
          >
            <TouchableOpacity style={styles.optionRow} onPress={handleEditCustomer}>
              <Icon name="account-edit" size={20} color={colors.brand} />
              <Text style={styles.optionText}>Edit Customer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionRow} onPress={handleDeleteCustomer}>
              <Icon name="account-remove" size={20} color={colors.danger} />
              <Text style={[styles.optionText, { color: colors.danger }]}>Delete Customer</Text>
            </TouchableOpacity>
          </View>
          <CustomToast />
        </TouchableOpacity>
      </Modal>

      <ImageModal
        isVisible={imageModalVisible}
        imageUri={currentImage}
        onDownload={handleDownloadProfilePicture}
        onClose={() => setImageModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const handleInfoIconPress = (icon, value) => {
  if (icon === 'phone' && value) {
    const phoneNumber = `tel:+91${value}`;
    Linking.openURL(phoneNumber).catch((err) => console.error('An error occurred: ', err));
  }
  if (icon === 'email' && value) {
    const email = `mailto:${value}`;
    Linking.openURL(email).catch((err) => console.error('An error occurred: ', err));
  }
  if (icon === 'address' && value) {
    const address = `https://www.google.com/maps/search/?api=1&query=${value}`;
    Linking.openURL(address).catch((err) => console.error('An error occurred: ', err));
  }
};

const InfoItem = ({ icon, label, value }) => (
  <View style={styles.infoItem}>
    <TouchableOpacity
      onPress={() => handleInfoIconPress(icon, value)}
      style={styles.infoIconChip}
    >
      <Icon name={icon} size={18} color={colors.brand} />
    </TouchableOpacity>
    <View style={styles.infoTextCol}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={3} ellipsizeMode="tail">
        {value}
      </Text>
    </View>
  </View>
);

// Compact tinted action chip — semantic tone, consistent with the kit's StatusBadge.
const ActionButton = ({ label, tone = 'neutral', onPress, fullWidth }) => {
  const t = tones[tone] || tones.neutral;
  return (
    <TouchableOpacity
      style={[styles.actionBtn, fullWidth && styles.actionBtnFull, { backgroundColor: t.bg }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.actionBtnText, { color: t.fg }]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  headerCard: {
    margin: spacing.lg,
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 80,
    height: 80,
    marginRight: spacing.lg,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brand,
    borderWidth: 2,
    borderColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  customerName: {
    fontSize: type.sizes.xl,
    fontWeight: type.weights.bold,
    color: colors.ink,
  },
  customerUsername: {
    fontSize: type.sizes.sm,
    color: colors.inkSoft,
    marginTop: 2,
  },
  headerActionsRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.md,
  },
  iconButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  iconButtonLabel: {
    fontSize: type.sizes.xs,
    color: colors.inkSoft,
    marginTop: 2,
  },
  infoCard: {
    margin: spacing.lg,
    marginTop: spacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  infoIconChip: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    backgroundColor: colors.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  infoTextCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: type.sizes.xs,
    color: colors.inkSoft,
    marginBottom: 1,
  },
  infoValue: {
    fontSize: type.sizes.md,
    color: colors.ink,
  },
  sectionHeader: {
    marginTop: spacing.sm,
  },
  loanCard: {
    margin: spacing.lg,
    marginTop: spacing.sm,
  },
  loanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  loanAmount: {
    fontSize: type.sizes.xxl,
    fontWeight: type.weights.bold,
    color: colors.ink,
  },
  loanNumber: {
    fontSize: type.sizes.sm,
    color: colors.inkSoft,
    marginTop: 2,
  },
  loanInfo: {
    fontSize: type.sizes.sm,
    color: colors.inkSoft,
    marginBottom: spacing.xs,
  },
  assignedEmployee: {
    fontSize: type.sizes.sm,
    color: colors.brand,
    fontWeight: type.weights.semibold,
    marginTop: spacing.sm,
  },
  noAssignment: {
    fontSize: type.sizes.sm,
    color: colors.danger,
    fontWeight: type.weights.semibold,
    marginTop: spacing.sm,
  },
  loanActionsWrap: {
    marginTop: spacing.lg,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    marginHorizontal: spacing.xs,
  },
  actionBtnFull: {
    flex: 0,
    alignSelf: 'stretch',
    marginHorizontal: 0,
  },
  actionBtnText: {
    fontSize: type.sizes.sm,
    fontWeight: type.weights.semibold,
  },
  closeRow: {
    marginTop: spacing.sm,
  },
  closedNote: {
    fontSize: type.sizes.sm,
    color: colors.inkSoft,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  noLoans: {
    marginTop: spacing.lg,
  },
  bottomSpacer: {
    height: spacing.xxl,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 31, 22, 0.55)',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.lg,
    width: '85%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: type.sizes.lg,
    fontWeight: type.weights.bold,
    marginBottom: spacing.md,
    color: colors.ink,
  },
  employeeList: {
    maxHeight: 280,
  },
  employeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  employeeIcon: {
    marginRight: spacing.sm,
  },
  employeeName: {
    fontSize: type.sizes.md,
    color: colors.ink,
    flex: 1,
  },
  modalCloseButton: {
    marginTop: spacing.lg,
  },
  optionMenu: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.sm,
    minWidth: 210,
    shadowColor: '#0A1F16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  optionText: {
    marginLeft: spacing.sm,
    fontSize: type.sizes.md,
    color: colors.ink,
  },
});

export default CustomerView;
