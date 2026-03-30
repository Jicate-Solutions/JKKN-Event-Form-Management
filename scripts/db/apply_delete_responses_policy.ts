import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or service role key');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  try {
    console.log('Applying form responses delete policy...');

    // Read the SQL file
    const sqlFilePath = path.join(
      process.cwd(),
      'lib/sql/add_form_responses_delete_policy.sql'
    );
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', {
      query: sql
    });

    if (error) {
      throw error;
    }

    console.log('Successfully applied delete responses policy');
  } catch (error) {
    console.error('Error applying delete responses policy:', error);
    process.exit(1);
  }
}

main();
