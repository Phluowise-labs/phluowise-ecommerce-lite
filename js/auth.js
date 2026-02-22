// Auth Functions with Mobile UI Feedback
// SECURITY: All console.log statements printing PII have been removed.

async function signUp(fullName, email, phone, password, userType) {
    feedback.showLoading('Creating your account...');
    feedback.clearFieldErrors();

    try {
        // Validation
        if (!fullName || !email || !phone || !password) {
            throw new Error('All fields are required');
        }

        if (password.length < 8) {
            feedback.showFieldError('password', 'Password must be at least 8 characters long');
            throw new Error('Password must be at least 8 characters long');
        }

        if (!userType) {
            userType = 'individual';
        }

        const normalizedEmail = email.toLowerCase();

        // 0. Check if email already exists in customer_tb first
        let existingCustomer = { documents: [] };
        try {
            existingCustomer = await databases.listDocuments(
                appwriteConfig.DATABASE_ID,
                appwriteConfig.CUSTOMER_TABLE,
                [Query.equal('email', normalizedEmail)]
            );
        } catch (dbError) {
            // If we can't query the database, continue with sign-up
        }

        if (existingCustomer.documents.length > 0) {
            feedback.showFieldError('email', 'Email already registered in our system');
            throw new Error('An account with this email already exists in our customer database. Please sign in instead.');
        }

        // Clean up any existing sessions first
        try {
            const sessions = await account.listSessions();
            for (const session of sessions.sessions) {
                await account.deleteSession(session.$id);
            }
        } catch (e) {
            // No sessions or error — continue
        }

        const uniqueId = ID.unique();

        try {
            // 1. Create Account in Appwrite
            await account.create(uniqueId, email, password, fullName);

            // 2. Create Session
            await account.createEmailPasswordSession(email, password);

            // 3. Create Database Entry in customer_tb
            await databases.createDocument(
                appwriteConfig.DATABASE_ID,
                appwriteConfig.CUSTOMER_TABLE,
                ID.unique(),
                {
                    full_name: fullName,
                    email: normalizedEmail,
                    phone_number: phone,
                    user_type: userType,
                    uid: uniqueId
                }
            );

            feedback.hideLoading();
            feedback.success('Customer account created successfully!');

            setTimeout(() => {
                window.location.href = 'hear-about-us.html';
            }, 1500);

        } catch (appwriteError) {
            if (appwriteError.code === 409) {
                feedback.showFieldError('email', 'Email already registered. Please sign in instead.');
                throw new Error('This email is already registered in our system. Please sign in to continue.');
            } else if (appwriteError.message && appwriteError.message.includes('session is active')) {
                try {
                    const user = await account.get();

                    const customerData = await databases.listDocuments(
                        appwriteConfig.DATABASE_ID,
                        appwriteConfig.CUSTOMER_TABLE,
                        [Query.equal('uid', user.$id)]
                    );

                    if (customerData.documents.length === 0) {
                        await databases.createDocument(
                            appwriteConfig.DATABASE_ID,
                            appwriteConfig.CUSTOMER_TABLE,
                            ID.unique(),
                            {
                                full_name: user.name,
                                email: normalizedEmail,
                                phone_number: phone,
                                user_type: userType,
                                uid: user.$id
                            }
                        );
                    }

                    feedback.hideLoading();
                    feedback.success('Account setup completed!');

                    setTimeout(() => {
                        window.location.href = 'hear-about-us.html';
                    }, 1500);
                    return;
                } catch (sessionError) {
                    throw new Error('Account setup failed. Please try signing in instead.');
                }
            } else {
                throw appwriteError;
            }
        }

    } catch (error) {
        feedback.hideLoading();

        let errorMessage = '';
        if (error.message && error.message.includes('customer database')) {
            errorMessage = error.message;
        } else if (error.message && error.message.includes('already registered in our system')) {
            errorMessage = error.message;
        } else if (error.message && error.message.includes('Account setup failed')) {
            errorMessage = error.message;
        } else if (error.code === 409) {
            errorMessage = 'An account with this email already exists. Please sign in instead.';
            feedback.showFieldError('email', 'Email already registered');
        } else if (error.code === 400) {
            errorMessage = 'Invalid email format or password too weak.';
            if (email && !email.includes('@')) {
                feedback.showFieldError('email', 'Invalid email format');
            }
            if (password && password.length < 8) {
                feedback.showFieldError('password', 'Password too weak');
            }
        } else if (error.code === 429) {
            errorMessage = 'Too many requests. Please try again later.';
        } else {
            errorMessage = error.message;
        }

        feedback.error(errorMessage);

        const form = document.querySelector('form') || document.querySelector('.flex-1');
        if (form) feedback.shake(form);
    }
}

async function signIn(email, password) {
    feedback.showLoading('Signing you in...');
    feedback.clearFieldErrors();

    try {
        if (!email || !password) {
            throw new Error('Email and password are required');
        }

        const normalizedEmail = email.toLowerCase();

        // Clean up any existing sessions first
        try {
            const sessions = await account.listSessions();
            for (const session of sessions.sessions) {
                await account.deleteSession(session.$id);
            }
        } catch (e) {
            // No sessions or error — continue
        }

        // Create new session
        await account.createEmailPasswordSession(email, password);

        const user = await account.get();

        // SECURITY: Session marker encrypted before writing to localStorage (AES-256-GCM)
        await PhluowiseEncryption.secureStore('currentUser', { $id: user.$id, name: user.name });

        // Check if customer exists in our database
        const customerData = await databases.listDocuments(
            appwriteConfig.DATABASE_ID,
            appwriteConfig.CUSTOMER_TABLE,
            [Query.equal('uid', user.$id)]
        );

        if (customerData.documents.length === 0) {
            await databases.createDocument(
                appwriteConfig.DATABASE_ID,
                appwriteConfig.CUSTOMER_TABLE,
                ID.unique(),
                {
                    full_name: user.name,
                    email: normalizedEmail,
                    phone_number: '',
                    user_type: 'individual',
                    uid: user.$id
                }
            );

            const newCustomerData = await databases.listDocuments(
                appwriteConfig.DATABASE_ID,
                appwriteConfig.CUSTOMER_TABLE,
                [Query.equal('uid', user.$id)]
            );

            // SECURITY: Encrypted session stored at rest
            await PhluowiseEncryption.secureStore('customerSession', {
                userId: user.$id,
                customerId: newCustomerData.documents[0].$id
            });
        } else {
            // SECURITY: Encrypted session stored at rest
            await PhluowiseEncryption.secureStore('customerSession', {
                userId: user.$id,
                customerId: customerData.documents[0].$id
            });
        }

        feedback.hideLoading();
        feedback.success('Welcome back!');

        setTimeout(() => {
            window.location.href = 'home.html';
        }, 1000);

    } catch (error) {
        feedback.hideLoading();

        let errorMessage = '';
        if (error.code === 401) {
            errorMessage = 'Invalid email or password. Please check your credentials.';
            feedback.showFieldError('password', 'Invalid credentials');
        } else if (error.code === 404) {
            errorMessage = 'Account not found. Please sign up first.';
            feedback.showFieldError('email', 'Account not found');
        } else if (error.code === 429) {
            errorMessage = 'Too many failed attempts. Please try again later.';
        } else {
            errorMessage = error.message;
        }

        feedback.error(errorMessage);

        const form = document.querySelector('form') || document.querySelector('.flex-1');
        if (form) feedback.shake(form);
    }
}

async function signOut() {
    const hasFeedback = typeof feedback !== 'undefined';

    if (hasFeedback) {
        feedback.showLoading('Signing out...');
    }

    try {
        await account.deleteSession('current');
    } catch (error) {
        // Session may already be expired — continue with local cleanup
    } finally {
        // SECURITY: wipe ALL encrypted entries and legacy plain-text keys on every signout
        PhluowiseEncryption.secureClearAll();
        // Also clear any legacy unencrypted keys from before encryption was added
        localStorage.removeItem('customerSession');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('phluowiseOrders');

        if (hasFeedback) {
            feedback.hideLoading();
            feedback.info('You have been signed out');
            setTimeout(() => {
                window.location.href = 'signin.html';
            }, 1000);
        } else {
            window.location.href = 'signin.html';
        }
    }
}

async function checkSession() {
    try {
        const user = await account.get();

        // SECURITY: Refresh encrypted session marker on every session check
        await PhluowiseEncryption.secureStore('currentUser', { $id: user.$id, name: user.name });

        const customerData = await databases.listDocuments(
            appwriteConfig.DATABASE_ID,
            appwriteConfig.CUSTOMER_TABLE,
            [Query.equal('uid', user.$id)]
        );

        if (customerData.documents.length === 0) {
            await databases.createDocument(
                appwriteConfig.DATABASE_ID,
                appwriteConfig.CUSTOMER_TABLE,
                ID.unique(),
                {
                    full_name: user.name,
                    email: user.email,
                    phone_number: '',
                    user_type: 'individual',
                    uid: user.$id
                }
            );
        }

        return user;
    } catch (error) {
        return null;
    }
}

async function forgotPassword(email) {
    feedback.showLoading('Sending password reset...');
    feedback.clearFieldErrors();

    try {
        if (!email) {
            throw new Error('Email address is required');
        }

        const customerData = await databases.listDocuments(
            appwriteConfig.DATABASE_ID,
            appwriteConfig.CUSTOMER_TABLE,
            [Query.equal('email', email.toLowerCase())]
        );

        if (customerData.documents.length === 0) {
            throw new Error('No customer account found with this email address in our system');
        }

        await account.createRecovery(
            email,
            'https://phluowise-website.pages.dev/reset-password'
        );

        feedback.hideLoading();
        feedback.success('Password reset email sent! Please check your inbox and spam folder.');

    } catch (error) {
        feedback.hideLoading();

        let errorMessage = '';
        if (error.code === 404) {
            errorMessage = 'No account found with this email address.';
            feedback.showFieldError('email', 'Email not found');
        } else if (error.message && error.message.includes('customer system')) {
            errorMessage = error.message;
            feedback.showFieldError('email', 'Email not found in our system');
        } else if (error.code === 429) {
            errorMessage = 'Too many requests. Please wait before trying again.';
        } else {
            errorMessage = error.message;
        }

        feedback.error(errorMessage);

        const form = document.querySelector('form') || document.querySelector('.flex-1');
        if (form) feedback.shake(form);
    }
}

async function resetPassword(userId, secret, password, confirmPassword) {
    feedback.showLoading('Resetting your password...');
    feedback.clearFieldErrors();

    try {
        if (!password || !confirmPassword) {
            throw new Error('Both password fields are required');
        }

        if (password.length < 8) {
            feedback.showFieldError('newPassword', 'Password must be at least 8 characters long');
            throw new Error('Password must be at least 8 characters long');
        }

        if (password !== confirmPassword) {
            feedback.showFieldError('confirmPassword', 'Passwords do not match');
            throw new Error('Passwords do not match');
        }

        await account.updateRecovery(userId, secret, password, password);

        feedback.hideLoading();
        feedback.success('Password reset successfully! You can now sign in with your new password.');

        setTimeout(() => {
            window.location.href = 'signin.html';
        }, 2000);

    } catch (error) {
        feedback.hideLoading();

        let errorMessage = '';
        if (error.code === 401) {
            errorMessage = 'Invalid or expired reset link. Please request a new password reset.';
        } else if (error.code === 400) {
            errorMessage = 'Password is too weak or invalid format.';
        } else {
            errorMessage = error.message;
        }

        feedback.error(errorMessage);

        const form = document.querySelector('form') || document.querySelector('.flex-1');
        if (form) feedback.shake(form);
    }
}

// Helper function to validate customer session
async function validateCustomerSession() {
    try {
        const user = await account.get();

        localStorage.setItem('currentUser', JSON.stringify({ $id: user.$id, name: user.name }));

        const customerData = await databases.listDocuments(
            appwriteConfig.DATABASE_ID,
            appwriteConfig.CUSTOMER_TABLE,
            [Query.equal('uid', user.$id)]
        );

        return customerData.documents.length > 0 ? customerData.documents[0] : null;
    } catch (error) {
        return null;
    }
}

// Helper function to get current customer info
// NOTE: this function is now async because it reads from encrypted storage.
async function getCurrentCustomer() {
    try {
        // Try encrypted store first (current app version)
        const encrypted = await PhluowiseEncryption.secureRead('customerSession');
        if (encrypted) return encrypted;
        // Fallback: read legacy unencrypted key (old sessions before encryption was added)
        const legacy = localStorage.getItem('customerSession');
        return legacy ? JSON.parse(legacy) : null;
    } catch (error) {
        return null;
    }
}

async function getUserProfile() {
    try {
        const user = await account.get();

        // SECURITY: Encrypted session marker
        await PhluowiseEncryption.secureStore('currentUser', { $id: user.$id, name: user.name });

        const customerData = await databases.listDocuments(
            appwriteConfig.DATABASE_ID,
            appwriteConfig.CUSTOMER_TABLE,
            [Query.equal('uid', user.$id)]
        );

        if (customerData.documents.length > 0) {
            return {
                auth: user,
                profile: customerData.documents[0]
            };
        }

        const newCustomer = await databases.createDocument(
            appwriteConfig.DATABASE_ID,
            appwriteConfig.CUSTOMER_TABLE,
            ID.unique(),
            {
                full_name: user.name,
                email: user.email,
                phone_number: '',
                user_type: 'individual',
                uid: user.$id
            }
        );

        return { auth: user, profile: newCustomer };
    } catch (error) {
        if (error.code === 401) {
            window.location.href = 'signin.html';
        }
        return null;
    }
}

async function updateProfile(profileData) {
    feedback.showLoading('Updating your profile...');
    feedback.clearFieldErrors();

    try {
        const user = await account.get();

        if (!profileData.full_name) {
            feedback.showFieldError('fullName', 'Full name is required');
            throw new Error('Full name is required');
        }

        const cleanData = {
            full_name: profileData.full_name,
            email: profileData.email,
            phone_number: profileData.phone_number || '',
            user_type: profileData.user_type || 'individual',
            uid: user.$id
        };

        const existingCustomer = await databases.listDocuments(
            appwriteConfig.DATABASE_ID,
            appwriteConfig.CUSTOMER_TABLE,
            [Query.equal('uid', user.$id)]
        );

        if (existingCustomer.documents.length > 0) {
            await databases.updateDocument(
                appwriteConfig.DATABASE_ID,
                appwriteConfig.CUSTOMER_TABLE,
                existingCustomer.documents[0].$id,
                cleanData
            );
        } else {
            await databases.createDocument(
                appwriteConfig.DATABASE_ID,
                appwriteConfig.CUSTOMER_TABLE,
                ID.unique(),
                cleanData
            );
        }

        // Only update the name in session, not email
        const sessionData = JSON.parse(localStorage.getItem('customerSession') || '{}');
        sessionData.name = profileData.full_name;
        localStorage.setItem('customerSession', JSON.stringify(sessionData));

        feedback.hideLoading();
        feedback.success('Profile updated successfully!');
        return true;
    } catch (error) {
        feedback.hideLoading();

        let errorMessage = '';
        if (error.code === 401) {
            errorMessage = 'Session expired. Please sign in again.';
            setTimeout(() => {
                window.location.href = 'signin.html';
            }, 2000);
        } else if (error.message && error.message.includes('Full name is required')) {
            errorMessage = error.message;
        } else {
            errorMessage = 'Failed to update profile. Please try again.';
        }

        feedback.error(errorMessage);

        const form = document.querySelector('form') || document.querySelector('.flex-1');
        if (form) feedback.shake(form);

        return false;
    }
}
