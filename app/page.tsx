'use client'
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Badge } from "@/app/components/ui/badge"
import { Music, Users, Play } from "lucide-react"
import Link from "next/link"
import { signIn, signOut, useSession } from "next-auth/react"
import { Redirect } from "./components/Redirect"
import { useRouter } from "next/navigation"

export default function Component() {

  const session = useSession();
  const router = useRouter();

  const handleClick = async (isStreamer: boolean) => {
    if(!session.data?.user) {
      await signIn();
      return;
    }
    const res = await fetch("/api/set-cookie", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ isStreamer }), // Send the value as JSON
  });

  const data = await res.json();
    if (isStreamer) {
      // 3a. If streamer, create a stream session
      const res = await fetch("/api/streams/create", {
        method: "POST",
      });

      if (!res.ok) {
        console.error("Failed to create stream session");
        console.error(await res.text());
        return;
      }

      const { streamCode } = await res.json();

      // 4a. Redirect streamer to stream page
      router.push(`/${streamCode}/stream`);
    } else {
      //redirect to join page
    }
  }

  return (
    <>
    {/* <Redirect /> */}
    <div className="flex flex-col min-h-screen bg-slate-950">
      {/* Header */}
      <header className="px-4 lg:px-6 h-16 flex items-center justify-between border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
            <Music className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            StreamTunes
          </span>
        </Link>
        <nav className="flex items-center gap-4 sm:gap-6">
          <Link
            href="#how-it-works"
            className="text-sm font-medium text-slate-300 hover:text-blue-400 transition-colors"
          >
            How It Works
          </Link>
          {!session.data?.user && (
          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 text-slate-300 hover:bg-slate-800 bg-transparent cursor-pointer"
            onClick={() => signIn()}
          >
            Sign In
          </Button>)}
          {session.data?.user && (
           <Button
            variant="outline"
            size="sm"
            className="border-slate-700 text-slate-300 hover:bg-slate-800 bg-transparent cursor-pointer"
            onClick={() => signOut()}
          >
            Sign Out
          </Button>)}
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_500px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-6">
                <div className="space-y-4">
                  <Badge className="w-fit bg-slate-800 text-blue-400 border-slate-700">
                    <Music className="w-3 h-3 mr-1" />
                    Fan-Powered Streams
                  </Badge>
                  <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-white">
                    Let Your Fans Choose the{" "}
                    <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                      Music
                    </span>
                  </h1>
                  <p className="max-w-[600px] text-slate-400 md:text-xl">
                    Give your audience the power to vote on tracks and create the perfect soundtrack for your streams.
                  </p>
                </div>
                <div className="flex flex-col gap-3 min-[400px]:flex-row">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
                    onClick={()=>handleClick(true)}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Streaming
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 bg-transparent"
                    onClick={()=>handleClick(false)}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Join as Fan
                  </Button>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-400/20 rounded-3xl blur-3xl"></div>
                <div className="relative mx-auto aspect-[5/6] overflow-hidden rounded-3xl shadow-2xl border border-slate-800 bg-slate-900">
                  {/* Mock Interface */}
                  <div className="p-6 h-full flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      </div>
                      <div className="text-slate-400 text-sm">StreamTunes Dashboard</div>
                    </div>

                    {/* Current Playing */}
                    <div className="bg-slate-800 rounded-lg p-4 mb-4">
                      <div className="text-slate-300 text-sm mb-2">Now Playing</div>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
                          <Music className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <div className="text-white font-medium">Synthwave Dreams</div>
                          <div className="text-slate-400 text-sm">Electronic Vibes</div>
                        </div>
                      </div>
                      <div className="mt-3 bg-slate-700 rounded-full h-2">
                        <div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2 rounded-full w-1/3"></div>
                      </div>
                    </div>

                    {/* Voting Queue */}
                    <div className="flex-1">
                      <div className="text-slate-300 text-sm mb-3">Fan Votes - Next Up</div>
                      <div className="space-y-3">
                        <div className="bg-slate-800 rounded-lg p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-700 rounded flex items-center justify-center">
                              <Music className="w-4 h-4 text-slate-400" />
                            </div>
                            <div>
                              <div className="text-white text-sm">Chill Beats</div>
                              <div className="text-slate-400 text-xs">Lo-fi Hip Hop</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-blue-400 text-sm font-medium">47 votes</div>
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                          </div>
                        </div>

                        <div className="bg-slate-800 rounded-lg p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-700 rounded flex items-center justify-center">
                              <Music className="w-4 h-4 text-slate-400" />
                            </div>
                            <div>
                              <div className="text-white text-sm">Rock Anthem</div>
                              <div className="text-slate-400 text-xs">Alternative Rock</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-cyan-400 text-sm font-medium">32 votes</div>
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                          </div>
                        </div>

                        <div className="bg-slate-800 rounded-lg p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-700 rounded flex items-center justify-center">
                              <Music className="w-4 h-4 text-slate-400" />
                            </div>
                            <div>
                              <div className="text-white text-sm">Jazz Fusion</div>
                              <div className="text-slate-400 text-xs">Smooth Jazz</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-slate-400 text-sm font-medium">18 votes</div>
                            <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Live indicator */}
                    <div className="mt-4 flex items-center justify-center gap-2 text-green-400 text-sm">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      Live - 1,247 viewers voting
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl text-white">How It Works</h2>
              <p className="max-w-[600px] text-slate-400 md:text-lg">Get started in three simple steps</p>
            </div>
            <div className="mx-auto grid max-w-4xl items-start gap-8 lg:grid-cols-3">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  1
                </div>
                <h3 className="text-xl font-bold text-white">Connect Your Stream</h3>
                <p className="text-slate-400">Link your streaming platform and add our overlay.</p>
              </div>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  2
                </div>
                <h3 className="text-xl font-bold text-white">Fans Vote</h3>
                <p className="text-slate-400">Your audience votes on tracks through chat or web interface.</p>
              </div>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  3
                </div>
                <h3 className="text-xl font-bold text-white">Music Plays</h3>
                <p className="text-slate-400">Most voted tracks play automatically.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-r from-blue-900 to-slate-900">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-6 text-center text-white">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Ready to Transform Your Stream?</h2>
                <p className="mx-auto max-w-[600px] text-slate-300 md:text-lg">
                  Join creators building stronger communities through interactive music - completely free.
                </p>
              </div>
              <div className="w-full max-w-sm space-y-2">
                <form className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    className="max-w-lg flex-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
                  />
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    Start Free
                  </Button>
                </form>
                <p className="text-xs text-slate-400">Completely free. No credit card required.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t border-slate-800 bg-slate-900">
        <p className="text-xs text-slate-400">© {new Date().getFullYear()} StreamTunes. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="#" className="text-xs hover:underline underline-offset-4 text-slate-400 hover:text-slate-300">
            Terms of Service
          </Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4 text-slate-400 hover:text-slate-300">
            Privacy Policy
          </Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4 text-slate-400 hover:text-slate-300">
            Support
          </Link>
        </nav>
      </footer>
    </div>
    </>
  )
}
