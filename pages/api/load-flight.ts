// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import fetchIgc from '../../lib/fetchIgc';
import { MovementTrace } from '../../types';
import examples from '../../examples.json';

export default async function loadFlight(
  req: NextApiRequest,
  res: NextApiResponse<MovementTrace | null>
) {
  const { id } = req.query;
  const url = examples.find((d) => d.id === id)?.igcUrl;
  if (!url) {
    res.status(404).json(null);
    return;
  }
  const data = await fetchIgc(url);
  res.status(200).json(data);
}
