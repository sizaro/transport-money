import { BrowserRouter } from 'react-router-dom'
import { AppProvider } from './providers'
import { AppRouter } from './router'

export function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRouter />
      </AppProvider>
    </BrowserRouter>
  )
}
