        // =================================================================================
        // === CONFIGURATION - PASTE YOUR KEYS AND URLS HERE ===============================
        // =================================================================================

        const firebaseConfig = {
  apiKey: "AIzaSyC4Bzd1dEV7RY7VsXF5UqxaC0FUoohXDp8",
  authDomain: "data-managment-tcc.firebaseapp.com",
  projectId: "data-managment-tcc",
  storageBucket: "data-managment-tcc.firebasestorage.app",
  messagingSenderId: "1077661494535",
  appId: "1:1077661494535:web:ceceda8a3d2029e2cd69a2",
  measurementId: "G-22M7JDJZHM"
};
        const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxYpVG8B63_eKGVGFkLxcxibOH-d81ipTaZH-otVdoVJKAFqxxogYp6eXY9CuHpoOQqAA/exec';

        // =================================================================================
        // === APPLICATION LOGIC - DO NOT EDIT BELOW THIS LINE =============================
        // =================================================================================
        
        firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore();

        let generatedOTP = '';
        let selectedMethod = 'email';
        let verifiedContact = ''; // Store the verified email/phone

        // --- UI Control ---
        const views = ['login-section', 'otp-section', 'otp-verify-section', 'register-section', 'dashboard-section'];
        function showView(viewId) {
            views.forEach(id => document.getElementById(id).classList.add('hidden'));
            document.getElementById(viewId).classList.remove('hidden');
            document.getElementById('status').textContent = '';
        }
        
        function toggleInput() {
            selectedMethod = document.getElementById('method-email').checked ? 'email' : 'phone';
            document.getElementById('email-group').classList.toggle('hidden', selectedMethod !== 'email');
            document.getElementById('phone-group').classList.toggle('hidden', selectedMethod !== 'phone');
        }

        // --- OTP LOGIC (Same as before, but with UI changes) ---
        function sendOTP() {
            const statusEl = document.getElementById('status');
            statusEl.textContent = 'Sending...';
            generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
            console.log(`Generated OTP: ${generatedOTP}`);

            let payload = { otp: generatedOTP };
            if (selectedMethod === 'email') {
                verifiedContact = document.getElementById('email-input').value;
                payload.method = 'email';
                payload.email = verifiedContact;
            } else {
                let phone = document.getElementById('phone-input').value;
                verifiedContact = "+91" + phone;
                payload.method = 'phone';
                payload.phone = verifiedContact;
            }

            fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload), mode: 'no-cors' })
            .then(() => {
                statusEl.textContent = `OTP sent to ${verifiedContact}`;
                showView('otp-verify-section');
            }).catch(error => { statusEl.textContent = 'Error sending OTP.'; });
        }

        function verifyOTP() {
            const enteredOTP = document.getElementById('otp-input').value;
            if (enteredOTP === generatedOTP) {
                document.getElementById('status').textContent = 'Verification successful! Please set a password.';
                showView('register-section');
            } else {
                document.getElementById('status').textContent = 'Invalid OTP. Please try again.';
            }
        }

        // --- PASSWORD HASHING ---
        async function hashPassword(password) {
            const encoder = new TextEncoder();
            const data = encoder.encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return hashHex;
        }
        
        // --- USER ACCOUNT LOGIC ---
        async function registerUser() {
            const statusEl = document.getElementById('status');
            const password = document.getElementById('register-password').value;
            if (password.length < 6) {
                statusEl.textContent = 'Password must be at least 6 characters long.';
                return;
            }
            statusEl.textContent = 'Creating account...';

            const userRef = db.collection('users').doc(verifiedContact);
            const doc = await userRef.get();

            if (doc.exists) {
                statusEl.textContent = 'An account with this contact info already exists.';
                showView('login-section');
                return;
            }

            const passwordHash = await hashPassword(password);
            await userRef.set({
                contact: verifiedContact,
                passwordHash: passwordHash,
                createdAt: new Date(),
                orders: [] // Start with an empty list of orders
            });
            
            statusEl.textContent = 'Account created successfully! Please log in.';
            showView('login-section');
        }

        async function loginUser() {
            const statusEl = document.getElementById('status');
            const contact = document.getElementById('login-contact').value;
            const password = document.getElementById('login-password').value;
            statusEl.textContent = 'Logging in...';

            const userRef = db.collection('users').doc(contact);
            const doc = await userRef.get();

            if (!doc.exists) {
                statusEl.textContent = 'No account found with this contact info.';
                return;
            }

            const userData = doc.data();
            const passwordHash = await hashPassword(password);

            if (passwordHash === userData.passwordHash) {
                statusEl.textContent = 'Login successful!';
                loadDashboard(userData);
            } else {
                statusEl.textContent = 'Incorrect password.';
            }
        }

        function loadDashboard(userData) {
            document.getElementById('user-welcome-id').textContent = userData.contact;
            const ordersList = document.getElementById('orders-list');
            // Here you would render the user's orders from userData.orders
            // For now, we'll keep the default "no orders yet" message.
            showView('dashboard-section');
        }

        function logout() {
            // Simply show the login screen again
            verifiedContact = '';
            document.getElementById('login-password').value = '';
            document.getElementById('login-contact').value = '';
            showView('login-section');
        }

        // Set initial view
        window.onload = () => showView('login-section');
