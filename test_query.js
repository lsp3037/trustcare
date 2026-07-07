import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function test() {
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const to = new Date();

  console.log('Testing query with OR...');
  const { data, error } = await supabase
    .from('service_orders')
    .select('id')
    .or(`and(created_at.gte.${from.toISOString()},created_at.lte.${to.toISOString()}),and(payment_date.gte.${from.toISOString()},payment_date.lte.${to.toISOString()})`);
  
  if (error) {
    console.error('ERROR:', error);
  } else {
    console.log('SUCCESS, count:', data?.length);
  }
}

test();
