import { useState } from 'react'
import {
  Box, Typography, Card, CardContent, TextField, Button, Stack,
  IconButton, Tooltip, Divider, CircularProgress, Alert, Skeleton, Chip,
} from '@mui/material'
import AddCommentIcon from '@mui/icons-material/AddComment'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import NoteAltIcon from '@mui/icons-material/NoteAlt'
import { useNotes, useCreateNote, useDeleteNote } from '@/hooks/useNotes'
import { useUiStore } from '@/store/uiStore'
import type { PatientNote } from '@/types'

interface Props {
  patientId: string
}

function NoteCard({ note, onDelete }: { note: PatientNote; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const isSystemNote = note.note_type === 'medical_background'

  const ts = new Date(note.created_at).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <Box
      sx={{
        py: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-child': { borderBottom: 'none' },
        ...(isSystemNote && {
          bgcolor: 'action.hover',
          borderRadius: 1,
          px: 1.5,
          mb: 1,
        }),
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box flex={1} pr={1}>
          <Stack direction="row" alignItems="center" spacing={0.75} mb={0.5}>
            <Typography variant="caption" color="text.secondary">
              {ts}{note.author ? ` · ${note.author}` : ''}
            </Typography>
            {isSystemNote && (
              <Chip label="Profile" size="small" variant="outlined" sx={{ height: 16, fontSize: '0.65rem' }} />
            )}
          </Stack>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
            {note.content}
          </Typography>
        </Box>
        {!isSystemNote && (
          confirming ? (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Button size="small" color="error" onClick={onDelete}>
                Confirm
              </Button>
              <Button size="small" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </Stack>
          ) : (
            <Tooltip title="Delete note">
              <IconButton size="small" onClick={() => setConfirming(true)} color="default">
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )
        )}
      </Stack>
    </Box>
  )
}

export default function PatientNotes({ patientId }: Props) {
  const [content, setContent] = useState('')
  const [author, setAuthor] = useState('')
  const { showSnackbar } = useUiStore()

  const { data, isLoading, isError } = useNotes(patientId)
  const createMutation = useCreateNote(patientId)
  const deleteMutation = useDeleteNote(patientId)

  const notes = data?.items ?? []

  const handleAdd = async () => {
    const trimmed = content.trim()
    if (!trimmed) return
    try {
      await createMutation.mutateAsync({
        content: trimmed,
        author: author.trim() || null,
      })
      setContent('')
      setAuthor('')
      showSnackbar('Note added', 'success')
    } catch {
      showSnackbar('Failed to add note', 'error')
    }
  }

  const handleDelete = async (noteId: string) => {
    try {
      await deleteMutation.mutateAsync(noteId)
      showSnackbar('Note deleted', 'success')
    } catch {
      showSnackbar('Failed to delete note', 'error')
    }
  }

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <NoteAltIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>Clinical Notes</Typography>
          {data && (
            <Typography variant="caption" color="text.secondary">
              ({data.total})
            </Typography>
          )}
        </Stack>

        {/* ── Add note form ── */}
        <Box mb={3}>
          <TextField
            label="New note"
            placeholder="Enter clinical observation, follow-up action, or any relevant note…"
            multiline
            minRows={3}
            maxRows={8}
            fullWidth
            value={content}
            onChange={(e) => setContent(e.target.value)}
            size="small"
            sx={{ mb: 1 }}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
            <TextField
              label="Author (optional)"
              size="small"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              sx={{ minWidth: 200 }}
            />
            <Button
              variant="contained"
              startIcon={createMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <AddCommentIcon />}
              onClick={handleAdd}
              disabled={!content.trim() || createMutation.isPending}
            >
              Add Note
            </Button>
          </Stack>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* ── Notes list ── */}
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={72} sx={{ mb: 1 }} />)
        ) : isError ? (
          <Alert severity="error">Failed to load notes.</Alert>
        ) : notes.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            No clinical notes on record. Add the first one above.
          </Typography>
        ) : (
          notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onDelete={() => handleDelete(note.id)}
            />
          ))
        )}
      </CardContent>
    </Card>
  )
}
