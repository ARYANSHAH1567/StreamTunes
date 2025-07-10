import { NextResponse } from 'next/server';

export async function POST(request: any) {
  // Get the cookie value from the request body
  const { isStreamer } = await request.json();

  const response = NextResponse.json(
    { message: `Cookie "${isStreamer}" set successfully` },
    { status: 200 }
  );

  console.log("Setting cookie with value:", isStreamer);

  // Set the HttpOnly cookie
  response.cookies.set({
    name: "secure_cookie",
    value: isStreamer ? "true" : "false", // Set the value based on isStreamer
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24, // 1 day
    path: "/",
  });

  return response;
}