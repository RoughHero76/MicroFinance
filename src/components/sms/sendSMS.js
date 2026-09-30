// Old screens call handleSendSMS after a payment or penalty. The native SMS
// module is gone (no SMS permission any more): this opens the phone's SMS
// app with the text filled in, and the employee taps Send.
import { openSms } from '@/lib/messaging';

export const handleSendSMS = async (phoneNumber, message) => {
    await openSms(phoneNumber, message);
};
