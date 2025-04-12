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

const CustomerView = () => {
  const [customerData, setCustomerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profilePicUploadLoading, setProfilePicUploadLoading] = useState(false);
  //const [employees, setEmployees] = useState([]);
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


  const openOptionModal = (event) => {
    const { pageY, pageX } = event.nativeEvent;
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


  const navigation = useNavigation();
  const route = useRoute();
  const { uid } = route.params;

  useEffect(() => {
    fetchCustomerData(uid);
    //fetchEmployees();
  }, [uid]);

  const fetchCustomerData = async (uid) => {
    try {
      setLoading(true);
      const response = await apiCall(`/api/admin/customer?uid=${uid}`, "GET");
      if (response.status === "success") {
        setCustomerData(response.data[0]);
      } else {
        showToast("error", "Error", response.message || "Failed to fetch customer data");
      }
    } catch (error) {
      console.error("Error fetching customer data:", error);
      setErrorView(true);
    } finally {
      setLoading(false);
    }
  };
  /*   const fetchEmployees = async () => {
      try {
        const response = await apiCall('/api/admin/employee', 'GET');
        if (response.status === 'success') {
          setEmployees(response.data);
        } else {
          showToast("error", "Error", response.message || "Failed to fetch employees");
          setErrorView(true);
        }
      } catch (error) {
        console.error("Error fetching employees:", error);
        showToast("error", "Error", "Failed to fetch employees");
      }
    }; */

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

  if (errorView) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Failed to fetch customer data. Please try again later.</Text>
      </View>
    );
  }


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
          {profilePicUploadLoading ? (
            <ActivityIndicator size="small" color="#4CAF50" />
          ) : (
            <TouchableOpacity onPress={() => handleImageOpen()}>
              <Image
                source={imageSource}
                style={styles.profileImage}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={handleImagePicker}>
            <View style={styles.editIconContainer}>

              <Icon name="pencil" size={16} color="#FFFFFF" />
            </View>

          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.customerName}>
              {customerData.fname} {customerData.lname}
            </Text>
            <Text style={styles.customerUsername}>@{customerData.userName}</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => fetchCustomerData(uid)}
          >
            <Icon name="refresh" size={24} color="#4CAF50" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.editButton}
            onPress={openOptionModal}
          >
            <Icon name="dots-vertical" size={24} color="#4CAF50" />
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <InfoItem icon="email" label="Email" value={customerData.email} />
          <InfoItem icon="phone" label="Phone" value={customerData.phoneNumber} />
          <InfoItem
            icon="map-marker"
            label="Address"
            value={`${customerData.address}, ${customerData.city}, ${customerData.state}, ${customerData.country}`}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Loans</Text>
          <TouchableOpacity style={styles.addLoanButton} onPress={handleAddLoan}>
            <Icon name="plus" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {customerData.loans.length > 0 ? (
          customerData.loans.map((loan) => (
            <View key={loan._id} style={styles.loanCard}>
              <View style={styles.loanHeader}>
                <Text style={styles.loanAmount}>₹{loan.loanAmount}</Text>
                <Text style={styles.loanNumber}>Loan Number: #{loan.loanNumber}</Text>

                <LoanStatus status={loan.status} />
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
              <View style={styles.loanButtonsContainer}>
                <TouchableOpacity
                  style={[styles.loanButton, styles.scheduleButton]}
                  onPress={() => handleRepaymentSchedule(loan._id)}
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
                >
                  <Text style={styles.loanButtonText}>Details</Text>
                </TouchableOpacity>
                {
                  loan.status === "Closed" ? null : (
                    <TouchableOpacity
                      style={[styles.loanButton, styles.assignButton]}
                      onPress={() => handleAssignEmployee(loan._id)}
                    >
                      <Text style={styles.loanButtonText}>
                        {loan.assignedTo ? "Reassign" : "Assign"}
                      </Text>
                    </TouchableOpacity>
                  )
                }


              </View>
              {
                loan.status === "Closed" ? (
                  <View style={styles.loanButtonsContainer}>

                    <Text style={styles.loanButtonText}>Closed</Text>
                  </View>
                ) : (
                  <View style={styles.loanButtonsContainer}>
                    <TouchableOpacity
                      style={[styles.loanButton, styles.closeButton]}
                      onPress={() => handleCloseLoan(loan._id)}
                    >
                      <Text style={styles.loanButtonText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                )
              }
            </View>
          ))
        ) : (
          <Text style={styles.noLoansText}>No loans found</Text>
        )}
      </ScrollView>
      <CustomToast />
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Assign Employee</Text>
            <ScrollView>
              {employees?.map((employee) => (
                <TouchableOpacity
                  key={employee._id}
                  style={styles.employeeItem}
                  onPress={() => assignEmployee(employee._id)}
                >
                  <Text style={styles.employeeName}>
                    {employee.fname} {employee.lname}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={optionModalVisible}
        onRequestClose={closeOptionModal}
      >
        <TouchableOpacity
          style={styles.optionModalContainer}
          activeOpacity={1}
          onPress={closeOptionModal}
        >
          <View style={[styles.modalContent, { position: 'absolute', top: optionModalPosition.top, right: optionModalPosition.right }]}>
            <TouchableOpacity style={styles.option} onPress={handleEditCustomer}>
              <Icon name="account-edit" size={24} color="#4CAF50" />
              <Text style={styles.optionText}>Edit Customer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.option} onPress={handleDeleteCustomer}>
              <Icon name="account-remove" size={24} color="#4CAF50" />
              <Text style={styles.optionText}>Delete Customer</Text>
            </TouchableOpacity>
          </View>
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
    <TouchableOpacity onPress={() => handleInfoIconPress(icon, value)}
      style={styles.infoIcon}
    >
      <Icon name={icon} size={24} color="#4CAF50" style={styles.infoIcon} />
    </TouchableOpacity>
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
  editIconContainer: {
    position: 'absolute',
    top: 10,
    right: 0,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 4,
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
  customerUsername: {
    fontSize: 16,
    color: "#666",
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
  assignedEmployee: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "bold",
    marginTop: 5,
  },
  noAssignment: {
    fontSize: 14,
    color: "#F44336",
    fontWeight: "bold",
    marginTop: 5,
  },
  assignButton: {
    backgroundColor: "#9C27B0",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },

  modalContainerAssignEmployee: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },

  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    width: "80%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  employeeItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",

  },
  employeeName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#4CAF50",
    borderRadius: 5,
    alignItems: "center",
  },
  closeButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  errorText: {
    fontSize: 16,
    color: "red",
    textAlign: "center",
    marginTop: 20,
  },
  optionModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  optionText: {
    marginLeft: 10,
    fontSize: 16,
    color: 'black',
  },
});

export default CustomerView;