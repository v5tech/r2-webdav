import React from 'react'
import ReactDOM from 'react-dom/client'
import { z } from 'zod'

import App from './App'
import './lib/i18n'
import { initTheme } from './lib/theme'
import './styles/globals.css'

z.config({ jitless: true })
initTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
