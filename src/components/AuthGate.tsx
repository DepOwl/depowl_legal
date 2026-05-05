import { useState } from 'react'

import { SignUpForm } from '@/components/SignUpForm'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldContent, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { logAuditEventFromClient } from '@/lib/auditLogs'
import { getSupabase } from '@/lib/supabase'

export function AuthGate() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const supabase = getSupabase()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (signInError) {
        setError(signInError.message)
      } else {
        void logAuditEventFromClient({
          action: 'auth.sign_in',
          table_name: 'auth.users',
          record_id: null,
          ip_address: null,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">DepOwl</h1>

      {mode === 'signup' ? (
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
          <SignUpForm />
          <Button
            type="button"
            variant="ghost"
            className="mt-4 w-full"
            onClick={() => {
              setMode('signin')
              setError(null)
            }}
          >
            Already have an account? Sign in
          </Button>
        </div>
      ) : (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Use your email and password to open the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSignIn}>
              <Field>
                <FieldLabel htmlFor="gate-email">Email</FieldLabel>
                <FieldContent>
                  <Input
                    id="gate-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(ev) => setEmail(ev.target.value)}
                    required
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="gate-password">Password</FieldLabel>
                <FieldContent>
                  <Input
                    id="gate-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(ev) => setPassword(ev.target.value)}
                    required
                  />
                </FieldContent>
              </Field>
              {error ? (
                <FieldError errors={[{ message: error }]} />
              ) : null}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
            {/* <Button
              type="button"
              variant="ghost"
              className="mt-4 w-full"
              onClick={() => {
                setMode('signup')
                setError(null)
              }}
            >
              Need an account? Create one
            </Button> */}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
