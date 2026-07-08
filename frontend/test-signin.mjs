import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mrgztqjkvaynxdqwxhfh.supabase.co';
const supabaseKey = 'sb_publishable_T8cH_CYOV2MuAb_0XNLXkg_G3m2D8yo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function signIn() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'password123'
  });
  console.log('SignIn Data:', data);
  console.log('SignIn Error:', error);
}

signIn();
