import { useColorScheme } from 'react-native';

export const brand = { coral: '#FF6B5B', teal: '#2EC4B6', sun: '#FFC94A', ink: '#141A33', ink2: '#2B2F63', cream: '#FFF6EC' };

const light = {
  bg: '#FFF8F1', card: '#FFFFFF', text: '#141A33', muted: '#6E7189', line: '#EFE4D8', soft: '#F7EDE2',
  me: '#FF6B5B', them: '#17A396', sun: '#F2B022', danger: '#E5484D', good: '#2F9E6A', onAccent: '#FFFFFF',
};
const dark: typeof light = {
  bg: '#0D1124', card: '#171C36', text: '#F6F2EA', muted: '#9DA1BA', line: '#262B4B', soft: '#1E2442',
  me: '#FF7B6C', them: '#3FD3C4', sun: '#FFD166', danger: '#FF6369', good: '#4CC38A', onAccent: '#0D1124',
};
export type Palette = typeof light;
export const useColors = (): Palette => (useColorScheme() === 'dark' ? dark : light);

export const font = {
  display: 'Fraunces_600SemiBold',
  italic: 'Fraunces_600SemiBold_Italic',
  body: 'Manrope_500Medium',
  semi: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  heavy: 'Manrope_800ExtraBold',
};

/** Translucent tint of a hex colour, e.g. tint('#FF6B5B', 0.18). */
export const tint = (hex: string, alpha: number) =>
  `${hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
