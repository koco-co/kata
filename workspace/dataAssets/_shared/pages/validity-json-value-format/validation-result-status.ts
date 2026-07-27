// validation-result-status.ts — 校验结果状态文本判定工具
//
// 校验结果查询列表的状态列文案存在「校验不通过 / 校验未通过 / 校验异常 / 校验失败」等
// 不通过类变体；用例只关心「是否不通过类状态」，不关心具体文案。

/**
 * 判断给定文本（通常为实例行 innerText）是否呈现不通过类校验状态。
 * 注意「校验通过」不包含「不通过/未通过」子串，因此不会被误判。
 */
export function isFailLikeValidationStatus(text: string): boolean {
  return /不通过|未通过|校验失败|校验异常|执行失败|失败/.test(text);
}
