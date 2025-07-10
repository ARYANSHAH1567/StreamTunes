"use client"

import { useState, useRef, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import YouTube, { type YouTubeProps } from "react-youtube"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Badge } from "@/app/components/ui/badge"
import { Music, ThumbsUp, ThumbsDown, Play, Users, Plus, Crown, Clock } from "lucide-react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Redirect } from "@/app/components/Redirect"

interface Stream {
  id: string
  title: string
  smallImg: string
  bigImg: string
  upvotes: number
  extractedId: string
  url: string
  active: boolean
  createdAt: string
}

interface StreamSession {
  id: string
  code: string
  isActive: boolean
  userId: string
  streams: Stream[]
}

interface User {
  id: string
  name: string
  email: string
  role: "Streamer" | "EndUser"
}

export default function Dashboard() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const streamCode = params.streamCode as string

  const [user, setUser] = useState<User | null>(null)
  const [streamSession, setStreamSession] = useState<StreamSession | null>(null)
  const [videoUrl, setVideoUrl] = useState("")
  const [previewVideo, setPreviewVideo] = useState<Stream | null>(null)
  const [currentStream, setCurrentStream] = useState<Stream | null>(null)
  const [queue, setQueue] = useState<Stream[]>([])
  const [loading, setLoading] = useState(true)
  const [addingVideo, setAddingVideo] = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [isVideoEnding, setIsVideoEnding] = useState(false)
  const [votedStreams, setVotedStreams] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<"Streamer" | "EndUser" | null>(null)
  const [videoKey, setVideoKey] = useState(0)
  const [lastAddTime, setLastAddTime] = useState<number | null>(null)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const [nextStream, setNextStream] = useState<Stream | null>(null)

  const playerRef = useRef<any>(null)
  const isProcessingNext = useRef(false)
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isTransitioning = useRef(false)

  const COOLDOWN_MINUTES = 10
  const COOLDOWN_MS = COOLDOWN_MINUTES * 60 * 1000

  // Cooldown timer effect
  useEffect(() => {
    if (lastAddTime && userRole === "EndUser") {
      const updateCooldown = () => {
        const elapsed = Date.now() - lastAddTime
        const remaining = Math.max(0, COOLDOWN_MS - elapsed)
        setCooldownRemaining(remaining)

        if (remaining > 0) {
          setTimeout(updateCooldown, 1000)
        }
      }
      updateCooldown()
    }
  }, [lastAddTime, userRole])

  // Load session data and user role
  useEffect(() => {
    if (status === "loading") return

    const loadSessionData = async () => {
      try {
        if (!session?.user) {
          router.push("/")
          return
        }

        // Get user role from cookie
        const roleResponse = await fetch("/api/get-user-role")
        const roleData = await roleResponse.json()
        setUserRole(roleData.role)

        // Load session data
        const sessionResponse = await fetch(`/api/streams/${streamCode}`)
        if (!sessionResponse.ok) {
          setError("Session not found")
          return
        }

        const sessionData = await sessionResponse.json()
        setStreamSession(sessionData)

        // Set user data
        setUser({
          id: (session.user as any).id || "",
          name: session.user.name || "Anonymous",
          email: session.user.email || "",
          role: roleData.role,
        })

        // Load current playing stream and queue
        if (sessionData.streams && sessionData.streams.length > 0) {
          const activeStreams = sessionData.streams.filter((s: Stream) => s.active)
          if (activeStreams.length > 0) {
            const sortedQueue = activeStreams.slice(1).sort((a: Stream, b: Stream) => b.upvotes - a.upvotes)
            setCurrentStream(activeStreams[0])
            setQueue(sortedQueue)
          }
        }

        // Load user's voted streams
        const votesResponse = await fetch(`/api/streams/${streamCode}/votes`)
        if (votesResponse.ok) {
          const votesData = await votesResponse.json()
          setVotedStreams(new Set(votesData.votedStreamIds))
        }

        // Load last add time for cooldown
        const lastAddResponse = await fetch(`/api/streams/${streamCode}/last-add`)
        if (lastAddResponse.ok) {
          const lastAddData = await lastAddResponse.json()
          if (lastAddData.lastAddTime) {
            setLastAddTime(new Date(lastAddData.lastAddTime).getTime())
          }
        }
      } catch (error) {
        console.error("Error loading session data:", error)
        setError("Failed to load session data")
      } finally {
        setLoading(false)
      }
    }

    loadSessionData()
  }, [session, status, streamCode, router])

  // Poll for updates every 5 seconds (less frequent to avoid conflicts)
  useEffect(() => {
    if (!streamSession) return

    // Poll for updates every 5 seconds (less frequent to avoid conflicts)
    const interval = setInterval(async () => {
      // Skip polling if we're in the middle of a transition or if there's an active video
      if (isTransitioning.current || isProcessingNext.current) {
        return
      }

      try {
        const response = await fetch(`/api/streams/${streamCode}`)
        if (response.ok) {
          const data = await response.json()
          const activeStreams = data.streams.filter((s: Stream) => s.active)

          if (activeStreams.length > 0) {
            const newCurrentStream = activeStreams[0]
            const newQueue = activeStreams.slice(1).sort((a: Stream, b: Stream) => b.upvotes - a.upvotes)

            // Only update if there's a significant change
            if (!currentStream) {
              // Only set if there's no current stream
              setCurrentStream(newCurrentStream)
              setVideoKey((prev) => prev + 1)
              setQueue(newQueue)
            } else if (currentStream.id !== newCurrentStream.id) {
              // Stream changed - but don't interrupt if we're transitioning
              if (!isTransitioning.current) {
                setCurrentStream(newCurrentStream)
                setVideoKey((prev) => prev + 1)
              }
            } else {
              // Just update votes and queue
              if (currentStream.upvotes !== newCurrentStream.upvotes) {
                setCurrentStream(newCurrentStream)
              }
              setQueue(newQueue)
            }
          } else if (!isTransitioning.current && !currentStream) {
            setCurrentStream(null)
            setQueue([])
          }
        }
      } catch (error) {
        console.error("Error polling updates:", error)
      }
    }, 5000) // Increased to 5 seconds

    return () => clearInterval(interval)
  }, [streamSession, streamCode, currentStream])

  const extractYouTubeId = (url: string): string | null => {
    if (!url || typeof url !== "string") return null

    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([A-Za-z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*v=([A-Za-z0-9_-]{11})/,
      /(?:https?:\/\/)?(?:m\.)?youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        return match[1]
      }
    }
    return null
  }

  const handleUrlChange = async (val: string) => {
    setVideoUrl(val)
    setPreviewVideo(null)
    setError(null)

    if (!val.trim()) {
      return
    }

    const id = extractYouTubeId(val)
    if (id) {
      setLoadingPreview(true)
      try {
        const response = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`,
        )

        if (!response.ok) {
          throw new Error("Video not found or unavailable")
        }

        const data = await response.json()
        setPreviewVideo({
          id: `preview_${Date.now()}`,
          title: data.title || "Unknown Title",
          smallImg: data.thumbnail_url || `https://img.youtube.com/vi/${id}/default.jpg`,
          bigImg: data.thumbnail_url || `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
          upvotes: 0,
          extractedId: id,
          url: val,
          active: true,
          createdAt: new Date().toISOString(),
        })
      } catch (error) {
        console.error("Error fetching video info:", error)
        setError("Failed to load video information")
      } finally {
        setLoadingPreview(false)
      }
    } else {
      setError("Please enter a valid YouTube URL")
    }
  }

  const addToQueue = async () => {
    if (!previewVideo || !streamSession || !user || addingVideo) {
      return
    }

    // Check cooldown for EndUsers
    if (userRole === "EndUser") {
      if (lastAddTime && Date.now() - lastAddTime < COOLDOWN_MS) {
        const remainingMs = COOLDOWN_MS - (Date.now() - lastAddTime)
        const remainingMinutes = Math.ceil(remainingMs / (1000 * 60))
        setError(`Please wait ${remainingMinutes} more minutes before adding another song`)
        return
      }
    }

    setAddingVideo(true)
    setError(null)

    try {
      const response = await fetch(`/api/streams/${streamCode}/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: previewVideo.url,
          extractedId: previewVideo.extractedId,
          title: previewVideo.title,
          smallImg: previewVideo.smallImg,
          bigImg: previewVideo.bigImg,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to add stream")
      }

      const newStream = await response.json()

      // Update last add time for cooldown
      if (userRole === "EndUser") {
        setLastAddTime(Date.now())
      }

      // Update local state immediately
      if (!currentStream) {
        setCurrentStream(newStream)
        setVideoKey((prev) => prev + 1)
      } else {
        setQueue((prev) => [...prev, newStream].sort((a, b) => b.upvotes - a.upvotes))
      }

      // Clear form
      setVideoUrl("")
      setPreviewVideo(null)
    } catch (error) {
      console.error("Error adding to queue:", error)
      setError("Failed to add video to queue")
    } finally {
      setAddingVideo(false)
    }
  }

  const vote = async (streamId: string, isUpvote: boolean) => {
    if (!user || votedStreams.has(streamId)) return

    try {
      const response = await fetch(`/api/streams/${streamCode}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          streamId,
          isUpvote,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to vote")
      }

      // Update local state - only affect queue, not current stream
      setQueue((prev) =>
        prev
          .map((stream) => {
            if (stream.id === streamId) {
              const newUpvotes = isUpvote ? stream.upvotes + 1 : Math.max(0, stream.upvotes - 1)
              return { ...stream, upvotes: newUpvotes }
            }
            return stream
          })
          .sort((a, b) => b.upvotes - a.upvotes),
      )

      // Also update current stream votes if it's the one being voted on
      if (currentStream && currentStream.id === streamId) {
        setCurrentStream((prev) => {
          if (!prev) return prev
          const newUpvotes = isUpvote ? prev.upvotes + 1 : Math.max(0, prev.upvotes - 1)
          return { ...prev, upvotes: newUpvotes }
        })
      }

      // Mark as voted
      setVotedStreams((prev) => new Set([...prev, streamId]))
    } catch (error) {
      console.error("Error voting:", error)
      setError("Failed to vote")
    }
  }

  const playNext = async () => {
    if (!streamSession || !user || isProcessingNext.current || queue.length === 0) return

    isProcessingNext.current = true
    isTransitioning.current = true

    try {
      const response = await fetch(`/api/streams/${streamCode}/next`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to play next")
      }

      const data = await response.json()

      if (data.nextStream) {
        const nextStream = data.nextStream

        // Immediate state updates for seamless transition
        setCurrentStream(nextStream)
        setQueue((prev) => prev.filter((stream) => stream.id !== nextStream.id))
        setVideoKey((prev) => prev + 1)

        // Clear any pending timeouts
        if (autoPlayTimeoutRef.current) {
          clearTimeout(autoPlayTimeoutRef.current)
        }
      } else {
        // No more videos in queue
        setTimeout(() => {
          setCurrentStream(null)
          setQueue([])
        }, 500)
      }
    } catch (error) {
      console.error("Error playing next:", error)
      setError("Failed to play next video")
    } finally {
      isProcessingNext.current = false
      setTimeout(() => {
        setIsVideoEnding(false)
        isTransitioning.current = false
      }, 300)
    }
  }

  const onPlayerReady: YouTubeProps["onReady"] = (e) => {
    playerRef.current = e.target
    // Ensure video starts playing immediately
    setTimeout(() => {
      e.target.playVideo()
    }, 100)
  }

  const onEnd: YouTubeProps["onEnd"] = async () => {
    console.log("Video ended, transitioning to next...")

    // Clear any existing timeout
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current)
    }

    // Check if there are videos in queue
    if (queue.length > 0 && !isProcessingNext.current) {
      // Pre-load next stream info immediately
      const nextStreamInfo = queue[0]
      setNextStream(nextStreamInfo)

      // Start transition immediately without showing empty state
      isTransitioning.current = true
      isProcessingNext.current = true

      try {
        const response = await fetch(`/api/streams/${streamCode}/next`, {
          method: "POST",
        })

        if (response.ok) {
          const data = await response.json()

          if (data.nextStream) {
            // Update states in the right order for seamless transition
            setCurrentStream(data.nextStream)
            setQueue((prev) => prev.filter((stream) => stream.id !== data.nextStream.id))
            setVideoKey((prev) => prev + 1)
            setNextStream(null)
          }
        }
      } catch (error) {
        console.error("Error playing next:", error)
        setError("Failed to play next video")
      } finally {
        isProcessingNext.current = false
        setTimeout(() => {
          isTransitioning.current = false
        }, 500)
      }
    } else {
      // No more videos - clean transition after a delay
      setTimeout(() => {
        setCurrentStream(null)
      }, 1000)
    }
  }

  const onError: YouTubeProps["onError"] = (e) => {
    console.error("YouTube player error:", e)
    setError("Video playback error. Trying next video...")

    // Auto-skip to next video on error with short delay
    if (queue.length > 0 && !isProcessingNext.current) {
      autoPlayTimeoutRef.current = setTimeout(async () => {
        await playNext()
      }, 1000)
    }
  }

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current)
      }
    }
  }, [])

  const isStreamer = userRole === "Streamer"
  const canAddVideo = !addingVideo && !loadingPreview && previewVideo && (isStreamer || cooldownRemaining === 0)

  const formatCooldownTime = (ms: number) => {
    const minutes = Math.floor(ms / (1000 * 60))
    const seconds = Math.floor((ms % (1000 * 60)) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const opts: YouTubeProps["opts"] = {
    width: "100%",
    height: "100%",
    playerVars: {
      autoplay: 1,
      controls: isStreamer ? 1 : 0,
      disablekb: isStreamer ? 0 : 1,
      modestbranding: 1,
      rel: 0,
      iv_load_policy: 3,
      fs: isStreamer ? 1 : 0,
      playsinline: 1,
    },
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (error && !streamSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-4">{error}</div>
          <Button onClick={() => router.push("/")} variant="outline">
            Go Home
          </Button>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Please log in to continue</div>
      </div>
    )
  }

  return (
    <>
    <Redirect/>
   
    <div className="min-h-screen bg-slate-950">
      <header className="px-4 lg:px-6 h-16 flex items-center justify-between border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
            <Music className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            StreamTunes Dashboard
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {streamSession && (
            <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2" />
              Room: {streamSession.code}
            </Badge>
          )}
          <Badge
            className={
              isStreamer
                ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                : "bg-blue-500/10 text-blue-400 border-blue-500/20"
            }
          >
            {isStreamer ? (
              <>
                <Crown className="w-3 h-3 mr-1" />
                Streamer
              </>
            ) : (
              <>
                <Users className="w-3 h-3 mr-1" />
                Viewer
              </>
            )}
          </Badge>
          <span className="text-slate-300 text-sm">Hi, {user.name}!</span>
        </div>
      </header>

      <div className="container mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Play className="w-5 h-5 text-blue-400" />
                  Now Playing
                </span>
                {!isStreamer && (
                  <Badge className="bg-slate-700 text-slate-400 text-[10px]">Viewer Mode – no controls</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video rounded-lg overflow-hidden bg-black">
                {currentStream ? (
                  <YouTube
                    key={`${currentStream.id}-${videoKey}`}
                    videoId={currentStream.extractedId}
                    opts={opts}
                    onReady={onPlayerReady}
                    onEnd={onEnd}
                    onError={onError}
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <Music className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No video playing</p>
                      <p className="text-sm">Add videos to the queue to start</p>
                    </div>
                  </div>
                )}
              </div>

              {currentStream && (
                <div className="flex items-center justify-between pt-4">
                  <div>
                    <h3 className="text-white font-medium">{currentStream.title}</h3>
                    <p className="text-slate-400 text-xs">Votes: {currentStream.upvotes}</p>
                  </div>
                  {isStreamer ? (
                    <Button
                      onClick={playNext}
                      disabled={queue.length === 0 || isVideoEnding}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Skip ({queue.length})
                    </Button>
                  ) : (
                    <div className="text-right">
                      <span className="text-slate-500 text-xs block">Next video auto-plays</span>
                      {queue.length > 0 && (
                        <span className="text-blue-400 text-xs">Up next: {queue[0].title.substring(0, 30)}...</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-400" />
                Add YouTube Link
                {userRole === "EndUser" && cooldownRemaining > 0 && (
                  <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 ml-auto">
                    <Clock className="w-3 h-3 mr-1" />
                    Cooldown: {formatCooldownTime(cooldownRemaining)}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="https://youtu.be/… or https://youtube.com/watch?v=…"
                  value={videoUrl}
                  onChange={(e: any) => handleUrlChange(e.target.value)}
                  className="flex-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  disabled={addingVideo || (userRole === "EndUser" && cooldownRemaining > 0)}
                />
                <Button
                  onClick={addToQueue}
                  disabled={!canAddVideo}
                  className="bg-cyan-600 hover:bg-cyan-700 min-w-[80px]"
                >
                  {addingVideo ? "Adding..." : "Add"}
                </Button>
              </div>

              {userRole === "EndUser" && cooldownRemaining > 0 && (
                <div className="text-orange-400 text-sm bg-orange-500/10 border border-orange-500/20 rounded p-2">
                  You can add another song in {formatCooldownTime(cooldownRemaining)}
                </div>
              )}

              {error && (
                <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded p-2">{error}</div>
              )}

              {loadingPreview && (
                <div className="flex gap-4 bg-slate-800 p-3 rounded-lg">
                  <div className="w-24 h-16 bg-slate-700 rounded animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-slate-700 rounded animate-pulse mb-2"></div>
                    <div className="h-3 bg-slate-700 rounded animate-pulse w-2/3"></div>
                  </div>
                </div>
              )}

              {previewVideo && !loadingPreview && (
                <div className="flex gap-4 bg-slate-800 p-3 rounded-lg">
                  <img
                    src={previewVideo.bigImg || "/placeholder.svg"}
                    alt={previewVideo.title}
                    className="w-24 h-16 rounded object-cover"
                  />
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium line-clamp-2">{previewVideo.title}</p>
                    <p className="text-slate-400 text-xs">
                      {currentStream ? "Will be added to queue" : "Will start playing immediately"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Music className="w-5 h-5 text-blue-400" />
                Queue ({queue.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {currentStream && (
                  <div className="p-3 bg-gradient-to-r from-blue-900/50 to-cyan-900/50 border border-blue-500/30 rounded-lg flex gap-3">
                    <div className="relative shrink-0">
                      <img
                        src={currentStream.smallImg || "/placeholder.svg"}
                        alt={currentStream.title}
                        className="w-16 h-12 rounded object-cover"
                      />
                      <div className="absolute -top-1 -left-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <Play className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate font-medium">{currentStream.title}</p>
                      <p className="text-slate-300 text-[10px]">Votes: {currentStream.upvotes}</p>
                      <p className="text-green-400 text-xs font-medium mt-1">Now Playing</p>
                    </div>
                  </div>
                )}

                {queue.map((stream, i) => (
                  <div key={stream.id} className="p-3 bg-slate-800 rounded-lg flex gap-3">
                    <div className="relative shrink-0">
                      <img
                        src={stream.smallImg || "/placeholder.svg"}
                        alt={stream.title}
                        className="w-16 h-12 rounded object-cover"
                      />
                      <span className="absolute -top-1 -left-1 w-5 h-5 text-[10px] font-bold flex items-center justify-center rounded-full bg-blue-600 text-white">
                        {i + 1}
                      </span>
                      {i === 0 && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{stream.title}</p>
                      <p className="text-slate-500 text-[10px]">ID: {stream.extractedId}</p>
                      {i === 0 && <p className="text-yellow-400 text-xs font-medium mt-1">Up next!</p>}
                      <div className="flex items-center gap-1 mt-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-6 px-1 ${
                            votedStreams.has(stream.id) ? "text-green-600" : "text-green-400"
                          } hover:bg-green-500/10`}
                          onClick={() => vote(stream.id, true)}
                          disabled={votedStreams.has(stream.id)}
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </Button>
                        <span className="text-blue-400 text-xs w-6 text-center">{stream.upvotes}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-6 px-1 ${
                            votedStreams.has(stream.id) ? "text-red-600" : "text-red-400"
                          } hover:bg-red-500/10`}
                          onClick={() => vote(stream.id, false)}
                          disabled={votedStreams.has(stream.id)}
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {queue.length === 0 && !currentStream && !isTransitioning.current && (
                  <div className="py-8 text-center text-slate-400">
                    <Music className="mx-auto mb-2 w-12 h-12 opacity-50" />
                    No videos in queue
                  </div>
                )}

                {queue.length === 0 && currentStream && !isTransitioning.current && (
                  <div className="py-4 text-center text-slate-400">
                    <p className="text-sm">No more videos in queue</p>
                    <p className="text-xs">Add more videos to keep the music going!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </>
  )
}
