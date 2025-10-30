import { useState, useEffect, ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { api, Workflow, Execution } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import WorkflowBuilder from '@/components/WorkflowBuilder'
import {
  Workflow as WorkflowIcon,
  Plus,
  Play,
  Edit,
  Eye,
  Search,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface StatusIconProps {
  status: string
  className?: string
}

const StatusIcon: React.FC<StatusIconProps> = ({ status, className }) => {
  const iconClass = `h-4 w-4 ${className || ''}`
  
  switch (status) {
    case 'completed':
      return <CheckCircle className={iconClass} />
    case 'running':
      return <Play className={iconClass} />
    case 'failed':
      return <XCircle className={iconClass} />
    default:
      return <Clock className={iconClass} />
  }
}

export default function Workflows() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<string>('workflows')
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [executions, setExecutions] = useState<Execution[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [showCreateWorkflow, setShowCreateWorkflow] = useState<boolean>(false)
  const [showWorkflowBuilder, setShowWorkflowBuilder] = useState<boolean>(false)
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [builderNodes, setBuilderNodes] = useState<any[]>([])
  const [builderEdges, setBuilderEdges] = useState<any[]>([])

  // Form states
  const [workflowForm, setWorkflowForm] = useState({
    name: '',
    description: '',
  })

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async (): Promise<void> => {
    try {
      setIsLoading(true)

      if (activeTab === 'workflows') {
        const response = await api.getWorkflows({ limit: 50 })
        setWorkflows(response.data)
      } else if (activeTab === 'executions') {
        const response = await api.getExecutions({ limit: 50 })
        setExecutions(response.data)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateWorkflow = async (): Promise<void> => {
    try {
      const workflow = await api.createWorkflow({
        ...workflowForm,
        nodes: [],
        edges: [],
        triggers: [],
        variables: {},
      })

      toast({
        title: 'Success',
        description: 'Workflow created successfully',
      })

      setShowCreateWorkflow(false)
      setWorkflowForm({ name: '', description: '' })
      loadData()

      // Open workflow builder for the new workflow
      setSelectedWorkflow(workflow)
      setShowWorkflowBuilder(true)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create workflow',
        variant: 'destructive',
      })
    }
  }

  const handleSaveWorkflow = async (nodes: any[], edges: any[]): Promise<void> => {
    if (!selectedWorkflow) return

    try {
      await api.updateWorkflow(selectedWorkflow.id, {
        ...selectedWorkflow,
        nodes,
        edges,
      })

      toast({
        title: 'Success',
        description: 'Workflow saved successfully',
      })

      loadData()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save workflow',
        variant: 'destructive',
      })
    }
  }

  const handleExecuteWorkflow = async (): Promise<void> => {
    if (!selectedWorkflow) return

    try {
      const result = await api.startExecution({
        workflow_id: selectedWorkflow.id,
        trigger_data: {},
      })

      toast({
        title: 'Success',
        description: `Workflow execution started (ID: ${result.execution_id})`,
      })

      loadData()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to execute workflow',
        variant: 'destructive',
      })
    }
  }

  const openWorkflowBuilder = (workflow: Workflow): void => {
    setSelectedWorkflow(workflow)
    setBuilderNodes(workflow.nodes || [])
    setBuilderEdges(workflow.edges || [])
    setShowWorkflowBuilder(true)
  }

  const filteredWorkflows = workflows.filter(workflow =>
    workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    workflow.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
      case 'completed':
        return 'default' as const
      case 'draft':
      case 'running':
        return 'secondary' as const
      case 'failed':
        return 'destructive' as const
      default:
        return 'outline' as const
    }
  }

  const getStatusIconComponent = (status: string): ReactNode => {
    return <StatusIcon status={status} className="h-4 w-4" />
  }

  const getEmptyState = (title: string, description: string): ReactNode => {
    return (
      <>
        <WorkflowIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </>
    )
  }

  const getEmptyExecutionState = (): ReactNode => {
    return (
      <>
        <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-sm font-medium text-gray-900">No executions yet</h3>
        <p className="text-sm text-gray-500 mt-1">
          Workflow executions will appear here.
        </p>
      </>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
        <div className="space-x-2">
          <Dialog open={showCreateWorkflow} onOpenChange={setShowCreateWorkflow}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Workflow
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Workflow</DialogTitle>
                <DialogDescription>
                  Set up a new automated workflow.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="workflowName">Workflow Name *</Label>
                  <Input
                    id="workflowName"
                    value={workflowForm.name}
                    onChange={(e) => setWorkflowForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Lead Nurture Automation"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workflowDescription">Description</Label>
                  <Input
                    id="workflowDescription"
                    value={workflowForm.description}
                    onChange={(e) => setWorkflowForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Automatically nurture new leads"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateWorkflow(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateWorkflow}>
                  Create Workflow
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="executions">Executions</TabsTrigger>
          <TabsTrigger value="builder">Builder</TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search workflows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle>Workflows</CardTitle>
                  <CardDescription>
                    Manage your automated workflows
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Workflow</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Nodes</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredWorkflows.map((workflow) => (
                          <TableRow key={workflow.id}>
                            <TableCell className="font-medium">
                              <div>
                                <div className="font-medium">{workflow.name}</div>
                                <div className="text-sm text-gray-500">{workflow.description}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(workflow.status)}>
                                {workflow.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {(workflow.nodes as any[])?.length || 0} nodes
                            </TableCell>
                            <TableCell>
                              {new Date(workflow.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openWorkflowBuilder(workflow)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredWorkflows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-12">
                              {getEmptyState(
                                'No workflows found',
                                searchTerm ? 'Try adjusting your search terms.' : 'Create your first workflow to get started.'
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Workflow Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Workflows</span>
                    <span className="font-semibold">{workflows.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Active</span>
                    <span className="font-semibold">
                      {workflows.filter(w => w.status === 'active').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Draft</span>
                    <span className="font-semibold">
                      {workflows.filter(w => w.status === 'draft').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Executions</span>
                    <span className="font-semibold">{executions.length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="executions" className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search executions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Workflow Executions</CardTitle>
              <CardDescription>
                View and monitor workflow execution history
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Workflow</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {executions.map((execution: Execution) => (
                      <TableRow key={execution.id}>
                        <TableCell className="font-medium">
                          {execution.workflow_name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusIconComponent(execution.status)}
                            <Badge variant={getStatusBadgeVariant(execution.status)}>
                              {execution.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(execution.started_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {execution.duration_ms ? `${(execution.duration_ms / 1000).toFixed(1)}s` : '-'}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {executions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12">
                          {getEmptyExecutionState()}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="builder" className="space-y-4">
          <Card className="h-[600px]">
            <CardHeader>
              <CardTitle>Workflow Builder</CardTitle>
              <CardDescription>
                {selectedWorkflow
                  ? `Editing: ${selectedWorkflow.name}`
                  : 'Select a workflow to edit or create a new one'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="h-full">
              {selectedWorkflow ? (
                <WorkflowBuilder
                  initialNodes={builderNodes}
                  initialEdges={builderEdges}
                  onSave={handleSaveWorkflow}
                  onExecute={handleExecuteWorkflow}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    {getEmptyState('No workflow selected', 'Select a workflow from the Workflows tab to edit it here.')}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Workflow Builder Modal */}
      <Dialog open={showWorkflowBuilder} onOpenChange={setShowWorkflowBuilder}>
        <DialogContent className="max-w-6xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedWorkflow?.name || 'Workflow Builder'}
            </DialogTitle>
            <DialogDescription>
              Build your automated workflow using drag-and-drop nodes.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 h-full">
            {selectedWorkflow && (
              <WorkflowBuilder
                initialNodes={builderNodes}
                initialEdges={builderEdges}
                onSave={handleSaveWorkflow}
                onExecute={handleExecuteWorkflow}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
