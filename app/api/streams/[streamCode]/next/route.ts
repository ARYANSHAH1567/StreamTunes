// app/api/streams/[streamCode]/next/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@/app/generated/prisma'

const prisma = new PrismaClient()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ streamCode: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { streamCode } = await params

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user || user.role !== 'Streamer') {
      return NextResponse.json({ error: 'Only streamers can skip' }, { status: 403 })
    }

    const streamSession = await prisma.streamSession.findUnique({
      where: { code: streamCode },
      include: {
        streams: {
          include: {
            upvotes: true
          }
        }
      }
    })

    if (!streamSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Check if user owns this session
    if (streamSession.userId !== user.id) {
      return NextResponse.json({ error: 'Only session owner can skip' }, { status: 403 })
    }

    // Get currently playing stream and deactivate it
    const activeStreams = streamSession.streams.filter(s => s.active)
    const sortedStreams = activeStreams.sort((a, b) => {
      const aVotes = a.upvotes.reduce((count, vote) => count + (vote.isUpvote ? 1 : -1), 0)
      const bVotes = b.upvotes.reduce((count, vote) => count + (vote.isUpvote ? 1 : -1), 0)
      return bVotes - aVotes
    })

    if (sortedStreams.length > 0) {
      // Deactivate current stream
      await prisma.stream.update({
        where: { id: sortedStreams[0].id },
        data: { active: false }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error playing next:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
