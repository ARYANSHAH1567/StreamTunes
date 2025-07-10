
import { prismaClient } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
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

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userInDb = await prismaClient.user.findUnique({
    where: { email: user.email },
  });

  if (!userInDb) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const data = createStreamSchema.parse(await request.json());
    
    // Verify session exists and user has access
    const streamSession = await prismaClient.streamSession.findFirst({
      where: {
        id: data.sessionId,
        isActive: true,
      },
    });

    if (!streamSession) {
      return NextResponse.json({ error: "Invalid session" }, { status: 404 });
    }

    // Check cooldown - 10 minutes
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
      return NextResponse.json({
        error: "Please wait 10 minutes before adding another song",
        cooldownEnd,
      }, { status: 429 });
    }

    const isYt = YT_REGEX.test(data.url);
    if (!isYt) {
      return NextResponse.json({
        error: "Invalid YouTube URL",
        details: "The provided URL does not match the expected YouTube format.",
      }, { status: 400 });
    }

    const videoId = data.url.split("v=")[1].substring(0, 11);
    
    // Check if video already exists in this session
    const existingStream = await prismaClient.stream.findFirst({
      where: {
        sessionId: data.sessionId,
        extractedId: videoId,
        active: true,
      },
    });

    if (existingStream) {
      return NextResponse.json({
        error: "This video is already in the queue",
      }, { status: 400 });
    }

    const res = await GetVideoDetails(videoId);
    const thumbnails = res.thumbnail.thumbnails;
    thumbnails.sort((a: { width: number }, b: { width: number }) =>
      a.width < b.width ? -1 : 1
    );

    const stream = await prismaClient.stream.create({
      data: {
        sessionId: data.sessionId,
        url: data.url,
        extractedId: videoId,
        type: "Youtube",
        title: res.title || "Untitled Video",
        smallImg:
          thumbnails.length > 1 
            ? thumbnails[thumbnails.length - 2].url 
            : thumbnails[thumbnails.length - 1].url,
        bigImg: thumbnails[thumbnails.length - 1].url,
        active: true,
      },
    });

    return NextResponse.json({
      message: "Stream created successfully",
      id: stream.id,
      stream,
    }, { status: 201 });
  } catch (error) {
    console.log("Error creating stream:", error);
    return NextResponse.json({
      error: "Invalid request data",
      details: error instanceof z.ZodError ? error.errors : "Unknown error",
    }, { status: 400 });
  }
}