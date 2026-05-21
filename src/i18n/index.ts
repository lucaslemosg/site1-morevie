import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "./locales/en/common.json";
import ptBRCommon from "./locales/pt-BR/common.json";

export const defaultNS = "common";
export const fallbackLng = "en";

i18n.use(initReactI18next).init({
  lng: navigator.language,
  fallbackLng,
  defaultNS,
  resources: {
    en: { common: enCommon },
    "pt-BR": { common: ptBRCommon },
  },
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
