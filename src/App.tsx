import { SignUpForm } from '@/components/SignUpForm'
import { Toaster } from '@/components/ui/sonner'

function App() {
  return (
    <>
      <div className="flex min-h-svh flex-col items-center justify-center p-6">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
          <h1 className="mb-6 text-center text-2xl font-semibold tracking-tight">
            DepOwl
          </h1>
          <SignUpForm />
        </div>
      </div>
      <Toaster />
    </>
  )
}

export default App
