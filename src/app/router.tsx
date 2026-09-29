import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { WelcomePage } from '@/pages/welcome-page'
import { BoardPage } from '@/pages/board-page'
import { NotFoundPage } from '@/pages/not-found-page'

const router = createBrowserRouter([
  { path: '/', element: <WelcomePage /> },
  { path: '/retro/:code', element: <BoardPage /> },
  { path: '*', element: <NotFoundPage /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
