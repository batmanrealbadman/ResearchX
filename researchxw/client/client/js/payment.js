const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const { db } = require('./firebase');

// Initialize Paystack with your secret key
const PAYSTACK_SECRET_KEY = functions.config().paystack.secret_key;
const FLUTTERWAVE_SECRET_KEY = functions.config().flutterwave.secret_key;

// Initialize payment
exports.initiatePayment = functions.https.onRequest(async (req, res) => {
    try {
        // Verify authentication
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const token = authHeader.split(' ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        const { projectId, amount, email, paymentMethod } = req.body;

        // Get project details
        const projectRef = db.collection('projects').doc(projectId);
        const projectDoc = await projectRef.get();
        
        if (!projectDoc.exists) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Create payment record
        const paymentRef = db.collection('payments').doc();
        const paymentId = paymentRef.id;
        const reference = `RESEARCHX-${Date.now()}-${paymentId}`;
        
        await paymentRef.set({
            userId: decodedToken.uid,
            projectId,
            amount,
            email,
            paymentMethod,
            reference,
            status: 'initiated',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Update project with payment reference
        await projectRef.update({
            paymentReference: reference,
            paymentStatus: 'pending'
        });

        // Prepare payment based on method
        if (paymentMethod === 'paystack') {
            // Initialize Paystack payment
            const paystackResponse = await axios.post(
                'https://api.paystack.co/transaction/initialize',
                {
                    email,
                    amount,
                    reference,
                    callback_url: `${functions.config().app.url}/payment/verify?projectId=${projectId}`,
                    metadata: {
                        projectId,
                        paymentId,
                        userId: decodedToken.uid
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return res.json({
                paystackKey: functions.config().paystack.public_key,
                reference,
                authorizationUrl: paystackResponse.data.data.authorization_url
            });
        } else if (paymentMethod === 'flutterwave') {
            // Initialize Flutterwave payment
            const flutterwaveResponse = await axios.post(
                'https://api.flutterwave.com/v3/payments',
                {
                    tx_ref: reference,
                    amount,
                    currency: 'NGN',
                    redirect_url: `${functions.config().app.url}/payment/verify?projectId=${projectId}`,
                    customer: {
                        email,
                    },
                    customizations: {
                        title: 'ResearchX Project Payment',
                        logo: 'https://researchx.ng/logo.png'
                    },
                    meta: {
                        projectId,
                        paymentId,
                        userId: decodedToken.uid
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return res.json({
                paymentUrl: flutterwaveResponse.data.data.link
            });
        } else {
            return res.status(400).json({ error: 'Invalid payment method' });
        }

    } catch (error) {
        console.error('Payment initiation error:', error);
        return res.status(500).json({ error: error.message });
    }
});

// Verify payment
exports.verifyPayment = functions.https.onRequest(async (req, res) => {
    try {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const token = authHeader.split(' ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        const { projectId, reference } = req.body;

        // Check payment method
        const paymentSnapshot = await db.collection('payments')
            .where('reference', '==', reference)
            .limit(1)
            .get();

        if (paymentSnapshot.empty) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        const paymentDoc = paymentSnapshot.docs[0];
        const paymentData = paymentDoc.data();
        const paymentMethod = paymentData.paymentMethod;

        let verificationResponse;
        
        if (paymentMethod === 'paystack') {
            // Verify Paystack payment
            verificationResponse = await axios.get(
                `https://api.paystack.co/transaction/verify/${reference}`,
                {
                    headers: {
                        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`
                    }
                }
            );
        } else if (paymentMethod === 'flutterwave') {
            // Verify Flutterwave payment
            verificationResponse = await axios.get(
                `https://api.flutterwave.com/v3/transactions/${reference}/verify`,
                {
                    headers: {
                        'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`
                    }
                }
            );
        } else {
            return res.status(400).json({ error: 'Invalid payment method' });
        }

        const paymentStatus = verificationResponse.data.data.status;
        const amountPaid = verificationResponse.data.data.amount;

        // Check if payment was successful
        if (paymentStatus !== 'successful') {
            await paymentDoc.ref.update({
                status: 'failed',
                verifiedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            return res.status(400).json({ error: 'Payment not successful' });
        }

        // Check if amount matches
        if (amountPaid !== paymentData.amount) {
            await paymentDoc.ref.update({
                status: 'amount_mismatch',
                verifiedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            return res.status(400).json({ error: 'Amount paid does not match' });
        }

        // Update payment record
        await paymentDoc.ref.update({
            status: 'completed',
            verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
            paymentData: verificationResponse.data.data
        });

        // Update project status
        const projectRef = db.collection('projects').doc(projectId);
        await projectRef.update({
            paymentStatus: 'completed',
            status: 'approved',
            approvedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // TODO: Send confirmation email, notify admin, etc.

        return res.json({ 
            success: true,
            message: 'Payment verified and project approved'
        });

    } catch (error) {
        console.error('Payment verification error:', error);
        return res.status(500).json({ error: error.message });
    }
});