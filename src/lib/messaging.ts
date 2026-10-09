// Contact actions that hand off to the phone's own apps. Receipts go through
// the SMS app or WhatsApp pre-filled, so the app needs no SMS permission.

import {Linking, Platform} from 'react-native';
import {normalizePhone, whatsappNumber} from './phone';

export {normalizePhone};

async function open(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

export function callPhone(phone: string) {
  return open(`tel:${normalizePhone(phone)}`);
}

export function openSms(phone: string, body?: string) {
  const separator = Platform.OS === 'ios' ? '&' : '?';
  const query = body ? `${separator}body=${encodeURIComponent(body)}` : '';
  return open(`sms:${normalizePhone(phone)}${query}`);
}

export async function openWhatsApp(phone: string, text?: string) {
  const number = whatsappNumber(phone);
  const query = text ? `&text=${encodeURIComponent(text)}` : '';
  // The app URL first; the web link works when WhatsApp isn't installed.
  if (await open(`whatsapp://send?phone=${number}${query}`)) {
    return true;
  }
  return open(`https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`);
}

export function openEmail(email: string) {
  return open(`mailto:${email}`);
}

export function openMaps(address: string) {
  const q = encodeURIComponent(address);
  return open(Platform.OS === 'ios' ? `http://maps.apple.com/?q=${q}` : `geo:0,0?q=${q}`);
}

export function openUrl(url: string) {
  return open(url);
}
