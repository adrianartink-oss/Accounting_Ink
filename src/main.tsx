import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ensureSeeded } from './db/schema.ts'
import { generateDueRecurring } from './db/repo.ts'

// Standard-Kategorien/Einstellungen anlegen, dann fällige wiederkehrende
// Buchungen erzeugen (idempotent).
ensureSeeded()
  .then(() => generateDueRecurring())
  .catch((err) => console.error('Initialisierung fehlgeschlagen:', err))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
