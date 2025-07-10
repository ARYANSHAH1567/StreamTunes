// pages/api/streams/[streamCode]/vote.ts
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@/app/generated/prisma'

const prisma = new PrismaClient()

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

    const { streamId, isUpvote } = req.body

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const existingVote = await prisma.upvote.findUnique({
      where: {
        userId_streamId: {
          userId: user.id,
          streamId
        }
      }
    })

    if (existingVote) {
      return res.status(400).json({ error: 'Already voted' })
    }

    await prisma.upvote.create({
      data: {
        userId: user.id,
        streamId,
        isUpvote
      }
    })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error voting:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
