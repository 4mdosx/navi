'use client'
import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import VerificationCodeInput from './components/verification-code-input'
import { AnimatePresence, motion } from 'framer-motion'
import Icon from '@/components/icon'
import { login } from '../actions/auth'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const router = useRouter()

  const handleVerificationComplete = async (code: string) => {
    setLoading(true)
    const result = await login({
      code,
    })
    if (result.errors) {
      setErrors(result.errors)
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <AnimatePresence mode="wait">
        <motion.div
          key="verification"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          <Card className="border-none shadow-lg">
            <CardHeader className="space-y-1">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Icon icon="lucide:shield-check" className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-center text-2xl">
                Verification Required
              </CardTitle>
              <CardDescription className="text-center">
                Enter the 6-digit code sent on authenticator
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <VerificationCodeInput onComplete={handleVerificationComplete} />
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.back()}
                disabled={loading}
              >
                Back
              </Button>
              {errors.code && <p className="text-red-500">{errors.code[0]}</p>}
              {errors.password && (
                <p className="text-red-500">{errors.password[0]}</p>
              )}
            </CardFooter>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
