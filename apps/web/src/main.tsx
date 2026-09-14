import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.js'
import './styles/global.css'
import './styles/gameplay.css'

const sceneName = new URLSearchParams(location.search).get('scene') ?? ''
const LocalScene = import.meta.env.DEV && sceneName === 'game' ? lazy(() => import('./board/GamePreview.js')) : import.meta.env.DEV && sceneName === 'models' ? lazy(() => import('./board/ModelGallery.js')) : import.meta.env.DEV && [
  'go', 'jail', 'parking', 'hospital', 'items', 'police', 'cairo', 'hong-kong',
  'bangkok', 'singapore', 'income', 'tokyo', 'seoul', 'sydney', 'melbourne', 'dubai',
  'istanbul', 'athens', 'rome', 'vienna', 'berlin', 'amsterdam', 'barcelona', 'paris',
  'london', 'toronto', 'new-york', 'los-angeles', 'san-francisco', 'shanghai', 'maintenance', 'beijing',
].includes(sceneName)
  ? lazy(() => import('./board/ScenePreview.js'))
  : null

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {LocalScene ? <Suspense fallback={null}><LocalScene /></Suspense> : <App />}
  </StrictMode>,
)
