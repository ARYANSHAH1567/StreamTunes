// pages/api/streams/[streamCode]/add.ts
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

    const { url, extractedId, title, smallImg, bigImg } = req.body

    const streamSession = await prisma.streamSession.findUnique({
      where: { code: streamCode }
    })

    if (!streamSession) {
      return res.status(404).json({ error: 'Session not found' })
    }

    const existingStream = await prisma.stream.findUnique({
      where: {
        sessionId_extractedId: {
          sessionId: streamSession.id,
          extractedId: extractedId
        }
      }
    })

    if (existingStream) {
      return res.status(400).json({ error: 'Video already in queue' })
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

    return res.status(200).json({
      ...newStream,
      upvotes: 0
    })
  } catch (error) {
    console.error('Error adding stream:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
