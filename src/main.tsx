import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import Calculator from './components/Calculator'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Calculator />
  </StrictMode>,
)
