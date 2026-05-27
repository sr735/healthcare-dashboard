import { memo, useMemo } from 'react'
import {
  Box, Typography, Grid2 as Grid, Card, CardContent, CardHeader,
  Skeleton, Button, Stack, useTheme,
} from '@mui/material'
import PeopleIcon from '@mui/icons-material/People'
import FavoriteIcon from '@mui/icons-material/Favorite'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import { usePatients } from '@/hooks/usePatients'
import PatientStatusChip from '@/components/patients/PatientStatusChip'
import { formatDate, calcAge } from '@/lib/utils'

// ---- Stat card --------------------------------------------------------------

interface StatCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  color: string
  loading?: boolean
}

const StatCard = memo(function StatCard({ title, value, icon, color, loading }: StatCardProps) {
  return (
    <Card>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: `${color}20`, color, display: 'flex' }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">{title}</Typography>
          {loading ? (
            <Skeleton width={60} height={36} />
          ) : (
            <Typography variant="h4" fontWeight={700}>{value}</Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  )
})

// ---- Status donut chart -----------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  Active:     '#43A047',
  Critical:   '#EF5350',
  Inactive:   '#64748B',
  Discharged: '#26A69A',
}

interface StatusChartProps {
  data: { name: string; value: number }[]
  loading: boolean
}

function StatusChart({ data, loading }: StatusChartProps) {
  const theme = useTheme()

  if (loading) return <Skeleton variant="circular" width={220} height={220} sx={{ mx: 'auto', mt: 2 }} />
  if (data.every((d) => d.value === 0)) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', pt: 4 }}>
        No patient data yet.
      </Typography>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={65}
          outerRadius={100}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#94A3B8'} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: theme.shape.borderRadius,
            color: theme.palette.text.primary,
          }}
          formatter={(value: number, name: string) => [value, name]}
        />
        <Legend
          formatter={(value) => (
            <Typography component="span" variant="caption" color="text.primary">
              {value}
            </Typography>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ---- Gender bar chart -------------------------------------------------------

const GENDER_COLORS = ['#1976D2', '#E91E63', '#9C27B0', '#64748B']

interface GenderChartProps {
  data: { name: string; count: number }[]
  loading: boolean
}

function GenderChart({ data, loading }: GenderChartProps) {
  const theme = useTheme()

  if (loading) return <Skeleton variant="rounded" height={220} sx={{ mt: 2 }} />

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
        <XAxis
          dataKey="name"
          tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: theme.shape.borderRadius,
            color: theme.palette.text.primary,
          }}
          cursor={{ fill: theme.palette.action.hover }}
        />
        <Bar dataKey="count" name="Patients" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={GENDER_COLORS[i % GENDER_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ---- Page -------------------------------------------------------------------

export default function DashboardPage() {
  const navigate = useNavigate()

  // Load enough for accurate stats. In a larger app this would be a /stats endpoint.
  const { data, isLoading } = usePatients({ page: 1, page_size: 100 })

  const patients = useMemo(() => data?.items ?? [], [data?.items])
  const total = data?.total ?? 0

  const { active, critical, discharged, recentPatients, statusData, genderData } =
    useMemo(() => {
      const active     = patients.filter((p) => p.status === 'active').length
      const critical   = patients.filter((p) => p.status === 'critical').length
      const inactive   = patients.filter((p) => p.status === 'inactive').length
      const discharged = patients.filter((p) => p.status === 'discharged').length

      const statusData = [
        { name: 'Active',     value: active },
        { name: 'Critical',   value: critical },
        { name: 'Inactive',   value: inactive },
        { name: 'Discharged', value: discharged },
      ]

      const genderData = [
        { name: 'Male',   count: patients.filter((p) => p.gender === 'male').length },
        { name: 'Female', count: patients.filter((p) => p.gender === 'female').length },
        { name: 'Other',  count: patients.filter((p) => p.gender === 'other').length },
        { name: 'N/A',    count: patients.filter((p) => p.gender === 'prefer_not_to_say').length },
      ].filter((d) => d.count > 0)

      const recentPatients = [...patients]
        .filter((p) => p.last_visit_date)
        .sort((a, b) => (b.last_visit_date ?? '').localeCompare(a.last_visit_date ?? ''))
        .slice(0, 5)

      return { active, critical, inactive, discharged, recentPatients, statusData, genderData }
    }, [patients])

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={1}>Dashboard</Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        Welcome to HealthDash -- your patient management overview.
      </Typography>

      {/* ---- Stat cards ---- */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Total Patients" value={total}      icon={<PeopleIcon />}       color="#1976D2" loading={isLoading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Active"          value={active}    icon={<CheckCircleIcon />}  color="#43A047" loading={isLoading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Critical"        value={critical}  icon={<WarningAmberIcon />} color="#EF5350" loading={isLoading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Discharged"      value={discharged} icon={<FavoriteIcon />}   color="#26A69A" loading={isLoading} />
        </Grid>
      </Grid>

      {/* ---- Charts ---- */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader
              title={<Typography variant="subtitle1" fontWeight={700}>Patient Status</Typography>}
              subheader={isLoading ? '' : `${total} total patients`}
            />
            <CardContent sx={{ pt: 0 }}>
              <StatusChart data={statusData} loading={isLoading} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader
              title={<Typography variant="subtitle1" fontWeight={700}>Gender Distribution</Typography>}
              subheader={isLoading ? '' : `${patients.length} patients shown`}
            />
            <CardContent sx={{ pt: 0 }}>
              <GenderChart data={genderData} loading={isLoading} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ---- Recent visits ---- */}
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight={700}>Recent Visits</Typography>
            <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/patients')}>
              View all
            </Button>
          </Stack>

          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height={48} sx={{ mb: 1 }} />
            ))
          ) : recentPatients.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No recent visits on record.</Typography>
          ) : (
            recentPatients.map((p) => (
              <Box
                key={p.id}
                onClick={() => navigate(`/patients/${p.id}`)}
                sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  py: 1.5, px: 1, borderRadius: 1, cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                  borderBottom: '1px solid', borderColor: 'divider',
                  '&:last-child': { borderBottom: 'none' },
                }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {p.first_name} {p.last_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Age {calcAge(p.date_of_birth)} &middot; {p.primary_physician ?? 'No physician'}
                  </Typography>
                </Box>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(p.last_visit_date)}
                  </Typography>
                  <PatientStatusChip status={p.status} />
                </Stack>
              </Box>
            ))
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
