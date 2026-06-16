import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { findBestLanguageTag } from "react-native-localize";

import ko from "./locales/ko.json";
import en from "./locales/en.json";

const fallbackLanguage = "ko";
const supportedLanguages = ["ko", "en"];
const bestLanguage = findBestLanguageTag(supportedLanguages);
const initialLanguage = bestLanguage?.languageTag ?? fallbackLanguage;

i18n
    .use(initReactI18next)
    .init({
        compatibilityJSON: "v4",
        lng: initialLanguage,
        fallbackLng: fallbackLanguage,
        resources: {
            ko: { translation: ko },
            en: { translation: en },
        },
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;