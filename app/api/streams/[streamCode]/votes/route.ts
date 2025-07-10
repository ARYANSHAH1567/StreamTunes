// app/api/streams/[streamCode]/votes/route.ts
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

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const streamSession = await prisma.streamSession.findUnique({
      where: { code: streamCode },
      include: {
        streams: {
          include: {
            upvotes: {
              where: { userId: user.id }
            }
          }
        }
      }
    })

    if (!streamSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const votedStreamIds = streamSession.streams
      .filter(stream => stream.upvotes.length > 0)
      .map(stream => stream.id)

    return NextResponse.json({ votedStreamIds })
  } catch (error) {
    console.error('Error fetching votes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}