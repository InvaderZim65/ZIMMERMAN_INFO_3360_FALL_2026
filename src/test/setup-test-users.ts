// src/test/setup-test-users.ts
// Creates test users with specific app_metadata roles using the service-role key.
// Run via: npm run setup:test-users

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
)

const TEST_USERS = [
  { email: 'admin@test.hockey', password: 'TestPass123!', role: 'admin' },
  { email: 'coach@test.hockey', password: 'TestPass123!', role: 'head_coach' },
  { email: 'scout@test.hockey', password: 'TestPass123!', role: 'assistant_scout' },
  { email: 'analyst@test.hockey', password: 'TestPass123!', role: 'video_analyst' },
  { email: 'medical@test.hockey', password: 'TestPass123!', role: 'medical_staff' },
]

async function setupTestUsers() {
  for (const user of TEST_USERS) {
    // Try to create, update role if already exists
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      app_metadata: { role: user.role },
    })
    if (error && error.message.includes('already')) {
      // Update existing user's role
      const { data: users } = await supabase.auth.admin.listUsers()
      const existing = users?.users?.find(u => u.email === user.email)
      if (existing) {
        await supabase.auth.admin.updateUserById(existing.id, {
          app_metadata: { role: user.role },
        })
        console.log(`Updated ${user.email} -> ${user.role}`)
      }
    } else if (data?.user) {
      console.log(`Created ${user.email} -> ${user.role}`)
    } else {
      console.error(`Failed ${user.email}:`, error?.message)
    }
  }
}

setupTestUsers().then(() => console.log('Done'))
