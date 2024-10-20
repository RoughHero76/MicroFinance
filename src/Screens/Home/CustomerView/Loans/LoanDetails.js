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
  TextInput,
} from "react-native";
import { CustomToast, showToast } from "../../../../components/toast/CustomToast";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { apiCall } from "../../../../components/api/apiUtils";
import * as RNFS from '@dr.pogodin/react-native-fs';
import { Picker } from '@react-native-picker/picker';
import { launchImageLibrary } from 'react-native-image-picker';
import ImageModal from "../../../../components/Image/ImageModal";

const LoanDetails = ({ route, navigation }) => {
  const { loanId } = route.params;
  const [loanData, setLoanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [expired, setExpired] = useState(false);
  const [deleteLoanLoading, setDeleteLoanLoading] = useState(false);
  const [hiddenPressCount, setHiddenPressCount] = useState(0);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);

  // Document-related state
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [deleteDocumentLoading, setDeleteDocumentLoading] = useState(false);
  const [newDocumentName, setNewDocumentName] = useState('');
  const [newDocumentType, setNewDocumentType] = useState('Id Proof');
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    fetchLoanDetails();
    const expirationTimer = setTimeout(() => setExpired(true), 30 * 60 * 1000);
    return () => clearTimeout(expirationTimer);
  }, []);

  const fetchLoanDetails = async () => {
    try {
      const response = await apiCall(`/api/admin/loan?loanId=${loanId}&includeDocuments=true`);
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

  const handleDownload = async (imageUrl) => {
    try {
      const date = new Date();
      const fileName = `loan_document_${date.getTime()}.jpg`;
      const downloadDest = `${RNFS.DownloadDirectoryPath}/EVI/Documents/${loanData.businessFirmName}/${fileName}`;
      const pathCheck = `${RNFS.DownloadDirectoryPath}/EVI/Documents/${loanData.businessFirmName}`;

      const existsCheck = await RNFS.exists(pathCheck);
      if (!existsCheck) {
        await RNFS.mkdir(pathCheck);
      }

      const options = {
        fromUrl: imageUrl,
        toFile: downloadDest,
      };

      const result = await RNFS.downloadFile(options).promise;

      if (result.statusCode === 200) {
        Alert.alert('Success', 'Image downloaded successfully! Check your download folder!');
      } else {
        Alert.alert('Error', 'Failed to download the image.');
      }
    } catch (error) {
      console.error('Error downloading image:', error);
      Alert.alert('Error', 'An error occurred while downloading the image.');
    }
  };

  const handleHiddenPress = useCallback(() => {
    setHiddenPressCount((prevCount) => {
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

  const deleteDocument = async (documentId) => {
    setDeleteDocumentLoading(true);
    try {
      const response = await apiCall(`/api/admin/loan/${loanId}/delete/documents`, 'DELETE', { documentIds: [documentId] });
      console.log(response);
      if (response.status === "success") {
        showToast('success', 'Document deleted successfully');
        fetchLoanDetails();
      } else {
        showToast('error', response.message || 'Error deleting document');
      }
    } catch (error) {
      showToast('error', 'Error deleting document');
    } finally {
      setDeleteDocumentLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId) => {
    Alert.alert('Confirm Document Deletion', 'Are you sure you want to delete this document?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK', onPress: () => deleteDocument(documentId) }
    ]);
  };


  const handleDocumentUpload = async () => {
    try {
      if (!newDocumentName.trim()) {
        showToast('error', 'Error', 'Please enter a document name');
        return;
      }
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.5,
      });

      if (result.didCancel) return;

      if (result.errorCode) {
        showToast('error', 'ImagePicker Error: ' + result.errorMessage);
        return;
      }

      const file = result.assets[0];
      const newDocument = {
        uri: file.uri,
        type: file.type,
        name: file.fileName,
        documentName: newDocumentName,
        documentType: newDocumentType,
      };

      setDocuments([...documents, newDocument]);
      setNewDocumentName('');
    } catch (error) {
      showToast('error', 'Error selecting document');
    }
  };

  const handleRemoveDocument = (index) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const handleUploadDocuments = async () => {
    try {
      setUploadingDocument(true);
      const formData = new FormData();

      documents.forEach((doc, index) => {
        formData.append('documents', {
          uri: doc.uri,
          type: doc.type,
          name: doc.name,
        });
        formData.append(`documentNames[${index}]`, doc.documentName);
        formData.append(`documentTypes[${index}]`, doc.documentType);
      });

      console.log(formData);

      const response = await apiCall(`/api/admin/loan/${loanId}/add/documents`, 'POST', formData, true);
      setUploadingDocument(false);

      if (response.status === "success") {
        showToast('success', 'Documents uploaded successfully');
        setDocuments([]);
        fetchLoanDetails();
        setUploadModalVisible(false);
      } else {
        showToast('error', response.message || 'Error uploading documents');
      }
    } catch (error) {
      setUploadingDocument(false);
      showToast('error', 'Error uploading documents');
    }
  };

  const renderDocumentUploadModal = () => (
    <Modal
      visible={uploadModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setUploadModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Upload Document</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter document name"
            value={newDocumentName}
            onChangeText={setNewDocumentName}
            placeholderTextColor={'#9CA3AF'}
          />
          <Picker
            selectedValue={newDocumentType}
            style={styles.picker}
            onValueChange={(itemValue) => setNewDocumentType(itemValue)}
          >
            <Picker.Item label="Id Proof" value="Id Proof" />
            <Picker.Item label="Bank" value="Bank" />
            <Picker.Item label="Government" value="Goverment" />
            <Picker.Item label="Photo" value="Photo" />
            <Picker.Item label="Signature" value="Signature" />
            <Picker.Item label="Other" value="Other" />
          </Picker>
          <TouchableOpacity style={styles.uploadButton} onPress={handleDocumentUpload}>
            <Icon name="file-upload" size={24} color="#fff" />
            <Text style={styles.uploadButtonText}>Select Document</Text>
          </TouchableOpacity>
          <ScrollView style={styles.imagePreviewContainer}>
            {documents.map((doc, index) => (
              <View key={index} style={styles.uploadedImageContainer}>
                <Image source={{ uri: doc.uri }} style={styles.uploadedImage} />
                <Text style={styles.documentNameText}>{doc.documentName}</Text>
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => handleRemoveDocument(index)}
                >
                  <Icon name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          {documents.length > 0 && (
            <TouchableOpacity
              style={[styles.uploadButton, styles.submitButton]}
              onPress={handleUploadDocuments}
              disabled={uploadingDocument}
            >
              {uploadingDocument ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.uploadButtonText}>Upload All Documents</Text>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.closeButtonDocument}
            onPress={() => setUploadModalVisible(false)}
          >
            <Icon name="close" size={24} color="#4a4a4a" />
          </TouchableOpacity>
        </View>
      </View>
      <CustomToast />

    </Modal>
  );

  const renderDocumentSection = (title, docs) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity
          style={styles.addDocumentButton}
          onPress={() => setUploadModalVisible(true)}
        >
          <Icon name="plus" size={24} color="#4CAF50" />
          <Text style={styles.addDocumentText}>Add Documents</Text>
        </TouchableOpacity>
      </View>
      {docs.map((doc, index) => (
        <View key={index} style={styles.documentItem}>
          <TouchableOpacity
            style={styles.documentInfo}
            onPress={() => openImageModal(doc.documentUrl)}
          >
            <Icon name="file-document-outline" size={24} color="#4a4a4a" />
            <Text style={styles.documentText}>{doc.documentName}</Text>
            <Text style={styles.viewText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteDocumentButton}
            onPress={() => handleDeleteDocument(doc._id)}
            disabled={deleteDocumentLoading}
          >
            {deleteDocumentLoading ? (
              <ActivityIndicator size="small" color="black" />
            ) : (
              <Icon name="delete-outline" size={24} color="#ff0000" />
            )}
          </TouchableOpacity>
        </View>
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


  const renderImageModal = () => (
    <ImageModal
      isVisible={imageModalVisible}
      imageUri={currentImage}
      onClose={() => setImageModalVisible(false)}
      onDownload={() => handleDownload(currentImage)}
    />
  );

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

      {renderImageModal()}
      {renderDocumentUploadModal()}
      <CustomToast />
    </ScrollView>
  );
};

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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333333",
  },
  addDocumentButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addDocumentText: {
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: 'bold',
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
    justifyContent: "space-between",
  },
  documentInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
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
    marginRight: 12,
  },
  deleteDocumentButton: {
    padding: 8,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: 'black'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    marginBottom: 15,
    color: 'black'
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    marginBottom: 15,
    color: 'black'
  },
  uploadButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  uploadButtonText: {
    color: '#ffffff',
    marginLeft: 10,
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  uploadedImageContainer: {
    margin: 5,
    alignItems: 'center',
  },
  uploadedImage: {
    width: 100,
    height: 100,
    borderRadius: 4,
  },
  documentNameText: {
    marginTop: 5,
    fontSize: 12,
    color: 'black',
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'red',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  closeButtonDocument: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
  },
  closeButtonText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 16,
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