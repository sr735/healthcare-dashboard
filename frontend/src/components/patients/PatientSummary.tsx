import {
  Box, Typography, Card, CardContent, Stack, Skeleton, Alert, Tooltip, IconButton,
} from '@mui/material'
import SummarizeIcon from '@mui/icons-material/Summarize'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { usePatientSummary } from '@/hooks/useNotes'
import { useUiStore } from '@/store/uiStore'

interface Props {
  patientId: string
}

export default function PatientSummary({ patientId }: Props) {
  const { data, isLoading, isError } = usePatientSummary(patientId)
  const { showSnackbar } = useUiStore()

  const handleCopy = async () => {
    if (!data?.summary) return
    await navigator.clipboard.writeText(data.summary)
    showSnackbar('Summary copied to clipboard', 'success')
  }

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <SummarizeIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>Patient Summary</Typography>
          </Stack>
          {data && (
            <Tooltip title="Copy to clipboard">
              <IconButton size="small" onClick={handleCopy}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>

        {isLoading ? (
          <>
            <Skeleton height={24} width="60%" sx={{ mb: 1 }} />
            <Skeleton height={200} />
          </>
        ) : isError ? (
          <Alert severity="error">Failed to load patient summary.</Alert>
        ) : data ? (
          <Box
            component="pre"
            sx={{
              fontFamily: 'monospace',
              fontSize: '0.78rem',
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              bgcolor: 'background.default',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: 2,
              m: 0,
              overflowX: 'auto',
            }}
          >
            {data.summary}
          </Box>
        ) : null}
      </CardContent>
    </Card>
  )
}
