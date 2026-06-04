/**
 * 审阅/指派的飞书通知 · 把「谁该看这事」真正推到人面前。
 * 通知失败永不阻断业务（包 try/catch）。
 */
import { db } from '@/lib/db';
import { sendLarkCard, reviewNotifyCard, appBaseUrl } from '@/lib/lark';

const TARGET_LABEL: Record<string, string> = {
  Risk: '风险',
  DataItem: '信息项',
  Mitigation: '控制措施',
  Scenario: '场景',
  Conclusion: '结论',
  PiaProject: '评估项目',
  PiaRole: '角色',
};

/** 有人/AI 发起了一条审阅请求 → 飞书私信 reviewer。 */
export async function notifyReviewRequest(r: {
  reviewerUserId: string;
  requesterUserId: string;
  targetType: string;
  fieldName: string | null;
  rationale: string | null;
}): Promise<void> {
  try {
    const reviewer = await db.user.findUnique({
      where: { id: r.reviewerUserId },
      select: { larkOpenId: true },
    });
    if (!reviewer?.larkOpenId) return; // 没绑飞书 → 静默跳过

    const requester = await db.user.findUnique({
      where: { id: r.requesterUserId },
      select: { name: true },
    });
    const label = TARGET_LABEL[r.targetType] || r.targetType;
    const reason = r.rationale || '（无说明）';
    const summary = r.fieldName
      ? `${label}「${r.fieldName}」有改动待你审：${reason}`
      : `${label}待你审：${reason}`;

    await sendLarkCard(
      reviewer.larkOpenId,
      reviewNotifyCard({
        projectCode: label,
        projectTitle: r.fieldName || '',
        summary,
        requesterName: requester?.name || '同事',
        openUrl: `${appBaseUrl()}/my-reviews`,
      }),
    );
  } catch {
    // 通知失败不影响审阅请求本身
  }
}
