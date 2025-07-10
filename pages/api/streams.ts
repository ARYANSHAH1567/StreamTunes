// pages/api/youtube-info.ts
import { prismaClient } from "@/lib/db";
import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { GetVideoDetails } from "youtube-search-api";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const YT_REGEX =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})([&?].*)?$/;

const createStreamSchema = z.object({
  sessionId: z.string(),
  url: z.string(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const session = await getServerSession(req, res, authOptions);
  const user = session?.user;

  if (!user?.email) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userInDb = await prismaClient.user.findUnique({
    where: { email: user.email },
  });

  if (!userInDb) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  try {
    const data = createStreamSchema.parse(req.body);

    const streamSession = await prismaClient.streamSession.findFirst({
      where: {
        id: data.sessionId,
        isActive: true,
      },
    });

    if (!streamSession) {
      res.status(404).json({ error: "Invalid session" });
      return;
    }

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentStream = await prismaClient.stream.findFirst({
      where: {
        sessionId: data.sessionId,
        createdAt: {
          gt: tenMinutesAgo,
        },
      },
    });

    if (recentStream) {
      const cooldownEnd = new Date(recentStream.createdAt.getTime() + 10 * 60 * 1000);
      res.status(429).json({
        error: "Please wait 10 minutes before adding another song",
        cooldownEnd,
      });
      return;
    }

    const isYt = YT_REGEX.test(data.url);
    if (!isYt) {
      res.status(400).json({
        error: "Invalid YouTube URL",
        details: "The provided URL does not match the expected YouTube format.",
      });
      return;
    }

    const videoId = data.url.split("v=")[1].substring(0, 11);

    const existingStream = await prismaClient.stream.findFirst({
      where: {
        sessionId: data.sessionId,
        extractedId: videoId,
        active: true,
      },
    });

    if (existingStream) {
      res.status(400).json({ error: "This video is already in the queue" });
      return;
    }

    const ytDetails = await GetVideoDetails(videoId);
    const thumbnails = ytDetails.thumbnail.thumbnails;
    thumbnails.sort((a: { width: number }, b: { width: number }) =>
      a.width < b.width ? -1 : 1
    );

    const stream = await prismaClient.stream.create({
      data: {
        sessionId: data.sessionId,
        url: data.url,
        extractedId: videoId,
        type: "Youtube",
        title: ytDetails.title || "Untitled Video",
        smallImg:
          thumbnails.length > 1
            ? thumbnails[thumbnails.length - 2].url
            : thumbnails[thumbnails.length - 1].url,
        bigImg: thumbnails[thumbnails.length - 1].url,
        active: true,
      },
    });

    res.status(201).json({
      message: "Stream created successfully",
      id: stream.id,
      stream,
    });
  } catch (error) {
    console.log("Error creating stream:", error);
    res.status(400).json({
      error: "Invalid request data",
      details: error instanceof z.ZodError ? error.errors : "Unknown error",
    });
  }
}
