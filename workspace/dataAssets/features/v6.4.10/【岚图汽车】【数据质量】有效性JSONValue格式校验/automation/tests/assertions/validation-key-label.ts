// validation-key-label.ts — 校验key在结果展示区的标签匹配工具
//
// 校验结果查询/质量报告中的规则卡片展示已勾选 key 时，
// 标签可能以「person-name」「person.name」「person > name」等层级分隔形式渲染；
// 这里把 key 名（name 为 path 以 "-" 连接）展开为容忍常见分隔符的 RegExp，
// 供 expect(...).toContainText(pattern) 使用。
// 实现按调用点契约重建，未经 live 验证。

/** 转义正则元字符（本地实现，避免对纯文本工具引入页面对象依赖）。 */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 构造校验key展示标签的匹配模式。
 * 将 key 名按 "-" 拆段后，允许段间出现 "-"、"."、">"、"→" 等分隔符及可选空白，
 * 因此「person-name」可同时命中「person-name」与「person.name」两类渲染。
 */
export function buildValidationKeyLabelPattern(keyName: string): RegExp {
  const segments = keyName.split("-").filter((segment) => segment.length > 0);
  if (segments.length === 0) {
    return new RegExp(escapeRegExp(keyName));
  }
  return new RegExp(segments.map(escapeRegExp).join("\\s*(?:-|\\.|>|→)\\s*"));
}
