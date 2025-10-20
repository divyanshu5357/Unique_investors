// src/lib/firebase/admin.ts

import * as admin from 'firebase-admin';

let adminDb: admin.firestore.Firestore;

if (!admin.apps.length) {
    try {
        // New, more robust method using a single environment variable
        if (!process.env.FIREBASE_CREDENTIALS) {
            throw new Error('The FIREBASE_CREDENTIALS environment variable is not set.');
        }

        // Parse the credentials JSON from the environment variable
        const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });

        adminDb = admin.firestore();

    } catch (error: any) {
        console.error('🔥 Firebase Admin initialization error:', error.message);
        // Re-throw a clearer error to be caught by the action handler
        throw new Error(`Failed to initialize Firebase Admin SDK. Please ensure the FIREBASE_CREDENTIALS secret is set correctly and is valid JSON. Details: ${error.message}`);
    }
} else {
    adminDb = admin.firestore();
}

export { adminDb };
