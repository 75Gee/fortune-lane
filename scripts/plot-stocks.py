"""Plot real engine output: python3 scripts/plot-stocks.py [output directory]."""
import json
import sys
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager, ticker

out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[1] / 'docs/previews/stock-v8'
data = json.loads((out / 'simulation.json').read_text())
updates = data['updates']
font_names = {font.name for font in font_manager.fontManager.ttflist}
plt.rcParams['font.sans-serif'] = [name for name in ['PingFang SC', 'Heiti SC', 'Noto Sans CJK SC', 'Arial Unicode MS', 'DejaVu Sans'] if name in font_names]
plt.rcParams.update({'axes.unicode_minus': False, 'font.size': 10, 'figure.facecolor': '#f5f7fa', 'axes.facecolor': '#ffffff', 'axes.edgecolor': '#d8dee6', 'text.color': '#233348', 'axes.labelcolor': '#617184', 'xtick.color': '#617184', 'ytick.color': '#617184', 'savefig.facecolor': '#f5f7fa'})

def draw(ax, stock, run, summary, limits, compact=False):
    prices = [p['priceCents'] / 100 for p in run['stocks'][stock['id']]['history']]
    ax.plot(range(updates + 1), prices, color=stock['color'], lw=1.8)
    ax.axhline(100, color='#9aa8b6', lw=.8, ls=(0,(4,4)))
    ax.scatter([updates], [prices[-1]], s=18, color=stock['color'], zorder=3)
    ax.set_xlim(0, updates * 1.05); ax.set_ylim(*limits)
    ax.xaxis.set_major_locator(ticker.MultipleLocator(10 if updates <= 70 else 25))
    ax.yaxis.set_major_locator(ticker.MaxNLocator(4))
    ax.grid(axis='y', alpha=.22)
    ax.spines[['top','right']].set_visible(False)
    label = f"样本 {run['run']}  ·  期末 {prices[-1]:.2f}  ({summary['returnPercent']:+.1f}%)"
    ax.set_title(label, loc='left', fontsize=10 if compact else 12, pad=10)
    if not compact:
        ax.set_xlabel('行情变动次数'); ax.set_ylabel('每股价格 / 元')
        ax.text(.01, .03, f"种子 {run['seed']}  ·  至第 {summary['finalTurn']} 玩家回合", transform=ax.transAxes, fontsize=8, color='#768396')

limits_by_stock = {}
for stock in data['summaries']:
    all_prices = [p['priceCents']/100 for run in data['runs'] for p in run['stocks'][stock['id']]['history']]
    pad = (max(all_prices) - min(all_prices)) * .12
    limits = (max(0, min(all_prices)-pad), max(all_prices)+pad)
    limits_by_stock[stock['id']] = limits
    fig, axes = plt.subplots(3, 2, figsize=(13, 9), sharey=True)
    fig.subplots_adjust(left=.07, right=.97, top=.86, bottom=.07, hspace=.55, wspace=.18)
    fig.text(.07, .95, f"{stock['name']}  /  {stock['symbol']}", fontsize=23, weight='bold')
    fig.text(.07, .906, f"{stock['style']}  ·  5 次独立模拟 × {updates} 次行情变动  ·  起价 ¥100  ·  每 5 个玩家回合更新", fontsize=11, color='#617184')
    for ax, run, summary in zip(axes.flat, data['runs'], stock['runs']):
        draw(ax, stock, run, summary, limits)
    ax = axes.flat[-1]; ax.axis('off')
    mean = sum(s['meanAbsoluteChangePercent'] for s in stock['runs']) / 5
    text = (f"本轮样本观察\n平均每次绝对涨跌   {mean:.2f}%\n"
            f"期末收益范围   {min(s['returnPercent'] for s in stock['runs']):+.1f}% ～ {max(s['returnPercent'] for s in stock['runs']):+.1f}%\n\n"
            "同一股票五张图统一纵轴，虚线为起价。\n未平滑、未挑选；各股纵轴范围不同。\n样本用于评估游戏波动，不代表长期收益。")
    ax.text(.04, .93, text, transform=ax.transAxes, va='top', fontsize=10, linespacing=1.4)
    fig.savefig(out / f"{stock['id']}-5x{updates}.png", dpi=150)
    plt.close(fig)

fig, axes = plt.subplots(4, 5, figsize=(20, 11))
fig.subplots_adjust(left=.055, right=.985, top=.89, bottom=.065, hspace=.55, wspace=.25)
fig.text(.055, .955, f"股市 v{data['modelVersion']}  ·  20 条原始模拟路径", fontsize=25, weight='bold')
fig.text(.055, .92, f'每行一支股票，每列一个独立市场；每条曲线 {updates} 次更新，起价 ¥100。同一行统一纵轴，不同行刻度不同。', fontsize=12, color='#617184')
for row, stock in enumerate(data['summaries']):
    for col, (run, summary) in enumerate(zip(data['runs'], stock['runs'])):
        ax=axes[row,col]
        draw(ax, stock, run, summary, limits_by_stock[stock['id']], True)
        if col == 0: ax.set_ylabel(stock['name']+'\n价格 / 元')
        if row == 3: ax.set_xlabel('行情变动次数')
fig.savefig(out / 'overview-20-paths.png', dpi=130)
# A second view keeps all four stocks on exactly the same price scale.
common_low = min(bounds[0] for bounds in limits_by_stock.values())
common_high = max(bounds[1] for bounds in limits_by_stock.values())
for ax in axes.flat:
    ax.set_ylim(common_low, common_high)
fig.texts[1].set_text(f'每行一支股票，每列一个独立市场；每条曲线 {updates} 次更新。全部20张图统一纵轴，虚线为起价 ¥100。')
fig.savefig(out / 'overview-common-scale.png', dpi=130)
plt.close(fig)
print(out)

# Main deliverable: four readable panels, each with the same five fixed seeds.
fig, axes = plt.subplots(2, 2, figsize=(16, 10))
fig.subplots_adjust(left=.065, right=.97, top=.86, bottom=.08, hspace=.38, wspace=.19)
fig.text(.065, .956, f"股市 v{data['modelVersion']} · 四股走势对比", fontsize=26, weight='bold')
fig.text(.065, .912, f"5 个固定种子 · 每条 {updates} 次行情（{updates * 5} 次玩家交接）· 初始价格 100 元 · 各面板纵轴不同", fontsize=12, color='#617184')
colors = ['#287db3', '#e58936', '#299b78', '#a85fba', '#d55561']
for ax, stock in zip(axes.flat, data['summaries']):
    for run, color in zip(data['runs'], colors):
        prices = [p['priceCents'] / 100 for p in run['stocks'][stock['id']]['history']]
        ax.plot(range(updates + 1), prices, color=color, lw=1.6, label=f"样本 {run['run']}")
        if stock['id'] == 'tech':
            indices = [(event['turn'] - 1) // 5 for event in run.get('events', []) if event['kind'] in ['success', 'failure']]
            ax.scatter(indices, [prices[i] for i in indices], color=color, s=25, edgecolors='white', linewidths=.5, zorder=3)
    ax.axhline(100, color='#9aa8b6', lw=1, ls='--')
    ax.set_title(f"{stock['name']} · {stock['style']}", loc='left', fontsize=15, weight='bold', pad=12)
    ax.set_xlim(0, updates); ax.set_ylim(*limits_by_stock[stock['id']])
    ax.set_xlabel('行情次数'); ax.set_ylabel('每股价格 / 元')
    ax.grid(alpha=.18); ax.spines[['top','right']].set_visible(False)
    ax.legend(ncol=5, fontsize=8, loc='upper left', framealpha=.8)
fig.text(.065, .025, '同色代表同一局；事件股圆点为项目揭晓。原始报价直接连线，未筛选、未平滑；5 条示例不能代表总体概率。', fontsize=10, color='#617184')
fig.savefig(out / 'overview-four-stocks.png', dpi=150)
plt.close(fig)
