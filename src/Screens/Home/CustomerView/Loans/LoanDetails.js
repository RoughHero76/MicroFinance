import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Dimensions,
} from "react-native";
import { showToast } from "../../../../components/toast/CustomToast";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { apiCall } from "../../../../components/api/apiUtils";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const LoanDetails = ({ route, navigation }) => {
  const { loanId } = route.params;
  const [loanData, setLoanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    fetchLoanDetails();
    const expirationTimer = setTimeout(() => {
      setExpired(true);
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearTimeout(expirationTimer);
  }, []);

  const fetchLoanDetails = async () => {
    try {
      const response = await apiCall(`/api/admin/loan?loanId=${loanId}`);
      setLoanData(response.data[0]);
      organizeDocuments(response.data[0].documents);
      setLoading(false);
      showToast('success', 'Loan fetched successfully');
    } catch (error) {
      showToast('error', 'Something went wrong');
      setLoading(false);
    }
  };

  const organizeDocuments = (docs) => {
    let allDocs = [];
    if (docs.stampPaperPhotoLink) allDocs.push({ url: docs.stampPaperPhotoLink, title: "Stamp Paper" });
    if (docs.promissoryNotePhotoLink) allDocs.push({ url: docs.promissoryNotePhotoLink, title: "Promissory Note" });
    if (docs.blankPaper) allDocs.push({ url: docs.blankPaper, title: "Blank Paper" });
    docs.cheques.forEach((cheque, index) => {
      allDocs.push({ url: cheque.photoLink, title: `Cheque ${index + 1}` });
    });
    docs.governmentIds.forEach((id) => {
      allDocs.push({ url: id.frontPhotoLink, title: `${id.type} Front` });
      allDocs.push({ url: id.backPhotoLink, title: `${id.type} Back` });
    });
    setDocuments(allDocs);
  };

  const handleApproval = async () => {
    try {
      const response = await apiCall(`/api/admin/loan/approve/${loanId}`, 'POST');
      if (response.status === 200) {
        showToast('success', 'Loan approved');
        navigation.goBack();
      } else {
        showToast('error', 'Error approving loan');
      }
    } catch (error) {
      showToast('error', 'Error approving loan');
    }
  };

  const handleRejection = async () => {
    try {
      const response = await apiCall(`/api/admin/loan/reject/${loanId}`, 'POST');
      if (response.status === 200) {
        showToast('success', 'Loan rejected');
        navigation.goBack();
      } else {
        showToast('error', 'Error rejecting loan');
      }
    } catch (error) {
      
    }
  };

  const openImageModal = (imageUrl) => {
    setCurrentImage(imageUrl);
    setImageModalVisible(true);
  };

  const renderDocumentSection = (title, docs) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {docs.map((doc, index) => (
        <TouchableOpacity
          key={index}
          style={styles.documentItem}
          onPress={() => openImageModal(doc.url)}
        >
          <Icon name="file-document-outline" size={24} color="#4a4a4a" />
          <Text style={styles.documentText}>{doc.title}</Text>
          <Text style={styles.viewText}>View</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (expired) {
    return (
      <View style={styles.expiredContainer}>
        <Text style={styles.expiredText}>This loan detail view has expired.</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchLoanDetails} disabled={true}>
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!loanData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load loan details</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.loanId}>Loan ID: {loanData.uid}</Text>
        <View style={[styles.statusContainer, { backgroundColor: loanData.status === "Pending" ? "#FFA500" : "#4CAF50" }]}>
          <Text style={styles.status}>{loanData.status}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Loan Details</Text>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Loan Amount</Text>
          <Text style={styles.detailValue}>₹{loanData.loanAmount}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Principal Amount</Text>
          <Text style={styles.detailValue}>₹{loanData.principalAmount}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Duration</Text>
          <Text style={styles.detailValue}>{loanData.loanDuration}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Interest Rate</Text>
          <Text style={styles.detailValue}>{loanData.interestRate}%</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Loan Type</Text>
          <Text style={styles.detailValue}>{loanData.loanType}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Start Date</Text>
          <Text style={styles.detailValue}>{new Date(loanData.loanStartDate).toLocaleDateString()}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>End Date</Text>
          <Text style={styles.detailValue}>{new Date(loanData.loanEndDate).toLocaleDateString()}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Repayment Details</Text>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Installment Amount</Text>
          <Text style={styles.detailValue}>₹{loanData.repaymentAmountPerInstallment}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Frequency</Text>
          <Text style={styles.detailValue}>{loanData.installmentFrequency}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Number of Installments</Text>
          <Text style={styles.detailValue}>{loanData.numberOfInstallments}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Total Paid</Text>
          <Text style={styles.detailValue}>₹{loanData.totalPaid}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Outstanding Amount</Text>
          <Text style={styles.detailValue}>₹{loanData.outstandingAmount}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Total Penalty Amount</Text>
          <Text style={styles.detailValue}>₹{loanData.totalPenaltyAmount || 0}</Text>
        </View>
      </View>

      {renderDocumentSection("Government IDs", documents.filter(doc => doc.title.includes("Aadhar") || doc.title.includes("PAN")))}
      {renderDocumentSection("Cheques", documents.filter(doc => doc.title.includes("Cheque")))}
      {renderDocumentSection("Other Documents", documents.filter(doc => !doc.title.includes("Aadhar") && !doc.title.includes("PAN") && !doc.title.includes("Cheque")))}

      {loanData.status === "Pending" && (
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.approveButton} onPress={handleApproval}>
            <Text style={styles.buttonText}>Approve Loan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectButton} onPress={handleRejection}>
            <Text style={styles.buttonText}>Reject Loan</Text>
          </TouchableOpacity>
        </View>
      )}

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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
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
  },
  errorText: {
    fontSize: 18,
    color: "red",
  },
  header: {
    flexDirection: "column",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  loanId: {
    fontSize: 12,
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
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    elevation: 2,
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
  },
  approveButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  rejectButton: {
    backgroundColor: "#F44336",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
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
  expiredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  expiredText: {
    fontSize: 18,
    color: '#333333',
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});


export default LoanDetails;