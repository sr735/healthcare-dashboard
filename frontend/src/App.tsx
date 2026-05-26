import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { Box, CircularProgress } from '@mui/material'
import Layout from '@/components/Layout'
import GlobalSnackbar from '@/components/GlobalSnackbar'

// Lazy-load pages for code splitting
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const PatientsPage = lazy(() => import('@/pages/PatientsPage'))
const PatientDetailPage = lazy(() => import('@/pages/PatientDetailPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

function PageLoader() {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
      <CircularProgress />
    </Box>
  )
}

export default function App() {
  return (
    <>
      <Layout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/patients/:id" element={<PatientDetailPage />} />
            <Route path="/patients/:id/notes" element={<PatientDetailPage />} />
            <Route path="/patients/:id/summary" element={<PatientDetailPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </Layout>
      <GlobalSnackbar />
    </>
  )
}
