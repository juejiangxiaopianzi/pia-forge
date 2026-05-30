/**
 * REST API v1 · 统一响应格式
 * 所有 /api/v1/* 路由都用这套 helper，保证响应一致性。
 */

import { NextResponse } from 'next/server';

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function created<T>(data: T) {
  return NextResponse.json({ ok: true, data }, { status: 201 });
}

export function fail(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json(
    { ok: false, error: { code, message, details } },
    { status }
  );
}

export const errUnauthorized = () => fail(401, 'unauthorized', '缺少或无效的 API Token（Authorization: Bearer <token>）');
export const errForbidden = (scope?: string) => fail(403, 'forbidden', scope ? `Token 缺少 scope: ${scope}` : '权限不足');
export const errNotFound = (what = '资源') => fail(404, 'not_found', `${what}不存在`);
export const errBadRequest = (msg: string, details?: unknown) => fail(400, 'bad_request', msg, details);
export const errServer = (msg: string) => fail(500, 'server_error', msg);
