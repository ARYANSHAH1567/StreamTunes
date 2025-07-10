// app/api/streams/[streamCode]/add/route.ts
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
    const { url, extractedId, title, smallImg, bigImg } = await request.json()

    const streamSession = await prisma.streamSession.findUnique({
      where: { code: streamCode }
    })

    if (!streamSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Check if this video already exists in this session
    const existingStream = await prisma.stream.findUnique({
      where: {
        sessionId_extractedId: {
          sessionId: streamSession.id,
          extractedId: extractedId
        }
      }
    })

    if (existingStream) {
      return NextResponse.json({ error: 'Video already in queue' }, { status: 400 })
    }

    const newStream = await prisma.stream.create({
      data: {
        sessionId: streamSession.id,
        extractedId,
        type: 'Youtube',
        url,
        title,
        smallImg,
        bigImg,
        active: true
      },
      include: {
        upvotes: true
      }
    })

    return NextResponse.json({
      ...newStream,
      upvotes: 0
    })
  } catch (error) {
    console.error('Error adding stream:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
