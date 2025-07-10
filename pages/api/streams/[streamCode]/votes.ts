// pages/api/streams/[streamCode]/votes.ts
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

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
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
      return res.status(404).json({ error: 'Session not found' })
    }

    const votedStreamIds = streamSession.streams
      .filter(stream => stream.upvotes.length > 0)
      .map(stream => stream.id)

    return res.status(200).json({ votedStreamIds })
  } catch (error) {
    console.error('Error fetching votes:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
