import { ok } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  return ok({ status: 'ok', service: 'pia-forge', api: 'v1', time: new Date().toISOString() });
}
