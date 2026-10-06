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
      onState({ user, membership: 'checking', roster: null });
      if (!user.emailVerified || !user.providerData?.some(provider => provider.providerId === 'google.com')) {
        return onState({ user, membership: 'unverified' });
      }
      try {
        const [profileSnap, grantSnap] = await Promise.all([
          storeSdk.getDoc(storeSdk.doc(db, 'users_public', user.uid)),
          storeSdk.getDoc(storeSdk.doc(db, 'family_governance', user.uid))
        ]);
        const profile = profileSnap.exists() ? profileSnap.data() : {};
        let memberActive = false;
        if (profile.status === 'active' && typeof profile.memberId === 'string') {
          const [linkSnap, memberSnap] = await Promise.all([
            storeSdk.getDoc(storeSdk.doc(db, 'member_account_links', profile.memberId)),
            storeSdk.getDoc(storeSdk.doc(db, 'family_members', profile.memberId))
          ]);
          const link = linkSnap.exists() ? linkSnap.data() : null;
          const member = memberSnap.exists() ? memberSnap.data() : null;
          memberActive = link?.uid === user.uid && link?.role === profile.role && link?.branch === profile.branch &&
            member?.verified === true && member?.tier === profile.role && member?.branch === profile.branch;
        }
        const grant = grantSnap.exists() ? grantSnap.data() : null;
        const governanceActive = grant?.active === true && ['founder', 'uncle', 'delegate'].includes(grant.kind);
        const membership = memberActive || governanceActive ? 'active' : 'pending';
        if (membership !== 'active') return onState({ user, membership, roster: null });

        let treeProfilesSnap, registrySnap;
        try {
          const profileCollection = storeSdk.collection(db, 'family_tree_profiles');
          const registryCollection = storeSdk.collection(db, 'family_members');
          const allBranches = memberActive || grant?.kind === 'founder';
          const branches = [...new Set(Array.isArray(grant?.branches) ? grant.branches.filter(value => typeof value === 'string' && value) : [])];
          if (!allBranches && !branches.length) return onState({ user, membership, roster: null, rosterUnavailable: true });
          const profilesQuery = allBranches ? profileCollection : storeSdk.query(profileCollection, storeSdk.where('branch', 'in', branches));
          const registryQuery = allBranches ? registryCollection : storeSdk.query(registryCollection, storeSdk.where('branch', 'in', branches));
          [treeProfilesSnap, registrySnap] = await Promise.all([
            storeSdk.getDocs(profilesQuery),
            storeSdk.getDocs(registryQuery)
          ]);
        } catch {
          return onState({ user, membership, roster: null, rosterUnavailable: true });
        }
        const registry = new Map(registrySnap.docs.map(item => [item.id, item.data()]));
        const slotByZone = { 1: 1, 2: 8, 3: 7, 4: 6, 5: 5, 6: 4, 7: 3, 8: 2 };
        const candidates = [];
        for (const item of treeProfilesSnap.docs) {
          const row = item.data();
          const canonical = registry.get(item.id);
          const zone = /^B0([1-8])_[0-9]{3}$/.exec(String(row.anchorId || ''));
          if (row.memberId !== item.id || !canonical?.verified || canonical.branch !== row.branch ||
              canonical.generation !== row.generation || typeof row.name !== 'string' || !row.name.trim() ||
              !['MALE', 'FEMALE', 'UNKNOWN'].includes(row.gender) || !zone ||
              !Number.isInteger(Number(row.generation)) || Number(row.generation) < 1 || Number(row.generation) > 20) continue;
          candidates.push({
            id: item.id,
            name: row.name.trim(),
            branch: `الفرع ${slotByZone[Number(zone[1])]}`,
            gen: Number(row.generation),
            gender: row.gender === 'MALE' ? 'M' : row.gender === 'FEMALE' ? 'F' : 'UNKNOWN',
            parentCandidateId: typeof canonical.parentId === 'string' ? canonical.parentId : null,
            status: 'موثق',
            authorizedRoster: true
          });
        }
        const validIds = new Set(candidates.map(member => member.id));
        const roster = candidates.map(({ parentCandidateId, ...member }) => {
          const parentId = parentCandidateId && validIds.has(parentCandidateId) ? parentCandidateId : null;
          return { ...member, parentId, parentLinkStatus: parentId ? 'CONFIRMED' : 'UNRESOLVED' };
        });
        onState({ user, membership, roster });
      } catch {
        onState({ user, membership: 'pending', roster: null });
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
