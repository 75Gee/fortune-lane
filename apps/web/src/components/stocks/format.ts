export const stockMoney = (value: number) => `¥${value.toLocaleString('zh-CN')}`
export const stockPrice = (cents: number) => `¥${(cents / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
export const stockPercent = (rate: number | null) => rate === null ? '—' : `${rate > 0 ? '+' : ''}${(rate * 100).toFixed(2)}%`
export const stockProfit = (amount: number) => `${amount > 0 ? '+' : amount < 0 ? '−' : ''}${stockMoney(Math.abs(amount))}`
export const stockTone = (value: number | null) => value === null || value === 0 ? 'stock-neutral' : value > 0 ? 'stock-positive' : 'stock-negative'
