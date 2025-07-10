// pages/api/streams/[streamCode].ts
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@/app/generated/prisma'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { streamCode } = req.query
    if (typeof streamCode !== 'string') {
      return res.status(400).json({ error: 'Invalid streamCode' })
    }

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
      return res.status(404).json({ error: 'Session not found' })
    }

    // Calculate upvote counts
    const streamsWithVotes = streamSession.streams.map(stream => ({
      ...stream,
      upvotes: stream.upvotes.reduce((count, vote) => {
        return count + (vote.isUpvote ? 1 : -1)
      }, 0)
    }))

    return res.status(200).json({
      ...streamSession,
      streams: streamsWithVotes
    })
  } catch (error) {
    console.error('Error fetching stream session:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
