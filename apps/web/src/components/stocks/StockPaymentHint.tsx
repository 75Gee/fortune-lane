import { STOCKS, type stockPaymentQuote } from '@fortune/game'
import { stockMoney } from './format.js'

export function StockPaymentHint({ payment, onWin = false }: { payment: ReturnType<typeof stockPaymentQuote>; onWin?: boolean }) {
  if (!payment.allowed || !payment.stockFunding) return null
  const sales = payment.stockFunding.stockSales.map(sale => `${STOCKS.find(stock => stock.id === sale.stockId)!.name} ${sale.quantity.toLocaleString('zh-CN')} 股`).join('、')
  return <p className="stock-payment-hint" role="status">{onWin ? '中标后卖出' : '卖出'}{sales} · 到账 {stockMoney(payment.proceeds)}{onWin && '。未中标不卖股。'}</p>
}
