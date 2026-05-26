import { Snackbar, Alert } from '@mui/material'
import { useUiStore } from '@/store/uiStore'

export default function GlobalSnackbar() {
  const { snackbar, hideSnackbar } = useUiStore()

  return (
    <Snackbar
      open={snackbar.open}
      autoHideDuration={4000}
      onClose={hideSnackbar}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert onClose={hideSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
        {snackbar.message}
      </Alert>
    </Snackbar>
  )
}
