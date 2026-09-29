const zh = (value: number) => value.toLocaleString('zh-CN')

/** Whole-yuan amount, e.g. ¥12,600. */
export const formatMoney = (value: number) => `¥${zh(value)}`

/** Plain grouped number, e.g. 1,234. */
export const formatCount = zh
