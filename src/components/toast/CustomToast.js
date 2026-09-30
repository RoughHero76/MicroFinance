// src/components/toast/CustomToast.js
//
// Compatibility layer for the old screens (removed in W6): showToast() now
// goes to the app's single ToastHost (style A pill). Screen-level
// <CustomToast /> copies are gone; inside a React Native <Modal> (a separate
// window on Android) old screens render <ModalToast /> so toasts stay visible.

import React from 'react';
import { toast, ToastHost } from '@/ui';

export const showToast = (type, text1, text2) => {
    const title = text1 || text2 || '';
    const options = text1 && text2 ? { message: String(text2) } : undefined;
    if (type === 'error') {
        toast.error(String(title), options);
    } else if (type === 'success') {
        toast.success(String(title), options);
    } else {
        toast.info(String(title), options);
    }
};

// Some old screens call the library directly: Toast.show({type, text1, text2}).
export const Toast = {
    show: ({ type, text1, text2 } = {}) => showToast(type, text1, text2),
    hide: () => toast.hide(),
};

export const ModalToast = () => <ToastHost />;

export const CustomToast = () => null;

export default CustomToast;
