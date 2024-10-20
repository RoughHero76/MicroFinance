import React from 'react';
import { View, Modal, TouchableOpacity, StyleSheet, Dimensions, Image } from 'react-native';
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import ImageZoomPan from './ImageZoomPan';
import { gestureHandlerRootHOC } from "react-native-gesture-handler";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const ImageModal = ({ isVisible, imageUri, onClose, onDownload }) => {
    const ModalContent = gestureHandlerRootHOC(({ closeModal, downloadImage }) => (
        <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                <Icon name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
            <View style={styles.imageContainer}>
                {typeof imageUri === 'string' ? (
                    <ImageZoomPan imageUri={imageUri} />
                ) : (
                    <Image source={imageUri} style={styles.image} resizeMode="contain" />
                )}
            </View>
            <TouchableOpacity style={styles.downloadButton} onPress={downloadImage}>
                <Icon name="download" size={24} color="#ffffff" />
            </TouchableOpacity>
        </View>
    ));

    return (
        <Modal visible={isVisible} transparent={true} onRequestClose={onClose}>
            <ModalContent
                closeModal={onClose}
                downloadImage={onDownload}
            />
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageContainer: {
        width: screenWidth,
        height: screenHeight * 0.8,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    closeButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: 10,
        borderRadius: 25,
    },
    downloadButton: {
        position: 'absolute',
        bottom: 40,
        right: 20,
        zIndex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: 10,
        borderRadius: 25,
    },
});

export default ImageModal;