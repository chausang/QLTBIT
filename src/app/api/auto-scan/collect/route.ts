import { NextRequest } from 'next/server';
import { POST as v1Post } from '@/app/api/v1/auto-scan/collect/route';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  return v1Post(request);
}
