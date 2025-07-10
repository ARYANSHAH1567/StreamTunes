"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Music, Users, ArrowRight, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface JoinSessionState {
  code: string
  loading: boolean
  error: string | null
  success: boolean
}

export default function JoinSession() {
  const router = useRouter()
  const [state, setState] = useState<JoinSessionState>({
    code: "",
    loading: false,
    error: null,
    success: false,
  })

  const handleCodeChange = (value: string) => {
    // Limit to 8 characters for nanoid
    const formattedCode = value.slice(0, 8)
    setState((prev) => ({
      ...prev,
      code: formattedCode,
      error: null,
    }))
  }

  const validateCode = (code: string): boolean => {
    // Code should be exactly 8 characters (nanoid format)
    return code.length === 8
  }

  const handleJoinSession = async () => {
    if (!validateCode(state.code)) {
      setState((prev) => ({
        ...prev,
        error: "Please enter a valid 8-character session code",
      }))
      return
    }

    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      // Simulate API call to join session
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Mock validation - in real app, this would be an API call
      // TODO: Replace with actual API call to validate session code
      // const isValidSession = await validateSessionCode(state.code)
      // if (!isValidSession) { ... }

      // Success
      setState((prev) => ({ ...prev, loading: false, success: true }))

      // Redirect to dashboard after short delay
      setTimeout(() => {
        router.push(`/${state.code}/stream`)
      }, 1500)
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Something went wrong. Please try again.",
      }))
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !state.loading && validateCode(state.code)) {
      handleJoinSession()
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="px-4 lg:px-6 h-16 flex items-center justify-between border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
            <Music className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            StreamTunes
          </span>
        </Link>
        <Link href="/" className="text-slate-400 hover:text-slate-300 text-sm">
          ← Back to Home
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-400/20 rounded-full blur-xl"></div>
              <div className="relative w-20 h-20 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-full flex items-center justify-center">
                <Users className="w-10 h-10 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Join a Stream</h1>
              <p className="text-slate-400">
                Enter the session code shared by your streamer to join their music voting session.
              </p>
            </div>
          </div>

          {/* Join Form */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-center">Enter Session Code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder="abc12345"
                  value={state.code}
                  onChange={(e: any) => handleCodeChange(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="text-center text-xl font-mono tracking-wider bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 h-14"
                  disabled={state.loading || state.success}
                  maxLength={8}
                />
                <p className="text-xs text-slate-500 text-center">8-character session code</p>
              </div>

              {/* Error Message */}
              {state.error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-red-400 text-sm">{state.error}</p>
                </div>
              )}

              {/* Success Message */}
              {state.success && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                  <p className="text-green-400 text-sm">Successfully joined! Redirecting to dashboard...</p>
                </div>
              )}

              <Button
                onClick={handleJoinSession}
                disabled={!validateCode(state.code) || state.loading || state.success}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 h-12"
              >
                {state.loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Joining Session...
                  </>
                ) : state.success ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Joined Successfully!
                  </>
                ) : (
                  <>
                    Join Session
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Info Cards */}
          <div className="grid grid-cols-1 gap-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center shrink-0">
                    <Music className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium text-sm">Vote on Music</h3>
                    <p className="text-slate-400 text-xs mt-1">
                      Help choose what plays next by voting on tracks in the queue.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-cyan-500/10 rounded-lg flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium text-sm">Join the Community</h3>
                    <p className="text-slate-400 text-xs mt-1">
                      Connect with other fans and influence the stream's soundtrack together.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/50 p-4">
        <div className="text-center">
          <p className="text-slate-500 text-xs">
            Don't have a code? Ask your streamer to share their session code with you.
          </p>
        </div>
      </footer>
    </div>
  )
}
