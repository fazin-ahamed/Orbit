import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import {
  Users,
  FolderKanban,
  Workflow,
  TrendingUp,
  Plus,
  Activity,
  UserPlus,
  Briefcase,
  PlayCircle
} from 'lucide-react'

interface DashboardStats {
  crm: {
    contacts: number
    leads: number
    deals: number
  }
  projects: {
    active: number
    tasks: number
  }
  workflows: {
    active: number
    executions: number
  }
  recentActivities: Array<{
    id: string
    type: string
    title: string
    description: string
    timestamp: string
  }>
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [stats, setStats] = useState<DashboardStats>({
    crm: { contacts: 0, leads: 0, deals: 0 },
    projects: { active: 0, tasks: 0 },
    workflows: { active: 0, executions: 0 },
    recentActivities: []
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)

      // Load CRM stats
      try {
        const crmStats = await api.getCRMDashboardStats()
        setStats(prev => ({
          ...prev,
          crm: {
            contacts: crmStats.contactStats.find(s => s.status === 'active')?.count || 0,
            leads: crmStats.leadStats.find(s => s.status === 'new')?.count || 0,
            deals: crmStats.leadStats.find(s => s.status === 'closed_won')?.count || 0,
          }
        }))
      } catch (error) {
        console.log('CRM stats not available yet')
      }

      // Load Projects stats
      try {
        const projectStats = await api.getProjectStats()
        setStats(prev => ({
          ...prev,
          projects: {
            active: projectStats.projectStats.find(s => s.status === 'active')?.count || 0,
            tasks: projectStats.taskStats.reduce((sum, s) => sum + s.count, 0),
          }
        }))
      } catch (error) {
        console.log('Project stats not available yet')
      }

      // Load Workflow stats
      try {
        const workflowStats = await api.getWorkflowStats()
        setStats(prev => ({
          ...prev,
          workflows: {
            active: workflowStats.workflowStats.find(s => s.status === 'active')?.count || 0,
            executions: workflowStats.executionStats.reduce((sum, s) => sum + s.count, 0),
          }
        }))
      } catch (error) {
        console.log('Workflow stats not available yet')
      }

      // Generate some mock recent activities
      setStats(prev => ({
        ...prev,
        recentActivities: [
          {
            id: '1',
            type: 'lead',
            title: 'New lead created',
            description: 'John Doe from Acme Corp contacted us',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '2',
            type: 'project',
            title: 'Project completed',
            description: 'Website Redesign project finished on time',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '3',
            type: 'workflow',
            title: 'Workflow executed',
            description: 'Lead Nurture Automation processed 5 leads',
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
          }
        ]
      }))

    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const quickActions = [
    {
      title: 'Add Contact',
      description: 'Create a new contact in CRM',
      icon: UserPlus,
      action: () => navigate('/crm'),
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200'
    },
    {
      title: 'Create Project',
      description: 'Start a new project',
      icon: Briefcase,
      action: () => navigate('/projects'),
      color: 'bg-green-50 hover:bg-green-100 border-green-200'
    },
    {
      title: 'Build Workflow',
      description: 'Create an automation workflow',
      icon: PlayCircle,
      action: () => navigate('/workflows'),
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200'
    }
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Button onClick={() => navigate('/crm')}>
          <Plus className="mr-2 h-4 w-4" />
          Quick Action
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/crm')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.crm.contacts}</div>
            <p className="text-xs text-muted-foreground">
              Active contacts in CRM
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/projects')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.projects.active}</div>
            <p className="text-xs text-muted-foreground">
              {stats.projects.tasks} total tasks
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/workflows')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
            <Workflow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.workflows.active}</div>
            <p className="text-xs text-muted-foreground">
              {stats.workflows.executions} executions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Healthy</div>
            <p className="text-xs text-muted-foreground">
              All systems operational
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <Card
              key={action.title}
              className={`cursor-pointer hover:shadow-md transition-shadow border ${action.color}`}
              onClick={action.action}
            >
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Icon className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                </div>
                <CardDescription>{action.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  variant="outline"
                >
                  Get Started
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Latest actions across your business
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-4">
                <div className={`w-2 h-2 rounded-full ${
                  activity.type === 'lead' ? 'bg-blue-600' :
                  activity.type === 'project' ? 'bg-green-600' :
                  'bg-purple-600'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.title}</p>
                  <p className="text-xs text-gray-500">
                    {activity.description} - {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {stats.recentActivities.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No recent activity to show
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
