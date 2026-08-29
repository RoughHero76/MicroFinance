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
  Alert,
} from "react-native";
import { CustomToast, showToast } from "../../../../components/toast/CustomToast";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { apiCall } from "../../../../components/api/apiUtils";
import * as RNFS from '@dr.pogodin/react-native-fs';
import { Picker } from '@react-native-picker/picker';
import { launchImageLibrary } from 'react-native-image-picker';
import ImageModal from "../../../../components/Image/ImageModal";
import { colors, spacing, type, radii, shadow } from "../../../../theme/tokens";
import EviCard from "../../../../components/ui/EviCard";
import EviButton from "../../../../components/ui/EviButton";
import EviTextField from "../../../../components/ui/EviTextField";
import StatusBadge from "../../../../components/ui/StatusBadge";
import EmptyState from "../../../../components/ui/EmptyState";

const LoanDetails = ({ route, navigation }) => {
  const { loanId } = route.params || {};
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
      if (response.status === 'success' && response.data?.[0]) {
        setLoanData(response.data[0]);
        showToast('success', 'Loan fetched successfully');
      } else {
        showToast('error', response.message || 'Failed to fetch loan details');
      }
      setLoading(false);
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
          <EviTextField
            label="Document Name"
            value={newDocumentName}
            onChangeText={setNewDocumentName}
            placeholder="Enter document name"
            mode="flat"
          />
          <View style={styles.field}>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={newDocumentType}
                onValueChange={(itemValue) => setNewDocumentType(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Id Proof" value="Id Proof" />
                <Picker.Item label="Bank" value="Bank" />
                <Picker.Item label="Government" value="Goverment" />
                <Picker.Item label="Photo" value="Photo" />
                <Picker.Item label="Signature" value="Signature" />
                <Picker.Item label="Other" value="Other" />
              </Picker>
            </View>
          </View>
          <EviButton
            title="Select Document"
            onPress={handleDocumentUpload}
            icon="file-upload"
            variant="secondary"
            size="lg"
            style={styles.selectDocumentButton}
          />
          <ScrollView style={styles.imagePreviewContainer}>
            {documents.map((doc, index) => (
              <View key={index} style={styles.uploadedImageContainer}>
                <Image source={{ uri: doc.uri }} style={styles.uploadedImage} />
                <Text style={styles.documentNameText}>{doc.documentName}</Text>
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => handleRemoveDocument(index)}
                >
                  <Icon name="close" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          {documents.length > 0 && (
            <EviButton
              title="Upload All Documents"
              onPress={handleUploadDocuments}
              loading={uploadingDocument}
              icon="upload"
              variant="primary"
              size="lg"
              style={styles.submitUploadButton}
            />
          )}
          <TouchableOpacity onPress={() => setUploadModalVisible(false)} style={styles.closeChip}>
            <Icon name="close" size={20} color={colors.inkSoft} />
          </TouchableOpacity>
        </View>
      </View>
      <CustomToast />

    </Modal>
  );

  const renderDocumentSection = (title, docs) => (
    <EviCard style={styles.section} elevated={false} padding={spacing.lg}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity
          style={styles.addDocumentButton}
          onPress={() => setUploadModalVisible(true)}
          activeOpacity={0.7}
        >
          <Icon name="plus" size={18} color={colors.brand} />
          <Text style={styles.addDocumentText}>Add Documents</Text>
        </TouchableOpacity>
      </View>
      {docs.map((doc, index) => (
        <View key={index} style={styles.documentItem}>
          <TouchableOpacity
            style={styles.documentInfo}
            onPress={() => openImageModal(doc.documentUrl)}
            activeOpacity={0.7}
          >
            <View style={styles.docIconChip}>
              <Icon name="file-document-outline" size={18} color={colors.brand} />
            </View>
            <Text style={styles.documentText}>{doc.documentName}</Text>
            <Text style={styles.viewText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteDocumentButton}
            onPress={() => handleDeleteDocument(doc._id)}
            disabled={deleteDocumentLoading}
          >
            {deleteDocumentLoading ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <Icon name="delete-outline" size={20} color={colors.danger} />
            )}
          </TouchableOpacity>
        </View>
      ))}
    </EviCard>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (expired) {
    return (
      <View style={styles.centerContainer}>
        <EmptyState
          icon="timer-outline"
          title="View expired"
          message="This loan detail view has expired. Refresh to load it again."
          actionLabel="Refresh"
          onAction={fetchLoanDetails}
        />
      </View>
    );
  }

  if (!loanData) {
    return (
      <View style={styles.centerContainer}>
        <EmptyState
          icon="alert-circle-outline"
          title="Failed to load loan details"
          actionLabel="Refresh"
          onAction={fetchLoanDetails}
        />
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
    <EviCard style={styles.section} elevated={false} padding={spacing.lg}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item, index) => (
        <View key={index} style={styles.detailItem}>
          <Text style={styles.detailLabel}>{item.label}</Text>
          <Text style={styles.detailValue}>{item.value}</Text>
        </View>
      ))}
    </EviCard>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.loanId}>Loan #{loanData.uid}</Text>
        <StatusBadge status={loanData.status} />
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
          <EviButton
            title="Approve Loan"
            onPress={handleApproval}
            icon="check-circle"
            variant="primary"
            size="lg"
            style={styles.actionButton}
          />
          <EviButton
            title="Reject Loan"
            onPress={handleRejection}
            icon="close-circle"
            variant="danger"
            size="lg"
            style={styles.actionButton}
          />
        </View>
      )}

      <View style={styles.actionContainer}>
        <EviButton
          title="Delete Loan"
          onPress={() => handleDelete(loanData._id)}
          loading={deleteLoanLoading}
          disabled={deleteLoanLoading}
          icon="delete-outline"
          variant="danger"
          size="lg"
          style={styles.actionButton}
        />
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
    backgroundColor: colors.surface,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  loanId: {
    fontSize: type.sizes.lg,
    fontWeight: type.weights.bold,
    color: colors.ink,
    flex: 1,
  },
  section: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: type.sizes.lg,
    fontWeight: type.weights.bold,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  addDocumentButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addDocumentText: {
    color: colors.brand,
    marginLeft: spacing.xs,
    fontWeight: type.weights.bold,
    fontSize: type.sizes.sm,
  },
  detailItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  detailLabel: {
    fontSize: type.sizes.md,
    color: colors.inkSoft,
    flexShrink: 1,
  },
  detailValue: {
    fontSize: type.sizes.md,
    fontWeight: type.weights.semibold,
    color: colors.ink,
    textAlign: 'right',
    flexShrink: 1,
  },
  documentItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    justifyContent: "space-between",
  },
  documentInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  docIconChip: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    backgroundColor: colors.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  documentText: {
    fontSize: type.sizes.md,
    color: colors.ink,
    flex: 1,
  },
  viewText: {
    fontSize: type.sizes.sm,
    color: colors.brand,
    fontWeight: type.weights.bold,
    marginRight: spacing.md,
  },
  deleteDocumentButton: {
    padding: spacing.sm,
  },
  actionContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(10, 31, 22, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing.xl,
    width: '92%',
    maxHeight: '85%',
    overflow: 'hidden',
    ...shadow.card,
  },
  modalTitle: {
    fontSize: type.sizes.xl,
    fontWeight: type.weights.bold,
    color: colors.ink,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  field: {
    marginBottom: spacing.lg,
  },
  pickerWrap: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  picker: {
    height: 52,
    color: colors.ink,
  },
  selectDocumentButton: {
    marginBottom: spacing.lg,
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.lg,
  },
  uploadedImageContainer: {
    margin: spacing.xs,
    alignItems: 'center',
  },
  uploadedImage: {
    width: 100,
    height: 100,
    borderRadius: radii.sm,
  },
  documentNameText: {
    marginTop: spacing.xs,
    fontSize: type.sizes.xs,
    color: colors.inkSoft,
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.danger,
    borderRadius: radii.pill,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitUploadButton: {
    marginTop: spacing.xs,
  },
  closeChip: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
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
