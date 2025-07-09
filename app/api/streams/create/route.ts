import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {prismaClient} from "@/lib/db";        // Adjust if needed
import { authOptions } from "@/lib/auth";

export async function POST() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find the user in DB
  const userInDb = await prismaClient.user.findUnique({
    where: { email: user.email },
  });

  if (!userInDb) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Create a stream session with unique code
  const streamCode = nanoid(8); // e.g., "a1b2c3d4"

  const streamSession = await prismaClient.streamSession.create({
    data: {
      code: streamCode,
      userId: userInDb.id,
    },
  });

  return NextResponse.json({ streamCode });
}
