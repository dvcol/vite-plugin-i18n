import type { Locale } from '../dist';

declare module 'virtual:vite-plugin-i18n' {
  export const watchLocales: (data: Locale) => void;
  export const locales: Locale;
  export default locales;
}
