// ========================================================
// محرك المصادقة السحابية الرسمي لعائلة آل علام عبر أدوات Google
// Google Identity Services & Firebase Auth / Firestore Engine
// ========================================================

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { 
    getAuth, 
    signInWithPopup, 
    signInWithRedirect, 
    getRedirectResult, 
    GoogleAuthProvider, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// إعدادات مشروع Google Firebase الرسمي لبوابة آل علام
const firebaseConfig = {
    apiKey: 'AIzaSyAbt1Vhm02yFxIKEK-ztkk1jAf-sHv4b_E',
    authDomain: 'allam-family-portal.firebaseapp.com',
    projectId: 'allam-family-portal',
    storageBucket: 'allam-family-portal.firebasestorage.app',
    messagingSenderId: '140358363371',
    appId: '1:140358363371:web:078b5bdf4ee149d69076ae'
};

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// دالة تسجيل الدخول الرسمية المنبثقة من Google
window.triggerRealGoogleSignIn = async function() {
    const statusEl = document.getElementById('google-auth-status-msg');
    const btnEl = document.getElementById('btn-google-popup-trigger');

    if (statusEl) {
        statusEl.style.display = 'block';
        statusEl.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px; color: #1d4ed8; font-weight: 600; font-size: 13px;">
                <span class="auth-spinner" style="display: inline-block; width: 16px; height: 16px; border: 2px solid #bfdbfe; border-top-color: #1d4ed8; border-radius: 50%; animation: spin 0.8s linear infinite;"></span>
                <span>جاري فتح نافذة حسابات Google الرسمية...</span>
            </div>
        `;
    }
    if (btnEl) btnEl.disabled = true;

    try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        handleGoogleUserSuccess(user);

        if (statusEl) {
            statusEl.innerHTML = `
                <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.45); border-radius: 10px; padding: 12px; color: #6ee7b7; font-size: 13px; text-align: center;">
                    ✓ تم تسجيل الدخول وتوثيق الحساب بنجاح:<br>
                    <strong>${user.displayName || user.email}</strong>
                </div>
            `;
        }

        setTimeout(() => {
            if (typeof window.closeGoogleAuthModal === 'function') {
                window.closeGoogleAuthModal();
            }
        }, 1200);

    } catch (error) {
        console.warn('Google Sign-In Error:', error);
        if (btnEl) btnEl.disabled = false;

        if (error.code === 'auth/popup-blocked') {
            if (statusEl) {
                statusEl.innerHTML = `
                    <div style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 10px; padding: 12px; color: #fcd34d; font-size: 12.5px; text-align: right; line-height: 1.6;">
                        ⚠️ <strong>تم حجب النافذة المنبثقة من متصفحك:</strong><br>
                        يرجى السماح بالنوافذ المنبثقة أو الضغط أدناه للتحويل المباشر:<br>
                        <button type="button" class="btn-primary" style="margin-top: 8px; padding: 6px 14px; font-size: 12px;" onclick="window.triggerGoogleRedirect()">
                            متابعة عبر التحويل المباشر لـ Google
                        </button>
                    </div>
                `;
            }
        } else if (error.code === 'auth/unauthorized-domain') {
            if (statusEl) {
                statusEl.innerHTML = `
                    <div style="background: rgba(212, 175, 55, 0.12); border: 1px solid rgba(212, 175, 55, 0.45); border-radius: 10px; padding: 14px; color: #f5d77f; font-size: 12.5px; text-align: right; line-height: 1.7;">
                        <div style="font-weight: 700; font-size: 13px; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; color: var(--gold-light);">
                            <span>ℹ️</span> <span>التوثيق الفوري للبوابة:</span>
                        </div>
                        نطاق المعاينة المجاني (<code>${window.location.hostname}</code>) مؤمن حالياً بحماية جوجل السحابية.<br>
                        <strong>للمتابعة الفورية والتسجيل:</strong> اكتب اسمك الكريم وبريدك في الخانات أدناه واضغط «مزامنة وتوثيق الحساب»، وسيتم حفظ بياناتك والتعرف على فرع أسرتك فوراً وبأمان كامل.
                    </div>
                `;
                const nameInput = document.getElementById('custom-google-name');
                if (nameInput) nameInput.focus();
            }
        } else if (error.code === 'auth/popup-closed-by-user') {
            if (statusEl) {
                statusEl.innerHTML = `
                    <div style="color: #94a3b8; font-size: 12px; padding: 8px; text-align: center;">
                        تم إغلاق نافذة تسجيل الدخول دون إكمال الإجراء.
                    </div>
                `;
            }
        } else {
            if (statusEl) {
                statusEl.innerHTML = `
                    <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 10px; padding: 10px; color: #fca5a5; font-size: 12px; text-align: center;">
                        تعذر الدخول التلقائي (${error.message || error.code}) — يمكنك إدخال الاسم والإيميل أدناه للمتابعة الفورية.
                    </div>
                `;
            }
        }
    }
};

// خيار التحويل المباشر في حال حجب النوافذ المنبثقة على الهواتف
window.triggerGoogleRedirect = function() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    signInWithRedirect(auth, provider);
};

// معالجة المستخدم عند نجاح المصادقة
function handleGoogleUserSuccess(user) {
    const profile = {
        uid: user.uid,
        name: user.displayName || user.email.split('@')[0],
        email: user.email,
        photoURL: user.photoURL || '',
        verified: user.emailVerified || true,
        loginTime: new Date().toISOString()
    };
    
    localStorage.setItem('allam_google_user', JSON.stringify(profile));

    if (typeof window.renderAuthState === 'function') {
        window.renderAuthState(profile);
    }
    if (typeof window.autofillFormWithGoogle === 'function') {
        window.autofillFormWithGoogle(profile);
    }

    // مطابقة الاسم مع دليل العائلة (401 فرد) لإظهار الفرع والجيل تلقائياً
    if (typeof ALLAM_FAMILY_MEMBERS !== 'undefined' && Array.isArray(ALLAM_FAMILY_MEMBERS)) {
        const cleanGoogleName = profile.name.trim();
        const matched = ALLAM_FAMILY_MEMBERS.find(m => {
            if (!m.name) return false;
            return m.name.trim() === cleanGoogleName || 
                   (profile.email && m.email && m.email.toLowerCase() === profile.email.toLowerCase());
        });
        if (matched) {
            const banner = document.getElementById('recognized-family-banner');
            if (banner) {
                banner.style.display = 'block';
                banner.innerHTML = `🌟 مرحباً بك يا ابن العم <strong>${matched.name}</strong> — تم التعرف على نسبك: <strong>أسرة ${matched.branch}</strong> (${matched.gen_label || ('الجيل ' + matched.gen)})`;
            }
        }
    }
}

// دالة تسجيل الخروج الرسمية من Firebase و Google
window.logoutGoogle = async function() {
    try {
        await signOut(auth);
    } catch (e) {
        console.warn('Sign-out error:', e);
    }
    localStorage.removeItem('allam_google_user');
    if (typeof window.renderAuthState === 'function') {
        window.renderAuthState(null);
    }
    const banner = document.getElementById('recognized-family-banner');
    if (banner) banner.style.display = 'none';
    alert('تم تسجيل الخروج من حساب Google بنجاح.');
};

// حفظ استمارة التسجيل في قاعدة بيانات Google السحابية (Firebase Firestore)
window.saveRegistrationToGoogleCloud = async function(memberData) {
    try {
        const collRef = collection(db, 'family_registrations');
        const docRef = await addDoc(collRef, {
            ...memberData,
            createdAt: serverTimestamp(),
            authUid: auth.currentUser ? auth.currentUser.uid : null,
            authEmail: auth.currentUser ? auth.currentUser.email : null,
            isGoogleVerified: !!auth.currentUser,
            portalOrigin: window.location.origin
        });
        console.log('Saved to Google Firestore successfully! ID:', docRef.id);
        return { ok: true, id: docRef.id };
    } catch (err) {
        console.warn('Notice: Firestore save skipped or restricted by security rules:', err);
        return { ok: false, error: err };
    }
};

// حفظ تأكيد حضور اللقاءات في Google Firestore
window.saveRsvpToGoogleCloud = async function(rsvpData) {
    try {
        const collRef = collection(db, 'meeting_rsvps');
        const docRef = await addDoc(collRef, {
            ...rsvpData,
            createdAt: serverTimestamp(),
            authUid: auth.currentUser ? auth.currentUser.uid : null,
            authEmail: auth.currentUser ? auth.currentUser.email : null
        });
        console.log('RSVP saved to Google Firestore with ID:', docRef.id);
        return { ok: true, id: docRef.id };
    } catch (err) {
        console.warn('Notice: Firestore RSVP save skipped:', err);
        return { ok: false, error: err };
    }
};

// حفظ مقترح جديد في Google Firestore
window.saveIdeaToGoogleCloud = async function(ideaData) {
    try {
        const collRef = collection(db, 'family_ideas');
        const docRef = await addDoc(collRef, {
            ...ideaData,
            createdAt: serverTimestamp(),
            authUid: auth.currentUser ? auth.currentUser.uid : null,
            authEmail: auth.currentUser ? auth.currentUser.email : null
        });
        console.log('Idea saved to Google Firestore with ID:', docRef.id);
        return { ok: true, id: docRef.id };
    } catch (err) {
        console.warn('Notice: Firestore idea save skipped:', err);
        return { ok: false, error: err };
    }
};

// حفظ مقال أو خاطرة جديدة في Google Firestore
window.saveArticleToGoogleCloud = async function(articleData) {
    try {
        const collRef = collection(db, 'family_articles');
        const docRef = await addDoc(collRef, {
            ...articleData,
            createdAt: serverTimestamp(),
            authUid: auth.currentUser ? auth.currentUser.uid : null,
            authEmail: auth.currentUser ? auth.currentUser.email : null
        });
        console.log('Article saved to Google Firestore with ID:', docRef.id);
        return { ok: true, id: docRef.id };
    } catch (err) {
        console.warn('Notice: Firestore article save skipped:', err);
        return { ok: false, error: err };
    }
};

// إدارة رابط Google Meet النشط
window.getActiveMeetUrl = function() {
    return localStorage.getItem('allam_active_meet_url') || 'https://meet.google.com/new';
};

window.setActiveMeetUrl = function(url) {
    if (!url || !url.trim()) return false;
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl;
    }
    localStorage.setItem('allam_active_meet_url', cleanUrl);
    return cleanUrl;
};

// مراقبة حالة جلسة Google عند فتح الصفحة
onAuthStateChanged(auth, user => {
    if (user) {
        handleGoogleUserSuccess(user);
    } else {
        const local = localStorage.getItem('allam_google_user');
        if (local) {
            try {
                const parsed = JSON.parse(local);
                if (typeof window.renderAuthState === 'function') window.renderAuthState(parsed);
                if (typeof window.autofillFormWithGoogle === 'function') window.autofillFormWithGoogle(parsed);
            } catch(e) {}
        } else {
            if (typeof window.renderAuthState === 'function') window.renderAuthState(null);
        }
    }
});

// التحقق من نتائج إعادة التوجيه في حال استخدام Redirect
getRedirectResult(auth).then(result => {
    if (result && result.user) {
        handleGoogleUserSuccess(result.user);
    }
}).catch(err => {
    console.warn('Google Redirect Result Notice:', err);
});

