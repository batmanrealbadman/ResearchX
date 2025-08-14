// /lib/supabase.js
import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase credentials
const supabaseUrl = 'https://wrmzehgbqjpiiaazmmgh.supabase.co';
const const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybXplaGdicWpwaWlhYXptbWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4Mjg4MjEsImV4cCI6MjA3MDQwNDgyMX0.9p5NdmJoUvRjPmApqZo1C7QZdfO1X9QCD72gD6fpr98
';

export const supabase = createClient(supabaseUrl, supabaseKey);