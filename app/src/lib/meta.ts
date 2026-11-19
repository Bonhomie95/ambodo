import { router } from 'expo-router';
import { Share } from 'react-native';
import { locale, t } from './i18n';

/** [SF Symbol, Material Symbol] per event kind / expense category. */
export const KIND_ICON: Record<string, [string, string]> = {
  school: ['graduationcap.fill', 'school'], health: ['cross.case.fill', 'medical_services'],
  activity: ['figure.run', 'sports_soccer'], handoff: ['arrow.left.arrow.right', 'swap_horiz'], other: ['star.fill', 'star'],
};
export const CATEGORY_ICON: Record<string, [string, string]> = {
  school: ['backpack.fill', 'backpack'], health: ['cross.case.fill', 'medical_services'], activities: ['figure.run', 'sports_soccer'],
  clothes: ['tshirt.fill', 'checkroom'], food: ['fork.knife', 'restaurant'], other: ['tag.fill', 'sell'],
};

/** Money in the family's currency (set from the creator's phone), formatted the way this phone writes it. */
export const money = (cents: number, currency = 'USD') => (cents / 100).toLocaleString(locale, { style: 'currency', currency });

/** Connecting a co-parent is part of Ambodo Family, so Free families get the paywall instead of the share sheet. */
export function shareInvite(pro: boolean, code: string, name?: string) {
  if (!pro) return router.push('/plan');
  const join = t('Join our family with code {code} — get the app and tap “{button}”.', { code, button: t('I have a code') });
  return Share.share({ message: name ? `${t('{name} invited you to Ambodo.', { name })} ${join}` : join });
}
