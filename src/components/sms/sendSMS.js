import { NativeModules } from 'react-native';

const { SMSModule } = NativeModules;


export const handleSendSMS = async (phoneNumber, message) => {
    try {
        const result = await SMSModule.sendSMS(phoneNumber, message)
        console.log('SMS send result:', result);
    } catch (error) {
        console.error('Error sending SMS:', error);

    }
};


