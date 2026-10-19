import { createFileRoute, redirect } from '@tanstack/react-router'
import { supabase } from '../lib/supabase/client'
import { AuthForm } from '../components/AuthForm'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) throw redirect({ to: '/' })
  },
  component: LoginPage,
})

function LoginPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <AuthForm />
    </main>
  )
}
