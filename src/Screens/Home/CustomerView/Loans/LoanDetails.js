import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Image, Pressable, ScrollView, Modal, Alert } from "react-native";
import { CustomToast, showToast } from "../../../../components/toast/CustomToast";
import { apiCall } from "../../../../components/api/apiUtils";
import * as RNFS from '@dr.pogodin/react-native-fs';
import { Picker } from '@react-native-picker/picker';
import { launchImageLibrary } from 'react-native-image-picker';
import ImageModal from "../../../../components/Image/ImageModal";
import Screen from "../../../../design/components/Screen";
import Card from "../../../../design/components/Card";
import Button from "../../../../design/components/Button";
import TextField from "../../../../design/components/TextField";
import StatusPill from "../../../../design/components/StatusPill";
import EmptyState from "../../../../design/components/EmptyState";
import Skeleton from "../../../../design/components/Skeleton";
import Icon from "../../../../design/Icon";
import { colors, spacing, radius, type } from "../../../../design/tokens";

/**
 * LoanDetails — admin loan detail rebuilt on the "Ink & Amber" design
 * system.
 *  - hero card (loan number, amount, StatusPill, loan ID) + detail rows for
 *    Loan / Repayment / Business sections, and a documents manager with
 *    preview, per-document delete and an "add documents" bottom sheet
 *  - every endpoint preserved exactly: GET loan?loanId=…&includeDocuments,
 *    approve/reject (GET), DELETE loan (with the 5-tap force-delete),
 *    add/delete documents (documentNames[i]/documentTypes[i] multipart),
 *    the 30-minute session expiry, RNFS download into
 *    Downloads/EVI/Documents/<firm>/
 *  - picker values kept verbatim (including the "Goverment" value),
 *    image picker quality stays 0.5
 */

const DOCUMENT_TYPES = [
  { label: 'Id Proof', value: 'Id Proof' },
  { label: 'Bank', value: 'Bank' },
  { label: 'Government', value: 'Goverment' },
  { label: 'Photo', value: 'Photo' },
  { label: 'Signature', value: 'Signature' },
  { label: 'Other', value: 'Other' },
];

const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={[type.body, { color: colors.inkSecondary }]}>{label}</Text>
    <Text numberOfLines={2} style={[type.bodyBold, { color: colors.ink, marginLeft: spacing.md, flex: 1, textAlign: 'right' }]}>
      {value}
    </Text>
  </View>
);

const TypeChip = ({ label }) => (
  <View style={styles.typeChip}>
    <Text style={[type.micro, { color: colors.inkSecondary }]}>{label}</Text>
  </View>
);

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

  const handleDeleteDocument = (documentId) => {
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

      setDocuments((prev) => [...prev, newDocument]);
      setNewDocumentName('');
    } catch (error) {
      showToast('error', 'Error selecting document');
    }
  };

  const handleRemoveDocument = (index) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
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

  const renderUploadModal = () => (
    <Modal
      visible={uploadModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setUploadModalVisible(false)}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={[type.title, { color: colors.ink }]}>Upload Documents</Text>
            <Pressable onPress={() => setUploadModalVisible(false)} hitSlop={8}>
              <Icon name="close" size={20} color={colors.inkSecondary} />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
            <TextField
              label="Document Name"
              value={newDocumentName}
              onChangeText={setNewDocumentName}
              placeholder="Enter document name"
              leftIcon="file"
            />
            <View style={{ marginBottom: spacing.md }}>
              <Text style={[type.caption, { color: colors.inkSecondary, marginBottom: 6 }]}>Document Type</Text>
              <View style={styles.pickerWrap}>
                <Icon name="clipboard" size={20} color={colors.inkMuted} />
                <Picker
                  selectedValue={newDocumentType}
                  onValueChange={(itemValue) => setNewDocumentType(itemValue)}
                  style={styles.picker}
                >
                  {DOCUMENT_TYPES.map((option) => (
                    <Picker.Item key={option.value} label={option.label} value={option.value} />
                  ))}
                </Picker>
                <Icon name="chevron-down" size={18} color={colors.inkMuted} />
              </View>
            </View>

            <Button label="Select Document" icon="upload" variant="outline" full onPress={handleDocumentUpload} />

            {documents.length > 0 && (
              <View style={styles.previewGrid}>
                {documents.map((doc, index) => (
                  <View key={index} style={styles.previewTile}>
                    <Image source={{ uri: doc.uri }} style={styles.previewImage} />
                    <Text numberOfLines={1} style={[type.micro, { color: colors.inkSecondary, marginTop: 4, textAlign: 'center' }]}>
                      {doc.documentName}
                    </Text>
                    <Pressable style={styles.removeBadge} onPress={() => handleRemoveDocument(index)}>
                      <Icon name="close" size={12} color={colors.white} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {documents.length > 0 && (
            <Button
              label="Upload All Documents"
              icon="check-circle"
              variant="accent"
              size="lg"
              full
              loading={uploadingDocument}
              style={{ marginTop: spacing.md }}
              onPress={handleUploadDocuments}
            />
          )}
        </View>
      </View>
      <CustomToast />
    </Modal>
  );

  if (loading) {
    return (
      <Screen scroll bg={colors.bg}>
        <View style={styles.page}>
          <Skeleton width="100%" height={104} radius={radius.lg} />
          <View style={{ height: spacing.md }} />
          <Skeleton width="100%" height={160} radius={radius.lg} />
          <View style={{ height: spacing.md }} />
          <Skeleton width="100%" height={120} radius={radius.lg} />
        </View>
      </Screen>
    );
  }

  if (expired) {
    return (
      <Screen bg={colors.bg}>
        <EmptyState
          icon="clock"
          title="Session expired"
          subtitle="This loan detail view has expired for your safety."
          action={{ label: 'Refresh', icon: 'refresh', variant: 'accent', onPress: fetchLoanDetails }}
          style={{ flex: 1, justifyContent: 'center' }}
        />
        <CustomToast />
      </Screen>
    );
  }

  if (!loanData) {
    return (
      <Screen bg={colors.bg}>
        <EmptyState
          icon="alert-circle"
          title="Couldn't load this loan"
          subtitle="Check your connection, then try again."
          action={{ label: 'Retry', icon: 'refresh', variant: 'accent', onPress: fetchLoanDetails }}
          style={{ flex: 1, justifyContent: 'center' }}
        />
        <CustomToast />
      </Screen>
    );
  }

  return (
    <Screen scroll bg={colors.bg} scrollProps={{ showsVerticalScrollIndicator: false }}>
      <View style={styles.page}>
        <View style={styles.hiddenHit}>
          <Pressable style={styles.hiddenButton} onPress={handleHiddenPress} />
        </View>

        <Card>
          <View style={styles.heroRow}>
            <View style={styles.heroIcon}>
              <Icon name="receipt" size={24} color={colors.accentDeep} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text numberOfLines={1} style={[type.title, { color: colors.ink }]}>
                Loan #{loanData.loanNumber ?? '—'}
              </Text>
              <Text numberOfLines={1} style={[type.sub, { color: colors.inkMuted, marginTop: 2 }]}>
                ID {loanData.uid}
              </Text>
            </View>
            {loanData.status ? <StatusPill status={loanData.status} /> : null}
          </View>
          <View style={styles.heroAmountRow}>
            <Text style={[type.h1, { color: colors.ink }]}>₹{loanData.loanAmount ?? '—'}</Text>
            <Text style={[type.sub, { color: colors.inkMuted, marginLeft: spacing.sm }]}>
              {loanData.loanDuration || '—'}
            </Text>
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Loan Details</Text>
          <View style={styles.sectionBody}>
            <DetailRow label="Loan Number" value={loanData.loanNumber ?? '—'} />
            <DetailRow label="Loan Amount" value={`₹${loanData.loanAmount ?? '—'}`} />
            <DetailRow label="Principal Amount" value={`₹${loanData.principalAmount ?? '—'}`} />
            <DetailRow label="Duration" value={loanData.loanDuration || '—'} />
            <DetailRow label="Interest Rate" value={`${loanData.interestRate ?? '—'}%`} />
            <DetailRow label="Loan Type" value={loanData.loanType || '—'} />
            <DetailRow label="Start Date" value={loanData.loanStartDate ? new Date(loanData.loanStartDate).toLocaleDateString() : '—'} />
            <DetailRow label="End Date" value={loanData.loanEndDate ? new Date(loanData.loanEndDate).toLocaleDateString() : '—'} />
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Repayment Details</Text>
          <View style={styles.sectionBody}>
            <DetailRow label="Installment Amount" value={`₹${loanData.repaymentAmountPerInstallment ?? '—'}`} />
            <DetailRow label="Frequency" value={loanData.installmentFrequency || '—'} />
            <DetailRow label="Number of Installments" value={loanData.numberOfInstallments ?? '—'} />
            <DetailRow label="Total Paid" value={`₹${loanData.totalPaid ?? '—'}`} />
            <DetailRow label="Outstanding Amount" value={`₹${loanData.outstandingAmount ?? '—'}`} />
            <DetailRow label="Total Penalty Amount" value={`₹${loanData.totalPenaltyAmount ?? 0}`} />
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Business Details</Text>
          <View style={styles.sectionBody}>
            <DetailRow label="Firm Name" value={loanData.businessFirmName || "N/A"} />
            <DetailRow label="Business Address" value={loanData.businessAddress || "N/A"} />
            <DetailRow label="Business Phone Number" value={loanData.businessPhone || "N/A"} />
            <DetailRow label="Business Email" value={loanData.businessEmail || "N/A"} />
          </View>
        </Card>

        <Card>
          <View style={styles.docsHeader}>
            <Text style={styles.sectionTitle}>Documents</Text>
            <Button
              label="Add"
              icon="plus"
              variant="outline"
              size="sm"
              onPress={() => setUploadModalVisible(true)}
            />
          </View>
          {(loanData.documents || []).length === 0 ? (
            <Text style={[type.sub, { color: colors.inkMuted, marginTop: spacing.sm }]}>
              No documents attached yet.
            </Text>
          ) : (
            (loanData.documents || []).map((doc, index) => (
              <View
                key={doc?._id || index}
                style={[styles.docRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm, paddingTop: spacing.sm }]}
              >
                <View style={styles.docIcon}>
                  <Icon name="file" size={18} color={colors.infoInk} />
                </View>
                <Pressable style={{ flex: 1, marginLeft: spacing.sm }} onPress={() => openImageModal(doc.documentUrl)}>
                  <Text numberOfLines={1} style={[type.bodyBold, { color: colors.ink }]}>
                    {doc.documentName}
                  </Text>
                  {doc.documentType ? (
                    <View style={{ marginTop: 2 }}>
                      <TypeChip label={doc.documentType} />
                    </View>
                  ) : null}
                </Pressable>
                <Pressable
                  hitSlop={8}
                  style={{ marginLeft: spacing.sm }}
                  disabled={deleteDocumentLoading}
                  onPress={() => handleDeleteDocument(doc._id)}
                >
                  <Icon name="trash" size={20} color={colors.danger} />
                </Pressable>
              </View>
            ))
          )}
        </Card>

        {loanData.status === "Pending" && (
          <View style={styles.actionsRow}>
            <Button label="Approve Loan" icon="check-circle" variant="accent" full style={{ width: '48%' }} onPress={handleApproval} />
            <Button label="Reject Loan" icon="x-circle" variant="danger" full style={{ width: '48%', marginLeft: spacing.md }} onPress={handleRejection} />
          </View>
        )}

        <Button
          label="Delete Loan"
          icon="trash"
          variant="danger"
          full
          loading={deleteLoanLoading}
          style={{ marginTop: spacing.md }}
          onPress={() => handleDelete(loanData._id)}
        />
      </View>

      <ImageModal
        isVisible={imageModalVisible}
        imageUri={currentImage}
        onClose={() => setImageModalVisible(false)}
        onDownload={() => handleDownload(currentImage)}
      />
      {renderUploadModal()}
      <CustomToast />
    </Screen>
  );
};

const styles = StyleSheet.create({
  page: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
    position: 'relative',
  },
  hiddenHit: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 10,
  },
  hiddenButton: {
    width: 50,
    height: 50,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionTitle: {
    ...type.title,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  sectionBody: {
    gap: spacing.sm + 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  typeChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.neutralSoft,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  docsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  docIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.infoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  pickerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: spacing.sm,
  },
  picker: {
    flex: 1,
    height: 54,
    color: colors.ink,
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  previewTile: {
    width: 84,
  },
  previewImage: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    backgroundColor: colors.inkFaint,
  },
  removeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.danger,
    borderRadius: radius.full,
    padding: 4,
  },
});

export default LoanDetails;
