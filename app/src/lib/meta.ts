import { Share } from 'react-native';

/** [SF Symbol, Material Symbol] per event kind / expense category. */
export const KIND_ICON: Record<string, [string, string]> = {
  school: ['graduationcap.fill', 'school'], health: ['cross.case.fill', 'medical_services'],
  activity: ['figure.run', 'sports_soccer'], handoff: ['arrow.left.arrow.right', 'swap_horiz'], other: ['star.fill', 'star'],
};
export const CATEGORY_ICON: Record<string, [string, string]> = {
  school: ['backpack.fill', 'backpack'], health: ['cross.case.fill', 'medical_services'], activities: ['figure.run', 'sports_soccer'],
  clothes: ['tshirt.fill', 'checkroom'], food: ['fork.knife', 'restaurant'], other: ['tag.fill', 'sell'],
};

export const money = (cents: number) =>
  (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' }); // ponytail: USD only; localize with the family's currency later

export function shareInvite(code: string, name?: string) {
  return Share.share({ message: `${name ? `${name} invited you to Ambodo. ` : ''}Join our family with code ${code} — get the app and tap “I have a code”.` });
}
