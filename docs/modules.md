# Modules · 5 个 module 共用 1 个底座

## 为什么共用底座

合规人散落的工作 —— PIA / Audit / Filing / Notice / Incident —— 本质都是同一个抽象：

```
评估对象 + 范围
  └─ 角色 RACI
  └─ 信息 / 控制项清单
  └─ 风险 / 发现登记
  └─ 措施 / 整改追踪
  └─ 结论 / 意见签字
  └─ 审计留痕
```

底层 schema 一份就够。5 个 module 的差异化只在两个层面：
1. **UI 上的术语**（信息项 vs 控制点 / 风险 vs 审计发现 / ……）
2. **Agent 起草时的 prompt 模板**

实现上靠 `lib/module-labels.ts` + `skills/*-forge/` 解决。

## 各 module 适用范围

### PIA · 个人信息保护影响评估

**法律依据**：PIPL §55-56 / 数据出境安全评估办法 §5 / GB/T 39335-2020 / GB/T 45574-2025 / GB/T 35273-2020

**典型场景**：
- 处理敏感个人信息（人脸 / 身份证 / 健康 / 行踪）
- 自动化决策（推荐 / 信用评分 / 反诈）
- 共享或委托处理
- **数据出境**（PIA Forge v0.1 demo 数据是这个场景）
- 重大功能上线 / 重大业务变更

**核心字段语义**：
- DataItem = 信息项
- Scenario = 出境场景
- Risk = 风险
- Mitigation = 控制措施
- Conclusion = 评估结论

### AUDIT · 合规审计

**法律依据**：网安法 / 数安法 / 60 号文 / 等保 2.0 / ISO 27001 / 内审准则

**典型场景**：
- 集团对子公司合规审计
- 内审委季度 / 年度审计
- 监管入场检查后整改追踪
- 法务部门内审

**核心字段语义**：
- DataItem = 控制点（检查项）
- Scenario = 审计范围（业务流程）
- Risk = 审计发现（不符合 / 改进点）
- Mitigation = 整改项（含责任人 + 截止 + 验证）
- Conclusion = 审计意见

### FILING · 申报与备案台账

**法律依据**：数据出境安全评估办法 / SCC 办法 / 算法备案办法

**典型场景**：
- 网信办数据出境申报材料管理
- 承诺函 / SCC 合同台账
- 算法备案材料管理
- 监管多轮问询的答复版本管理

**核心字段语义**：
- DataItem = 申报字段
- Scenario = 申报路径
- Risk = 申报缺陷 / 争议点
- Mitigation = 补正动作
- Conclusion = 申报版本 / 回函

### NOTICE · 告知与同意版本管理

**法律依据**：PIPL §17 / §39 / §14（充分告知 + 单独同意）

**典型场景**：
- 隐私政策版本迭代
- 弹窗 / 同意流程改版
- 央办告知充分性整改
- 跨境告知页 / 接收方清单页

**核心字段语义**：
- DataItem = 告知要素
- Scenario = 告知场景（触发条件）
- Risk = 告知不充分点
- Mitigation = 改版动作
- Conclusion = 政策版本

### INCIDENT · 事件响应

**法律依据**：网安法 / 数安法 / 个保法事件通知义务

**典型场景**：
- 数据泄露事件响应
- 客诉处置
- 监管约谈应对
- 反诈线索处置 / 举报处置

**核心字段语义**：
- DataItem = 涉及数据
- Scenario = 事件场景（复盘）
- Risk = 影响维度评估
- Mitigation = 处置动作（时间线）
- Conclusion = 处置报告 / 对外口径

## 怎么开始用某个 module

1. 在 PIA Forge 网页点「新建评估」，选 module
2. 或者用 Agent 通过 MCP `create_project` + `assessmentType: "AUDIT"` 创建
3. 后续的 risks / mitigations / data-items 写入流程完全一致

## 跨 module 关联

虽然每个评估项目是独立的，但通过 link 字段可以关联：
- 一个 PIA 评估发现的高风险 → 转化为 INCIDENT 事件处置（未来 v0.3 加 link）
- 一份 FILING 申报材料 → 援引 PIA 的结论作为证据
- 一次 AUDIT 审计 → 自动调出该范围内的全部 PIA / Filing / Notice 状态

这种跨 module 视图是 v0.3 的重点。
