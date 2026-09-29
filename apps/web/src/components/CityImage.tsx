const cityFiles: Readonly<Record<string, string>> = {
  曼谷: 'bangkok',
  新加坡: 'singapore',
  东京: 'tokyo',
  首尔: 'seoul',
  悉尼: 'sydney',
  墨尔本: 'melbourne',
  迪拜: 'dubai',
  伊斯坦布尔: 'istanbul',
  开罗: 'cairo',
  雅典: 'athens',
  罗马: 'rome',
  维也纳: 'vienna',
  柏林: 'berlin',
  阿姆斯特丹: 'amsterdam',
  巴塞罗那: 'barcelona',
  巴黎: 'paris',
  伦敦: 'london',
  多伦多: 'toronto',
  纽约: 'new-york',
  洛杉矶: 'los-angeles',
  旧金山: 'san-francisco',
  香港: 'hong-kong',
  上海: 'shanghai',
  北京: 'beijing',
  云海机场: 'airport',
  星湾机场: 'airport',
  金穗机场: 'airport',
  天际机场: 'airport',
  电力公司: 'electric-company',
  水利公司: 'water-company',
}

export function cityImageSource(city: string, thumbnail = false): string | undefined {
  const file = cityFiles[city]
  return file ? `/assets/cities/${thumbnail ? 'thumbnails/' : ''}${file}.webp` : undefined
}

/** Decorative city and facility artwork; the interface supplies the asset name. */
export function CityImage({
  city,
  className = '',
  thumbnail = false,
  loading = 'eager',
}: {
  city: string
  className?: string
  thumbnail?: boolean
  loading?: 'eager' | 'lazy'
}) {
  const src = cityImageSource(city, thumbnail)
  if (!src) return null
  return (
    <img
      className={`city-image ${className}`.trim()}
      src={src}
      alt=""
      aria-hidden="true"
      width={thumbnail ? 192 : 624}
      height={thumbnail ? 128 : 416}
      loading={loading}
      decoding="async"
    />
  )
}
