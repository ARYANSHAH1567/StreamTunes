// pages/api/streams/[streamCode]/next.ts
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prismaClient } from '@/lib/db'

const prisma =  prismaClient;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
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

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user || user.role !== 'Streamer') {
      return res.status(403).json({ error: 'Only streamers can skip' })
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
      return res.status(404).json({ error: 'Session not found' })
    }

    if (streamSession.userId !== user.id) {
      return res.status(403).json({ error: 'Only session owner can skip' })
    }

    const activeStreams = streamSession.streams.filter(s => s.active)
    const sortedStreams = activeStreams.sort((a, b) => {
      const aVotes = a.upvotes.reduce((count, vote) => count + (vote.isUpvote ? 1 : -1), 0)
      const bVotes = b.upvotes.reduce((count, vote) => count + (vote.isUpvote ? 1 : -1), 0)
      return bVotes - aVotes
    })

    if (sortedStreams.length > 0) {
      await prisma.stream.update({
        where: { id: sortedStreams[0].id },
        data: { active: false }
      })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error playing next:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
