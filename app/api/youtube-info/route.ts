// app/api/youtube-info/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GetVideoDetails } from "youtube-search-api";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");

  if (!videoId) {
    return NextResponse.json({ error: "Video ID is required" }, { status: 400 });
  }

  try {
    const res = await GetVideoDetails(videoId);
    
    if (!res) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const thumbnails = res.thumbnail.thumbnails;
    thumbnails.sort((a: { width: number }, b: { width: number }) =>
      a.width < b.width ? -1 : 1
    );

    const videoInfo = {
      title: res.title || "Untitled Video",
      thumbnail: thumbnails.length > 1 
        ? thumbnails[thumbnails.length - 2].url 
        : thumbnails[thumbnails.length - 1].url,
      bigImg: thumbnails[thumbnails.length - 1].url,
    };

    return NextResponse.json(videoInfo);
  } catch (error) {
    console.error("Error fetching video info:", error);
    return NextResponse.json({ 
      error: "Failed to fetch video info",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}