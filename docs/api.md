# REST API v1

> Base URL: `https://your-pia-forge-server.com/api/v1`

## 鉴权

所有端点都要求 Bearer Token：

```
Authorization: Bearer pia_xxxxxxxx.xxxxxxxxxxxxxxxx
X-Agent-Name: claude-code           # 可选 · 在审计留痕里显示是谁干的
```

Token 在 PIA Forge 控制台「设置 → API Tokens」创建。

## 响应格式

```json
{ "ok": true,  "data": {...} }        // 成功
{ "ok": false, "error": { "code": "...", "message": "...", "details": {} } }  // 失败
```

## Endpoints

### Health

```
GET /health
```

### Projects（评估项目 · 所有 module 共用）

```
GET    /projects                          列出全部
POST   /projects                          创建（assessmentType: PIA|AUDIT|FILING|NOTICE|INCIDENT）
GET    /projects/{id}                     详情
PATCH  /projects/{id}                     更新
```

### Risks

```
GET    /projects/{id}/risks               列出
POST   /projects/{id}/risks               创建（likelihood/severity → 自动算 riskLevel）
```

### Mitigations

```
GET    /projects/{id}/mitigations         列出（含 residualLevel）
POST   /projects/{id}/mitigations         创建
```

### Data Items / Scenarios / Conclusions

```
GET    /projects/{id}/data-items
POST   /projects/{id}/data-items

GET    /projects/{id}/scenarios
POST   /projects/{id}/scenarios

GET    /projects/{id}/conclusions
POST   /projects/{id}/conclusions
```

### Report

```
GET    /projects/{id}/report?format=md|json
```

## 完整示例 · 在 Bash 里跑通一个 PIA

```bash
TOKEN="pia_xxxxxxxx.xxxxxxxxxxxxxxxx"
API="https://your-pia-forge-server.com/api/v1"

# 1. 创建一个 PIA 项目
PROJECT=$(curl -s -X POST $API/projects \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "code": "PIA-DEMO-001",
    "title": "我的第一个 PIA",
    "scope": "示例数据出境业务",
    "purpose": "走一遍 API",
    "legalBases": ["PIPL §55-56"]
  }' | jq -r .data.id)

echo "Project ID: $PROJECT"

# 2. 加一条风险
curl -s -X POST $API/projects/$PROJECT/risks \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "name": "境外接收方所在地法律强制配合调取",
    "category": "CROSS_BORDER_JURISDICTION",
    "description": "境外接收方所在国可能强制其向监管提供数据",
    "likelihood": 3,
    "severity": 5,
    "legalClauses": "PIPL §41",
    "strategy": "TRANSFER"
  }' | jq

# 3. 拉报告
curl -s $API/projects/$PROJECT/report?format=md \
  -H "Authorization: Bearer $TOKEN"
```

## Scope 权限

| Scope | 含义 |
|-------|------|
| `READ_PROJECTS` | 读评估项目 / data-items / scenarios |
| `WRITE_PROJECTS` | 创建 / 更新项目 |
| `READ_RISKS` / `WRITE_RISKS` | 读 / 写风险 |
| `READ_MITIGATIONS` / `WRITE_MITIGATIONS` | 读 / 写控制措施 |
| `READ_CONCLUSIONS` / `WRITE_CONCLUSIONS` | 读 / 写结论 |
| `GENERATE_REPORT` | 拉报告 |
| `ADMIN` | 包含所有以上 |
