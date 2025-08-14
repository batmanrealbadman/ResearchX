import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, password, firstName, lastName, phone, institution, department } = req.body;

    // 1. Sign up the user with Supabase Auth
    const authResponse = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: `${firstName} ${lastName}`,
          phone,
          institution,
          department
        }
      }
    });

    if (authResponse.error) {
      return res.status(400).json({ 
        message: authResponse.error.message || 'Signup failed' 
      });
    }

    // 2. Add additional user data to your profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: authResponse.data.user.id,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        institution,
        department,
        created_at: new Date().toISOString()
      }]);

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // You might want to delete the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authResponse.data.user.id);
      return res.status(400).json({ 
        message: 'Profile creation failed' 
      });
    }

    return res.status(201).json({
      message: 'Signup successful',
      user: authResponse.data.user
    });

  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
}