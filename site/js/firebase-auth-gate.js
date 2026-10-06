/* Google sign-in for the symbolic preview. Public Firebase web config only. */
(() => {
  'use strict';

  const config = Object.freeze({
    apiKey: 'AIzaSyAbt1Vhm02yFxIKEK-ztkk1jAf-sHv4b_E',
    authDomain: 'allam-family-portal.firebaseapp.com',
    projectId: 'allam-family-portal',
    storageBucket: 'allam-family-portal.firebasestorage.app',
    messagingSenderId: '140358363371',
    appId: '1:140358363371:web:078b5bdf4ee149d69076ae'
  });

  let modules;
  let auth;
  let db;
  let initialized = false;

  async function getModules() {
    if (!modules) modules = Promise.all([
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js')
    ]);
    return modules;
  }

  async function init(onState) {
    const [appSdk, authSdk, storeSdk] = await getModules();
    const app = appSdk.getApps().find(item => item.options.projectId === config.projectId) || appSdk.initializeApp(config);
    auth = authSdk.getAuth(app);
    db = storeSdk.getFirestore(app);
    initialized = true;
    authSdk.onAuthStateChanged(auth, async user => {
      if (!user) return onState({ user: null });
      if (!user.emailVerified) return onState({ user, membership: 'unverified' });
      try {
        const profileSnap = await storeSdk.getDoc(storeSdk.doc(db, 'users_public', user.uid));
        if (!profileSnap.exists()) return onState({ user, membership: 'pending' });
        const profile = profileSnap.data();
        if (profile.status !== 'active' || typeof profile.memberId !== 'string') return onState({ user, membership: 'pending' });
        const [linkSnap, memberSnap] = await Promise.all([
          storeSdk.getDoc(storeSdk.doc(db, 'member_account_links', profile.memberId)),
          storeSdk.getDoc(storeSdk.doc(db, 'family_members', profile.memberId))
        ]);
        const link = linkSnap.exists() ? linkSnap.data() : null;
        const member = memberSnap.exists() ? memberSnap.data() : null;
        const membership = link?.uid === user.uid && link?.role === profile.role && link?.branch === profile.branch &&
          member?.verified === true && member?.tier === profile.role && member?.branch === profile.branch
          ? 'active' : 'pending';
        onState({ user, membership });
      } catch {
        onState({ user, membership: 'pending' });
      }
    });
  }

  async function signIn() {
    try {
      if (!initialized) return { ok: false, message: 'إعداد Firebase غير جاهز بعد. أعد تحميل الصفحة.' };
      const [, authSdk] = await getModules();
      await authSdk.signInWithPopup(auth, new authSdk.GoogleAuthProvider());
      return { ok: true };
    } catch (error) {
      const messages = {
        'auth/unauthorized-domain': 'نطاق الموقع غير مسجل في Firebase Authentication بعد.',
        'auth/operation-not-allowed': 'تسجيل Google غير مفعّل في Firebase Authentication بعد.',
        'auth/popup-blocked': 'حُجبت نافذة Google. اسمح بالنوافذ المنبثقة وحاول مجددًا.'
      };
      return { ok: false, message: messages[error?.code] || 'تعذر تسجيل الدخول عبر Google. تحقق من إعداد Firebase وحاول مجددًا.' };
    }
  }

  async function signOut() {
    if (auth) {
      const [, authSdk] = await getModules();
      await authSdk.signOut(auth);
    }
  }

  window.AllamAuthGate = { init, signIn, signOut };
})();
