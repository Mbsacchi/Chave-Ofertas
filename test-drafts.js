import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if(match) envVars[match[1]] = match[2];
});

async function run() {
  const res = await fetch(`${envVars['VITE_SUPABASE_URL']}/rest/v1/draft_products?select=status&limit=1`, {
    headers: {
      'apikey': envVars['VITE_SUPABASE_ANON_KEY'],
      'Authorization': `Bearer ${envVars['VITE_SUPABASE_ANON_KEY']}`
    }
  });
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Data:', data);
}
run();
