import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth-session';
import { db } from '@/lib/db';
import Breadcrumb from '@/components/Breadcrumb';
import MyReviewsClient from './MyReviewsClient';

export const dynamic = 'force-dynamic';

export default async function MyReviewsPage() {
  const session = await getSession();
  if (!session) redirect('/login?next=/my-reviews');

  const reviews = await db.reviewRequest.findMany({
    where: {
      organizationId: session.organizationId,
      reviewerUserId: session.userId,
      status: 'PENDING',
    },
    orderBy: { createdAt: 'desc' },
    include: {
      requester: { select: { id: true, name: true, email: true } },
    },
  });

  const items = reviews.map((r) => ({
    id: r.id,
    targetType: r.targetType,
    targetId: r.targetId,
    fieldName: r.fieldName,
    currentValue: r.currentValue,
    proposedValue: r.proposedValue,
    rationale: r.rationale,
    createdAt: r.createdAt.toISOString(),
    requester: r.requester,
  }));

  return (
    <div className="max-w-5xl space-y-6">
      <Breadcrumb items={[{ label: '待我审阅' }]} />
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-blue-600">My Reviews</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight">待我审阅</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
          Agent 或同事改了某条记录前先请你审阅 · 你可以批准 / 要求改 / 驳回 · 三种决策都会留痕。
        </p>
      </div>

      <MyReviewsClient initialItems={items} />
    </div>
  );
}
