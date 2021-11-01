// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import fetchIgc from '../../lib/fetchIgc';
import { MovementTrace } from '../../types';
import examples from '../../examples.json';

export default async function flight(
  req: NextApiRequest,
  res: NextApiResponse<MovementTrace | string | null>
) {
  const { id } = req.query;
  const entry = examples.find((d) => d.id === id);
  const url = entry?.igcUrl;
  if (!url) {
    res.status(404).json(null);
    return;
  }
  try {
    const data = await fetchIgc(url, { meta: entry });
    res.status(200).json(data);
  } catch (err) {
    res.status(500).send(`${err instanceof Error ? err.message : err}`);
  }
}
