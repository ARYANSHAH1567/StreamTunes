// pages/api/youtube-info.ts
import { NextApiRequest, NextApiResponse } from "next";
import { GetVideoDetails } from "youtube-search-api";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const videoId = req.query.videoId;

  if (!videoId || typeof videoId !== "string") {
    res.status(400).json({ error: "Video ID is required" });
    return;
  }

  try {
    const ytRes = await GetVideoDetails(videoId);

    if (!ytRes) {
      res.status(404).json({ error: "Video not found" });
      return;
    }

    const thumbnails = ytRes.thumbnail.thumbnails;
    thumbnails.sort((a: { width: number }, b: { width: number }) =>
      a.width < b.width ? -1 : 1
    );

    const videoInfo = {
      title: ytRes.title || "Untitled Video",
      thumbnail:
        thumbnails.length > 1
          ? thumbnails[thumbnails.length - 2].url
          : thumbnails[thumbnails.length - 1].url,
      bigImg: thumbnails[thumbnails.length - 1].url,
    };

    res.status(200).json(videoInfo);
  } catch (error) {
    console.error("Error fetching video info:", error);
    res.status(500).json({
      error: "Failed to fetch video info",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
