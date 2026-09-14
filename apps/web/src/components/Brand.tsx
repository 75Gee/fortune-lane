import { Landmark } from 'lucide-react'

export function Brand() {
  return (
    <div className="brand" aria-label="大富翁世界之旅">
      <span className="brand-mark"><Landmark size={20} strokeWidth={2.2} /></span>
      <span>大富翁世界之旅</span>
    </div>
  )
}
