// app/api/streams/[streamCode]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@/app/generated/prisma'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ streamCode: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { streamCode } = await params
    console.log('Stream code:', streamCode) // Debug log

    const streamSession = await prisma.streamSession.findUnique({
      where: { code: streamCode },
      include: {
        streams: {
          include: {
            upvotes: true
          }
        },
        user: true
      }
    })

    if (!streamSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Calculate upvote counts
    const streamsWithVotes = streamSession.streams.map(stream => ({
      ...stream,
      upvotes: stream.upvotes.reduce((count, vote) => {
        return count + (vote.isUpvote ? 1 : -1)
      }, 0)
    }))

    return NextResponse.json({
      ...streamSession,
      streams: streamsWithVotes
    })
  } catch (error) {
    console.error('Error fetching stream session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}