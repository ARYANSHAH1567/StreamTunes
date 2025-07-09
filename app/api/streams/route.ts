import { prismaClient } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {GetVideoDetails} from "youtube-search-api";
const YT_REGEX =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})([&?].*)?$/;

const createStreamSchema = z.object({
  creatorId: z.string(),
  url: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const data = createStreamSchema.parse(await request.json());
    const isYt = YT_REGEX.test(data.url);

    if (!isYt) {
      return NextResponse.json(
        {
          error: "Invalid YouTube URL",
          details:
            "The provided URL does not match the expected YouTube format.",
        },
        {
          status: 400,
        }
      );
    }

    const videoId = data.url.split("v=")[1].substring(0, 11); // Extract the video ID from the URL
    const res = await GetVideoDetails(videoId);
    const thumbnails = res.thumbnail.thumbnails;
    thumbnails.sort((a: { width: number }, b: { width: number }) =>
      a.width < b.width ? -1 : 1
    );

    const stream = await prismaClient.stream.create({
      data: {
        // userId: data.creatorId,
        url: data.url,
        extractedId: videoId,
        type: "Youtube",
        title: res.title || "Untitled Video",
        //TODO add a image incase of no thumbnails
        smallImg:
          thumbnails.length > 1 ? thumbnails[thumbnails.length - 2].url : thumbnails[thumbnails.length - 1].url, // Second last thumbnail is usually the smallest
        bigImg: thumbnails[thumbnails.length - 1].url, // Last thumbnail is usually the biggest
      },
    });

    return NextResponse.json(
      {
        message: "Stream created successfully",
        id: stream.id,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.log("Error creating stream:", error);
    return NextResponse.json(
      {
        error: "Invalid request data",
        details: error instanceof z.ZodError ? error.errors : "Unknown error",
      },
      {
        status: 400,
      }
    );
  }
}

// export async function GET(request: NextRequest) {
//   const creatorId = request.nextUrl.searchParams.get("creatorId");
//   const streams = await prismaClient.stream.findMany({
//     where: {
//       userId: creatorId || undefined,
//     },
//   });
//   return NextResponse.json(streams, {
//     status: 200,
//   });
// }
