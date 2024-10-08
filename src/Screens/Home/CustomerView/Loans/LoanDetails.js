import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  Alert,
} from "react-native";
import { CustomToast, showToast } from "../../../../components/toast/CustomToast";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { apiCall } from "../../../../components/api/apiUtils";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const LoanDetails = ({ route, navigation }) => {
  const { loanId } = route.params;
  const [loanData, setLoanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [expired, setExpired] = useState(false);
  const [deleteLoanLoading, setDeleteLoanLoading] = useState(false);
  const [hiddenPressCount, setHiddenPressCount] = useState(0);

  useEffect(() => {
    fetchLoanDetails();
    const expirationTimer = setTimeout(() => setExpired(true), 30 * 60 * 1000);
    return () => clearTimeout(expirationTimer);
  }, []);

  const fetchLoanDetails = async () => {
    try {
      const response = await apiCall(`/api/admin/loan?loanId=${loanId}`);
      setLoanData(response.data[0]);
      setLoading(false);
      showToast('success', 'Loan fetched successfully');
    } catch (error) {
      showToast('error', 'Something went wrong');
      setLoading(false);
    }
  };

  const handleApproval = async () => {
    try {
      const response = await apiCall(`/api/admin/loan/approve?loanId=${loanId}`);
      if (response.status === "success") {
        showToast('success', response.message || 'Loan approved');
        navigation.goBack();
      } else {
        showToast('error', response.message || 'Error approving loan');
      }
    } catch (error) {
      showToast('error', 'Error approving loan');
    }
  };

  const handleDelete = async (_id, forceDelete = false) => {
    try {
      setDeleteLoanLoading(true);
      const url = forceDelete
        ? `/api/admin/loan?loanId=${_id}&force=true`
        : `/api/admin/loan?loanId=${_id}`;
      const response = await apiCall(url, 'DELETE');
      if (response.status === "success") {
        showToast('success', response.message || 'Loan deleted');
        navigation.goBack();
      } else {
        Alert.alert('Error', response.message || 'Error deleting loan');
      }
    } catch (error) {
      showToast('error', 'Error deleting loan');
    } finally {
      setDeleteLoanLoading(false);
    }
  };

  const handleRejection = async () => {
    try {
      const response = await apiCall(`/api/admin/loan/reject?loanId=${loanId}`);
      if (response.status === "success") {
        showToast('success', response.message || 'Loan rejected');
        navigation.goBack();
      } else {
        showToast('error', response.message || 'Error rejecting loan');
      }
    } catch (error) {
      showToast('error', 'Error rejecting loan');
    }
  };

  const openImageModal = (imageUrl) => {
    setCurrentImage(imageUrl);
    setImageModalVisible(true);
  };

  const handleHiddenPress = useCallback(() => {
    setHiddenPressCount((prevCount) => {
      console.log("Hidden press count:", prevCount);
      const newCount = prevCount + 1;
      if (newCount === 5) {
        Alert.alert(
          "Force Delete Activated",
          "The loan will be forcefully deleted. Are you sure?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "OK", onPress: () => handleDelete(loanData._id, true) }
          ]
        );
        return 0;
      }
      return newCount;
    });
  }, [loanData]);

  const renderDocumentSection = (title, docs) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {docs.map((doc, index) => (
        <TouchableOpacity
          key={index}
          style={styles.documentItem}
          onPress={() => openImageModal(doc.documentUrl)}
        >
          <Icon name="file-document-outline" size={24} color="#4a4a4a" />
          <Text style={styles.documentText}>{doc.documentName}</Text>
          <Text style={styles.viewText}>View</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (expired) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.messageText}>This loan detail view has expired.</Text>
        <TouchableOpacity style={styles.button} onPress={fetchLoanDetails}>
          <Text style={styles.buttonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!loanData) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.messageText}>Failed to load loan details</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.loanId}>Loan ID: {loanData.uid}</Text>
        <View style={[styles.statusContainer, { backgroundColor: loanData.status === 'Active' ? '#28a745' : '#dc3545' }]}>
          <Text style={styles.status}>{loanData.status}</Text>
        </View>
        <TouchableOpacity onPress={handleHiddenPress} style={styles.hiddenButton} />
      </View>

       

      {renderSection("Loan Details", [
        { label: "Loan Number", value: loanData.loanNumber },
        { label: "Loan Amount", value: `₹${loanData.loanAmount}` },
        { label: "Principal Amount", value: `₹${loanData.principalAmount}` },
        { label: "Duration", value: loanData.loanDuration },
        { label: "Interest Rate", value: `${loanData.interestRate}%` },
        { label: "Loan Type", value: loanData.loanType },
        { label: "Start Date", value: new Date(loanData.loanStartDate).toLocaleDateString() },
        { label: "End Date", value: new Date(loanData.loanEndDate).toLocaleDateString() },
      ])}

      {renderSection("Repayment Details", [
        { label: "Installment Amount", value: `₹${loanData.repaymentAmountPerInstallment}` },
        { label: "Frequency", value: loanData.installmentFrequency },
        { label: "Number of Installments", value: loanData.numberOfInstallments },
        { label: "Total Paid", value: `₹${loanData.totalPaid}` },
        { label: "Outstanding Amount", value: `₹${loanData.outstandingAmount}` },
        { label: "Total Penalty Amount", value: `₹${loanData.totalPenaltyAmount}` },
      ])}

      {renderSection("Business Details", [
        { label: "Firm Name", value: loanData.businessFirmName || "N/A" },
        { label: "Business Address", value: loanData.businessAddress || "N/A" },
        { label: "Business Phone Number", value: loanData.businessPhone || "N/A" },
        { label: "Business Email", value: loanData.businessEmail || "N/A" },
      ])}

      {renderDocumentSection("Documents", loanData.documents)}

      {loanData.status === "Pending" && (
        <View style={styles.actionContainer}>
          <TouchableOpacity style={[styles.button, styles.approveButton]} onPress={handleApproval}>
            <Text style={styles.buttonText}>Approve Loan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.rejectButton]} onPress={handleRejection}>
            <Text style={styles.buttonText}>Reject Loan</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.actionContainer}>
        {deleteLoanLoading ? (
          <ActivityIndicator size="small" color="#0000ff" />
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={() => handleDelete(loanData._id)}
            disabled={deleteLoanLoading}
          >
            <Text style={styles.buttonText}>Delete Loan</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={imageModalVisible} transparent={true} onRequestClose={() => setImageModalVisible(false)}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={() => setImageModalVisible(false)}>
            <Icon name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Image
            source={{ uri: currentImage }}
            style={styles.modalImage}
            resizeMode="contain"
          />
        </View>
      </Modal>
      <CustomToast />
    </ScrollView>
  );
};

const renderSection = (title, items) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {items.map((item, index) => (
      <View key={index} style={styles.detailItem}>
        <Text style={styles.detailLabel}>{item.label}</Text>
        <Text style={styles.detailValue}>{item.value}</Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  messageText: {
    fontSize: 18,
    color: "#333333",
    marginBottom: 20,
  },
  header: {
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  loanId: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333333",
  },
  statusContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  status: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#ffffff",
  },
  section: {
    backgroundColor: "#ffffff",
    marginVertical: 8,
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333333",
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 16,
    color: "#555555",
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333333",
  },
  documentItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  documentText: {
    fontSize: 16,
    color: "#333333",
    marginLeft: 12,
    flex: 1,
  },
  viewText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "bold",
  },
  actionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
    justifyContent: "center",
    alignContent: "center",
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveButton: {
    backgroundColor: "#4CAF50",
    marginRight: 8,
  },
  rejectButton: {
    backgroundColor: "#F44336",
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: "#FF0000",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: screenWidth,
    height: screenHeight * 0.8,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
  },
  hiddenButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 50,
    height: 50,
    zIndex: 10,
  },
});

export default LoanDetails;