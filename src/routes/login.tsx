import { createFileRoute } from '@tanstack/react-router'
import { AuthForm } from '../components/AuthForm'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <AuthForm />
    </main>
  )
}
