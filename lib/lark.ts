/**
 * 飞书（Lark）集成引擎 · PIA Forge 审批通知用
 *
 * 用企业自建应用（喜庆儿 cli_a94d64e640f85bda）的 tenant_access_token：
 *   - 邮箱/手机 → open_id（绑定页用）
 *   - 给某人发交互卡片（审批通知用）
 *
 * 凭证走环境变量 LARK_CLIENT_ID / LARK_CLIENT_SECRET。
 * 没配凭证时所有函数安全降级（larkConfigured() 返回 false），不影响系统其它功能。
 */

const LARK_BASE = 'https://open.feishu.cn/open-apis';

let tokenCache: { token: string; expireAt: number } | null = null;

export function larkConfigured(): boolean {
  return !!(process.env.LARK_CLIENT_ID && process.env.LARK_CLIENT_SECRET);
}

async function getTenantToken(): Promise<string> {
  // tenant_access_token 有效期 ~2h · 提前 2 分钟过期重取
  if (tokenCache && tokenCache.expireAt > Date.now() + 120_000) return tokenCache.token;

  const app_id = process.env.LARK_CLIENT_ID;
  const app_secret = process.env.LARK_CLIENT_SECRET;
  if (!app_id || !app_secret) throw new Error('飞书凭证未配置（LARK_CLIENT_ID / LARK_CLIENT_SECRET）');

  const res = await fetch(`${LARK_BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id, app_secret }),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(`拿飞书 token 失败：${data.msg}（code ${data.code}）`);

  tokenCache = {
    token: data.tenant_access_token,
    expireAt: Date.now() + (data.expire ?? 7200) * 1000,
  };
  return tokenCache.token;
}

/**
 * 用邮箱或手机号换 open_id（绑定页用）。
 * 走 batch_get_id（tenant token 可用，无需 user 授权）。
 * 找不到返回 null。
 */
export async function resolveLarkOpenId(opts: { email?: string; mobile?: string }): Promise<string | null> {
  const token = await getTenantToken();
  const body: { emails?: string[]; mobiles?: string[] } = {};
  if (opts.email) body.emails = [opts.email.trim()];
  if (opts.mobile) body.mobiles = [opts.mobile.trim()];
  if (!body.emails && !body.mobiles) return null;

  const res = await fetch(`${LARK_BASE}/contact/v3/users/batch_get_id?user_id_type=open_id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(`查飞书用户失败：${data.msg}（code ${data.code}）`);

  const list: Array<{ user_id?: string }> = data.data?.user_list ?? [];
  const found = list.find((u) => u.user_id);
  return found?.user_id ?? null;
}

/**
 * 给某个 open_id 发飞书交互卡片。永不抛错（通知失败不该阻断业务），结果在返回值里。
 */
export async function sendLarkCard(
  openId: string,
  card: object,
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  try {
    if (!larkConfigured()) return { ok: false, error: '飞书凭证未配置' };
    const token = await getTenantToken();
    const res = await fetch(`${LARK_BASE}/im/v1/messages?receive_id_type=open_id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        receive_id: openId,
        msg_type: 'interactive',
        content: JSON.stringify(card),
      }),
    });
    const data = await res.json();
    if (data.code !== 0) return { ok: false, error: `${data.msg}（code ${data.code}）` };
    return { ok: true, messageId: data.data?.message_id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** 「待你审阅」通知卡片（A 通知用） */
export function reviewNotifyCard(input: {
  projectCode: string;
  projectTitle: string;
  summary: string;
  requesterName: string;
  openUrl: string;
}): object {
  return {
    config: { wide_screen_mode: true },
    header: {
      template: 'blue',
      title: { tag: 'plain_text', content: 'PIA Forge · 有一条待你审阅' },
    },
    elements: [
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: `**项目**：${input.projectCode} ${input.projectTitle}\n**事项**：${input.summary}\n**发起人**：${input.requesterName}`,
        },
      },
      { tag: 'hr' },
      { tag: 'div', text: { tag: 'lark_md', content: '点下方按钮打开系统处理 👇' } },
      {
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '打开审批 →' },
            type: 'primary',
            url: input.openUrl,
          },
        ],
      },
    ],
  };
}

/** 「绑定成功」验证卡片（绑定页用） */
export function bindSuccessCard(name: string, openUrl: string): object {
  return {
    config: { wide_screen_mode: true },
    header: {
      template: 'green',
      title: { tag: 'plain_text', content: 'PIA Forge · 飞书绑定成功' },
    },
    elements: [
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: `**${name}**，你的飞书已和 PIA Forge 绑定。\n以后有审阅/任务指派给你，会直接私信到这里。`,
        },
      },
      {
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '打开 PIA Forge →' },
            type: 'default',
            url: openUrl,
          },
        ],
      },
    ],
  };
}
