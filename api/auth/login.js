import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { identifier, password } = req.body;

    // Check if identifier is email or phone
    const isEmail = identifier.includes('@');
    
    let authResponse;
    if (isEmail) {
      authResponse = await supabase.auth.signInWithPassword({
        email: identifier,
        password: password
      });
    } else {
      // If you want phone login, you'll need to implement that separately
      return res.status(400).json({ 
        message: 'Phone login not yet implemented. Please use email.' 
      });
    }

    if (authResponse.error) {
      return res.status(400).json({ 
        message: authResponse.error.message || 'Login failed' 
      });
    }

    return res.status(200).json({
      message: 'Login successful',
      user: authResponse.data.user,
      session: authResponse.data.session
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
}