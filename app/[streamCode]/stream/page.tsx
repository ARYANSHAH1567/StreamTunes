"use client"

import { useState, useRef, useEffect } from "react"
import YouTube, { type YouTubeProps } from "react-youtube"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Badge } from "@/app/components/ui/badge"
import { Music, ThumbsUp, ThumbsDown, Play, Users, Plus, Crown, Clock } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface Video {
  id: string
  title: string
  thumbnail: string
  votes: number
  youtubeId: string
  addedBy: string
  hasVoted?: boolean
}

interface User {
  id: string
  name: string
  role: 'Streamer' | 'EndUser'
}

interface StreamSession {
  id: string
  code: string
  isActive: boolean
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<StreamSession | null>(null)
  const [videoUrl, setVideoUrl] = useState("")
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null)
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null)
  const [queue, setQueue] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [addingVideo, setAddingVideo] = useState(false)
  const [cooldownEnd, setCooldownEnd] = useState<Date | null>(null)
  const [remainingCooldown, setRemainingCooldown] = useState(0)

  const playerRef = useRef<YouTubeProps["onReady"] extends (e: infer T) => any ? T : any>(null)

  // Extract user info from secure_cookie
  useEffect(() => {
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) return parts.pop()?.split(';').shift()
      return null
    }

    const cookieValue = getCookie('secure_cookie')
    if (cookieValue) {
      try {
        const userData = JSON.parse(decodeURIComponent(cookieValue))
        setUser({
          id: userData.id,
          name: userData.name || 'Anonymous',
          role: userData.role
        })
      } catch (error) {
        console.error('Error parsing cookie:', error)
        toast.error('Authentication error. Please refresh the page.')
      }
    }
  }, [])

  // Cooldown timer
  useEffect(() => {
    if (!cooldownEnd) return

    const timer = setInterval(() => {
      const now = new Date()
      const remaining = Math.max(0, cooldownEnd.getTime() - now.getTime())
      setRemainingCooldown(remaining)
      
      if (remaining <= 0) {
        setCooldownEnd(null)
        clearInterval(timer)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [cooldownEnd])

  // Fetch initial data
  useEffect(() => {
    if (!user) return
    
    const fetchData = async () => {
      try {
        // Get or create session
        const sessionResponse = await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id })
        })
        const sessionData = await sessionResponse.json()
        setSession(sessionData)

        // Fetch current queue
        await fetchQueue(sessionData.id)
        
        // Check cooldown
        const cooldownResponse = await fetch(`/api/cooldown?userId=${user.id}`)
        const cooldownData = await cooldownResponse.json()
        if (cooldownData.cooldownEnd) {
          setCooldownEnd(new Date(cooldownData.cooldownEnd))
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load session data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  const fetchQueue = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/queue?sessionId=${sessionId}&userId=${user?.id}`)
      const data = await response.json()
      
      if (data.queue) {
        setQueue(data.queue)
      }
      
      if (data.currentVideo) {
        setCurrentVideo(data.currentVideo)
      }
    } catch (error) {
      console.error('Error fetching queue:', error)
    }
  }

  const extractYouTubeId = (url: string): string | null => {
    const reg = /(?:youtube\.com\/.*v=|youtu\.be\/)([A-Za-z0-9_-]{11})/
    const m = url.match(reg)
    return m ? m[1] : null
  }

  const getVideoInfo = async (videoId: string) => {
    try {
      const response = await fetch(`/api/youtube-info?videoId=${videoId}`)
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching video info:', error)
      return null
    }
  }

  const handleUrlChange = async (val: string) => {
    setVideoUrl(val)
    const id = extractYouTubeId(val)
    
    if (id) {
      const videoInfo = await getVideoInfo(id)
      if (videoInfo) {
        setPreviewVideo({
          id: Date.now().toString(),
          title: videoInfo.title,
          thumbnail: videoInfo.thumbnail,
          votes: 0,
          youtubeId: id,
          addedBy: user?.name || 'You',
        })
      }
    } else {
      setPreviewVideo(null)
    }
  }

  const addToQueue = async () => {
    if (!previewVideo || !session || !user || addingVideo) return

    // Check cooldown
    if (cooldownEnd && new Date() < cooldownEnd) {
      toast.error(`Please wait ${Math.ceil(remainingCooldown / 1000 / 60)} minutes before adding another song`)
      return
    }

    setAddingVideo(true)
    
    try {
      const response = await fetch('/api/add-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          userId: user.id,
          url: videoUrl,
          extractedId: previewVideo.youtubeId,
          title: previewVideo.title,
          smallImg: previewVideo.thumbnail,
          bigImg: previewVideo.thumbnail,
          type: 'Youtube'
        })
      })

      const data = await response.json()
      
      if (data.success) {
        // Set 10-minute cooldown
        const cooldownEndTime = new Date(Date.now() + 10 * 60 * 1000)
        setCooldownEnd(cooldownEndTime)
        
        // Refresh queue
        await fetchQueue(session.id)
        
        // Clear form
        setVideoUrl("")
        setPreviewVideo(null)
        
        toast.success('Song added to queue!')
      } else {
        toast.error(data.error || 'Failed to add song')
      }
    } catch (error) {
      console.error('Error adding to queue:', error)
      toast.error('Failed to add song')
    } finally {
      setAddingVideo(false)
    }
  }

  const vote = async (streamId: string, isUpvote: boolean) => {
    if (!user) return

    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          streamId,
          isUpvote
        })
      })

      const data = await response.json()
      
      if (data.success) {
        // Refresh queue to get updated votes
        if (session) {
          await fetchQueue(session.id)
        }
      } else {
        toast.error(data.error || 'Failed to vote')
      }
    } catch (error) {
      console.error('Error voting:', error)
      toast.error('Failed to vote')
    }
  }

  const playNext = async () => {
    if (!session || !user || user.role !== 'Streamer') return

    try {
      const response = await fetch('/api/play-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id })
      })

      const data = await response.json()
      
      if (data.success && data.nextVideo) {
        setCurrentVideo(data.nextVideo)
        await fetchQueue(session.id)
        
        // Load next video in player
        if (playerRef.current) {
          playerRef.current.loadVideoById(data.nextVideo.youtubeId)
        }
      }
    } catch (error) {
      console.error('Error playing next:', error)
      toast.error('Failed to skip to next song')
    }
  }

  const onPlayerReady: YouTubeProps["onReady"] = (e) => {
    playerRef.current = e.target
    e.target.playVideo()
  }

  const onEnd: YouTubeProps["onEnd"] = async () => {
    if (queue.length > 0) {
      await playNext()
    }
  }

  const formatCooldownTime = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 1000 / 60)
    const seconds = Math.floor((milliseconds / 1000) % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const isStreamer = user?.role === 'Streamer'

  const opts: YouTubeProps["opts"] = {
    width: "100%",
    height: "100%",
    playerVars: {
      autoplay: 1,
      controls: isStreamer ? 1 : 0,
      disablekb: isStreamer ? 0 : 1,
      modestbranding: 1,
      rel: 0,
    },
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
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
          {session && (
            <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2" />
              Room: {session.code}
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
                {currentVideo ? (
                  <YouTube
                    videoId={currentVideo.youtubeId}
                    opts={opts}
                    onReady={onPlayerReady}
                    onEnd={onEnd}
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <Music className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No video playing</p>
                    </div>
                  </div>
                )}
              </div>

              {currentVideo && (
                <div className="flex items-center justify-between pt-4">
                  <div>
                    <h3 className="text-white font-medium">{currentVideo.title}</h3>
                    <p className="text-slate-400 text-xs">Added by {currentVideo.addedBy}</p>
                  </div>

                  {isStreamer ? (
                    <Button onClick={playNext} disabled={queue.length === 0} className="bg-blue-600 hover:bg-blue-700">
                      <Play className="w-4 h-4 mr-2" />
                      Skip ({queue.length})
                    </Button>
                  ) : (
                    <span className="text-slate-500 text-xs">Next video auto-plays</span>
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
                {cooldownEnd && (
                  <Badge className="bg-red-500/10 text-red-400 border-red-500/20 ml-2">
                    <Clock className="w-3 h-3 mr-1" />
                    Cooldown: {formatCooldownTime(remainingCooldown)}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="https://youtu.be/…"
                  value={videoUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  className="flex-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  disabled={addingVideo || (cooldownEnd && new Date() < cooldownEnd) || false}
                />
                <Button 
                  onClick={addToQueue} 
                  disabled={!previewVideo || addingVideo || (cooldownEnd && new Date() < cooldownEnd) || false} 
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  {addingVideo ? 'Adding...' : 'Add'}
                </Button>
              </div>

              {previewVideo && (
                <div className="flex gap-4 bg-slate-800 p-3 rounded-lg">
                  <img
                    src={previewVideo.thumbnail || "/placeholder.svg"}
                    alt={previewVideo.title}
                    className="w-24 h-16 rounded object-cover"
                  />
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium line-clamp-2">{previewVideo.title}</p>
                    <p className="text-slate-400 text-xs">Will be added to queue</p>
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
                {queue.map((v, i) => (
                  <div key={v.id} className="p-3 bg-slate-800 rounded-lg flex gap-3">
                    <div className="relative shrink-0">
                      <img
                        src={v.thumbnail || "/placeholder.svg"}
                        alt={v.title}
                        className="w-16 h-12 rounded object-cover"
                      />
                      <span className="absolute -top-1 -left-1 w-5 h-5 text-[10px] font-bold flex items-center justify-center rounded-full bg-blue-600 text-white">
                        {i + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{v.title}</p>
                      <p className="text-slate-500 text-[10px]">by {v.addedBy}</p>

                      <div className="flex items-center gap-1 mt-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-6 px-1 ${v.hasVoted ? 'text-green-600' : 'text-green-400'} hover:bg-green-500/10`}
                          onClick={() => vote(v.id, true)}
                          disabled={v.hasVoted}
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </Button>
                        <span className="text-blue-400 text-xs w-6 text-center">{v.votes}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-6 px-1 ${v.hasVoted ? 'text-red-600' : 'text-red-400'} hover:bg-red-500/10`}
                          onClick={() => vote(v.id, false)}
                          disabled={v.hasVoted}
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {queue.length === 0 && (
                  <div className="py-8 text-center text-slate-400">
                    <Music className="mx-auto mb-2 w-12 h-12 opacity-50" />
                    No videos in queue
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}