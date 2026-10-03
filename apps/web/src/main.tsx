import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/noto-serif-sc/700.css'
import '@fontsource/noto-serif-sc/900.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'
import './styles/tokens.css'
import './styles/global.css'
import './styles/gameplay.css'
import './styles/interface.css'
import './styles/cities.css'
// Global styles load first so component CSS Modules, injected by the imports below, win ties.
import { App } from './App.js'

const sceneName = new URLSearchParams(location.search).get('scene') ?? ''
const LocalScene =
  import.meta.env.DEV && sceneName === 'game'
    ? lazy(() => import('./board/GamePreview.js'))
    : import.meta.env.DEV && sceneName === 'lobby'
      ? lazy(() => import('./pages/LobbyPreview.js'))
      : import.meta.env.DEV && sceneName === 'models'
        ? lazy(() => import('./board/ModelGallery.js'))
        : import.meta.env.DEV &&
            [
              'go',
              'jail',
              'parking',
              'hospital',
              'items',
              'police',
              'cairo',
              'hong-kong',
              'bangkok',
              'singapore',
              'income',
              'tokyo',
              'seoul',
              'sydney',
              'melbourne',
              'dubai',
              'istanbul',
              'athens',
              'rome',
              'vienna',
              'berlin',
              'amsterdam',
              'barcelona',
              'paris',
              'london',
              'toronto',
              'new-york',
              'los-angeles',
              'san-francisco',
              'shanghai',
              'maintenance',
              'beijing',
            ].includes(sceneName)
          ? lazy(() => import('./board/ScenePreview.js'))
          : null

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {LocalScene ? (
      <Suspense fallback={null}>
        <LocalScene />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
