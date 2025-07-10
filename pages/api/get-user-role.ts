// pages/api/get-user-role.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method Not Allowed' });
    return;
  }

  const cookies = req.headers.cookie || '';
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

  res.status(200).json({ role });
}
