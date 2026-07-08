import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mrgztqjkvaynxdqwxhfh.supabase.co';
const supabaseKey = 'sb_publishable_T8cH_CYOV2MuAb_0XNLXkg_G3m2D8yo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- SUPABASE BAĞLANTI TESTİ ---');
  console.log('URL:', supabaseUrl);
  console.log('Key: Mevcut (Anonim/Publishable)');
  
  console.log('\n1. auth.users (Kullanıcılar) Tablosunu Okuma Denemesi:');
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.log('HATA:', userError.message);
    console.log('AÇIKLAMA: Anonim anahtarla auth.users tablosu okunamıyor. Service Role (Admin) anahtarı gerekiyor.');
  } else {
    console.log('Kullanıcılar:', users);
  }

  console.log('\n2. public.wallets Tablosunu Okuma Denemesi (Kullanıcı verisi bulmak için):');
  const { data: wallets, error: walletError } = await supabase.from('wallets').select('*');
  if (walletError) {
    console.log('HATA:', walletError.message);
  } else {
    console.log('Sonuç:', wallets.length === 0 ? 'Boş (RLS politikası anonim erişimi engelliyor)' : wallets);
  }
}

run();
