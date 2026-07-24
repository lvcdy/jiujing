import i18n from 'i18next';
import zhCN from './locales/zh-CN';
import enUS from './locales/en-US';

const resources = {
  'zh-CN': {
    translation: zhCN
  },
  'en-US': {
    translation: enUS
  }
};

i18n.init({
  resources,
  lng: localStorage.getItem('language') || 'zh-CN',
  fallbackLng: 'zh-CN',
  interpolation: {
    escapeValue: false
  }
});

export default i18n;
