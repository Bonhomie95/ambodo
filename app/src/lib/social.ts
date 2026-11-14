import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { GoogleOneTapSignIn, isSuccessResponse } from 'react-native-nitro-google-signin';

// Public OAuth client IDs (Google Cloud project "ambodo"). The Web one is the token audience the API checks.
const GOOGLE_WEB = '679056273635-hkksvpsd88omcfjhqgkg4orn35rmuu7n.apps.googleusercontent.com';
const GOOGLE_IOS = '679056273635-u4c2s50mv253eurero8evn3cv8dq20ge.apps.googleusercontent.com';

let configured = false;
/** Google's ID token for /auth/google, or null when the person backs out. */
export async function googleSignIn(): Promise<{ idToken: string } | null> {
  if (!configured) {
    GoogleOneTapSignIn.configure({ webClientId: GOOGLE_WEB, iosClientId: GOOGLE_IOS });
    configured = true;
  }
  if (Platform.OS === 'android') await GoogleOneTapSignIn.checkPlayServices();
  const r = await GoogleOneTapSignIn.presentExplicitSignIn();
  return isSuccessResponse(r) ? { idToken: r.data.idToken } : null;
}

/** Apple's identity token (plus the name, which Apple shares only the first time), or null when cancelled. */
export async function appleSignIn(): Promise<{ identityToken: string; name: string } | null> {
  try {
    const c = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
    });
    if (!c.identityToken) throw new Error('Apple didn’t finish signing you in. Try again.');
    return { identityToken: c.identityToken, name: [c.fullName?.givenName, c.fullName?.familyName].filter(Boolean).join(' ') };
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === 'ERR_REQUEST_CANCELED') return null;
    // Apple's "unknown" error: usually no Apple Account on the device, or its sign-in prompt was closed.
    if (code === 'ERR_REQUEST_UNKNOWN') throw new Error('Sign in to your Apple Account in Settings, then try again.');
    throw e;
  }
}
