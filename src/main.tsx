import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ensureSeeded } from './db/schema.ts'

// Standard-Kategorien/Einstellungen beim ersten Start anlegen.
ensureSeeded().catch((err) => console.error('Seeding fehlgeschlagen:', err))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
