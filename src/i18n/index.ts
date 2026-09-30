import i18n from 'i18next';
import {initReactI18next, useTranslation} from 'react-i18next';
import {brand, type Lang} from '@/brand';
import {readJson, StorageKeys, writeJson} from '@/lib/storage';
import en from './en.json';
import hi from './hi.json';

export const LANGUAGES: {id: Lang; label: string}[] = [
  {id: 'en', label: 'English'},
  {id: 'hi', label: 'हिन्दी'},
].filter(l => brand.languages.includes(l.id as Lang)) as {id: Lang; label: string}[];

const defaultLang: Lang = brand.languages[0] ?? 'en';

i18n.use(initReactI18next).init({
  resources: {en: {translation: en}, hi: {translation: hi}},
  lng: defaultLang,
  fallbackLng: 'en',
  // v3 plural keys don't need Intl.PluralRules, which older Android engines lack.
  compatibilityJSON: 'v3',
  interpolation: {escapeValue: false},
  returnNull: false,
});

/** Restores the saved language. Called once at startup. */
export async function loadSavedLanguage(): Promise<Lang> {
  const saved = await readJson<Lang | null>(StorageKeys.language, null);
  const lang = saved && brand.languages.includes(saved) ? saved : defaultLang;
  if (i18n.language !== lang) {
    await i18n.changeLanguage(lang);
  }
  return lang;
}

export async function setLanguage(lang: Lang): Promise<void> {
  await i18n.changeLanguage(lang);
  await writeJson(StorageKeys.language, lang);
}

export function currentLang(): Lang {
  return (i18n.language as Lang) || defaultLang;
}

/** t() plus the current language, for the formatters. */
export function useI18n() {
  const {t, i18n: instance} = useTranslation();
  return {t, lang: ((instance.language as Lang) || defaultLang) as Lang};
}

export default i18n;
