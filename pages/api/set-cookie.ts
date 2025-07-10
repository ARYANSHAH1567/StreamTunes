// pages/api/set-cookie.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method Not Allowed' });
    return;
  }

  const { isStreamer } = req.body;

  console.log('Setting cookie with value:', isStreamer);

  const cookieValue = isStreamer ? 'true' : 'false';

  res.setHeader('Set-Cookie', `secure_cookie=${cookieValue}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);

  res.status(200).json({ message: `Cookie "${cookieValue}" set successfully` });
}
