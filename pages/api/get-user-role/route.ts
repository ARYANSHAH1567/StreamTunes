import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const cookies = req.headers.get('cookie') || '';
  const cookieMap = new Map(
    cookies.split(';').map(c => {
      const [k, v] = c.trim().split('=');
      return [k, v];
    })
  );

  const secureCookie = cookieMap.get('secure_cookie');

  const role =
    secureCookie === 'true' ? 'Streamer' :
    secureCookie === 'false' ? 'EndUser' :
    'Unknown';

  return NextResponse.json({ role });
}
