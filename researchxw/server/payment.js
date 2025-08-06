const express = require('express');
const router = express.Router();
const { db, admin } = require('./firebase'); // Added admin import
const axios = require('axios');
const cors = require('cors');

router.use(cors());

// Constants
const ACCESS_BANK_ACCOUNT = '0818022720'; // Access Bank account number
const BANK_CODE = '044'; // Access Bank code
const TRANSACTION_FEE_PERCENTAGE = 1.5; // 1.5% transaction fee

// Initialize payment for a project
router.get('/initiate/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Validate project ID
    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid project ID'
      });
    }
    
    // Get project details
    const projectDoc = await db.collection('projects').doc(projectId).get();
    
    if (!projectDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    const project = projectDoc.data();
    
    // Validate project data
    if (!project.price || project.price <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid project price'
      });
    }

    // Calculate amount with transaction fee
    const transactionFee = project.price * (TRANSACTION_FEE_PERCENTAGE / 100);
    const totalAmount = project.price + transactionFee;
    
    // Initialize payment with Paystack
    const paystackResponse = await axios.post('https://api.paystack.co/transaction/initialize', {
      email: project.authorEmail || 'user@example.com', // Fallback email
      amount: Math.round(totalAmount * 100), // Convert to kobo
      reference: `RESEARCHX-${projectId}-${Date.now()}`,
      callback_url: `${process.env.BASE_URL}/payment/verify/${projectId}`,
      metadata: {
        projectId,
        authorId: project.authorId,
        accessBankAccount: ACCESS_BANK_ACCOUNT,
        transactionFee,
        custom_fields: [
          {
            display_name: "Project Title",
            variable_name: "project_title",
            value: project.title
          },
          {
            display_name: "Bank Account",
            variable_name: "bank_account",
            value: ACCESS_BANK_ACCOUNT
          }
        ]
      }
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Save payment reference to project
    await db.collection('projects').doc(projectId).update({
      paymentReference: paystackResponse.data.data.reference,
      paymentStatus: 'initiated',
      transactionFee,
      totalAmount,
      bankAccount: ACCESS_BANK_ACCOUNT,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Return payment authorization URL
    res.json({
      success: true,
      authorizationUrl: paystackResponse.data.data.authorization_url,
      bankAccount: ACCESS_BANK_ACCOUNT,
      accountName: "ResearchX Platform", // You should replace with actual account name
      bankName: "Access Bank",
      amount: totalAmount,
      transactionFee
    });
  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.message || 'Payment initialization failed'
    });
  }
});

// Payment verification webhook
router.post('/verify/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { reference } = req.body;
    
    // Validate inputs
    if (!reference || !projectId) {
      return res.status(400).json({
        success: false,
        error: 'Missing reference or project ID'
      });
    }

    // Verify payment with Paystack
    const verificationResponse = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`, 
      {
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );
    
    if (verificationResponse.data.data.status === 'success') {
      const transactionData = verificationResponse.data.data;
      
      // Create a transfer recipient for Access Bank account
      const recipientResponse = await axios.post(
        'https://api.paystack.co/transferrecipient',
        {
          type: 'nuban',
          name: 'ResearchX Platform', // Replace with actual account name
          account_number: ACCESS_BANK_ACCOUNT,
          bank_code: BANK_CODE,
          currency: 'NGN'
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
          }
        }
      );

      const recipientCode = recipientResponse.data.data.recipient_code;
      
      // Initiate transfer to Access Bank account
      await axios.post(
        'https://api.paystack.co/transfer',
        {
          source: 'balance',
          amount: transactionData.amount - (transactionData.amount * 0.015), // Deduct Paystack fee
          recipient: recipientCode,
          reason: `Payment for project ${projectId}`
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
          }
        }
      );

      // Update project status
      await db.collection('projects').doc(projectId).update({
        paymentStatus: 'completed',
        status: 'approved',
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        transactionReference: transactionData.reference,
        paymentDetails: {
          amount: transactionData.amount / 100,
          paidAt: new Date(transactionData.paid_at),
          bank: transactionData.authorization.bank,
          transferTo: ACCESS_BANK_ACCOUNT
        }
      });
      
      res.json({
        success: true,
        message: 'Payment verified and funds transferred to Access Bank',
        bankAccount: ACCESS_BANK_ACCOUNT,
        amount: transactionData.amount / 100
      });
    } else {
      // Update project status if payment failed
      await db.collection('projects').doc(projectId).update({
        paymentStatus: 'failed',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      res.status(400).json({
        success: false,
        error: 'Payment not successful'
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.message || 'Payment verification failed'
    });
  }
});

module.exports = router;