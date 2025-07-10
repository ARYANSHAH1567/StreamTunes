// pages/api/streams/create.ts
import { nanoid } from "nanoid";
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { prismaClient } from "@/lib/db";
import { authOptions } from "@/lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const session = await getServerSession(req, res, authOptions);
  const user = session?.user;

  if (!user?.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userInDb = await prismaClient.user.findUnique({
    where: { email: user.email },
  });

  if (!userInDb) {
    return res.status(404).json({ error: "User not found" });
  }

  const streamCode = nanoid(8); // e.g., "a1b2c3d4"

  const streamSession = await prismaClient.streamSession.create({
    data: {
      code: streamCode,
      userId: userInDb.id,
    },
  });

  return res.status(200).json({ streamCode });
}
