import { useState, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api, Project, Task, CreateProjectData, CreateTaskData } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import {
  FolderKanban,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  Edit,
  Eye,
  PlayCircle
} from 'lucide-react'

export default function Projects() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('projects')
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddProject, setShowAddProject] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [selectedProject, setSelectedProject] = useState<string>('')

  // Form states
  const [projectForm, setProjectForm] = useState<CreateProjectData>({
    name: '',
    description: '',
    priority: 'medium',
    budget: undefined,
    start_date: '',
    due_date: '',
  })

  const [taskForm, setTaskForm] = useState<CreateTaskData>({
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo',
    assigned_to: '',
    due_date: '',
    estimated_hours: undefined,
    tags: [],
  })

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    try {
      setIsLoading(true)

      if (activeTab === 'projects') {
        const response = await api.getProjects({ limit: 50 })
        setProjects(response.data)
      } else if (activeTab === 'tasks') {
        const response = await api.getTasks({ limit: 50 })
        setTasks(response.data)
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

  const handleAddProject = async () => {
    try {
      await api.createProject(projectForm)
      toast({
        title: 'Success',
        description: 'Project created successfully',
      })
      setShowAddProject(false)
      setProjectForm({
        name: '',
        description: '',
        priority: 'medium',
        budget: undefined,
        start_date: '',
        due_date: '',
      })
      loadData()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create project',
        variant: 'destructive',
      })
    }
  }

  const handleAddTask = async () => {
    try {
      const taskData = {
        ...taskForm,
        project_id: selectedProject || undefined,
      }
      await api.createTask(taskData)
      toast({
        title: 'Success',
        description: 'Task created successfully',
      })
      setShowAddTask(false)
      setTaskForm({
        title: '',
        description: '',
        priority: 'medium',
        status: 'todo',
        assigned_to: '',
        due_date: '',
        estimated_hours: undefined,
        tags: [],
      })
      setSelectedProject('')
      loadData()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create task',
        variant: 'destructive',
      })
    }
  }

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'in_progress':
        return <PlayCircle className="h-4 w-4 text-blue-600" />
      case 'on_hold':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'in_progress':
        return <PlayCircle className="h-4 w-4 text-blue-600" />
      case 'review':
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <div className="space-x-2">
          <Dialog open={showAddProject} onOpenChange={setShowAddProject}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Set up a new project to organize your tasks and team.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="projectName">Project Name *</Label>
                  <Input
                    id="projectName"
                    value={projectForm.name}
                    onChange={(e) => setProjectForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Website Redesign"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="projectDescription">Description</Label>
                  <Input
                    id="projectDescription"
                    value={projectForm.description}
                    onChange={(e) => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the project"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={projectForm.priority}
                      onValueChange={(value) => setProjectForm(prev => ({ ...prev, priority: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="budget">Budget</Label>
                    <Input
                      id="budget"
                      type="number"
                      value={projectForm.budget || ''}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, budget: Number(e.target.value) || undefined }))}
                      placeholder="50000"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={projectForm.start_date}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, start_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={projectForm.due_date}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, due_date: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowAddProject(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddProject}>
                  Create Project
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search projects..."
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
                  <CardTitle>Projects</CardTitle>
                  <CardDescription>
                    Manage your projects and track progress
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
                          <TableHead>Project</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Budget</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProjects.map((project) => (
                          <TableRow key={project.id}>
                            <TableCell className="font-medium">
                              <div>
                                <div className="font-medium">{project.name}</div>
                                <div className="text-sm text-gray-500">{project.description}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(project.status)}
                                <Badge variant={
                                  project.status === 'completed' ? 'default' :
                                  project.status === 'in_progress' ? 'secondary' :
                                  project.status === 'cancelled' ? 'destructive' :
                                  'outline'
                                }>
                                  {project.status.replace('_', ' ')}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                project.priority === 'high' ? 'destructive' :
                                project.priority === 'medium' ? 'default' :
                                'secondary'
                              }>
                                {project.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {project.due_date ? new Date(project.due_date).toLocaleDateString() : '-'}
                            </TableCell>
                            <TableCell>
                              {project.budget ? `$${project.budget.toLocaleString()}` : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredProjects.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-12">
                              <FolderKanban className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                              <h3 className="text-sm font-medium text-gray-900">No projects found</h3>
                              <p className="text-sm text-gray-500 mt-1">
                                {searchTerm ? 'Try adjusting your search terms.' : 'Create your first project to get started.'}
                              </p>
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
                  <CardTitle>Project Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Projects</span>
                    <span className="font-semibold">{projects.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Active</span>
                    <span className="font-semibold">
                      {projects.filter(p => p.status === 'active' || p.status === 'in_progress').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Completed</span>
                    <span className="font-semibold">
                      {projects.filter(p => p.status === 'completed').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Budget</span>
                    <span className="font-semibold">
                      ${projects.reduce((sum: number, p: Project) => sum + (p.budget || 0), 0).toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                  <DialogDescription>
                    Add a new task to your project.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="taskTitle">Title *</Label>
                    <Input
                      id="taskTitle"
                      value={taskForm.title}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Design homepage mockup"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taskDescription">Description</Label>
                    <Input
                      id="taskDescription"
                      value={taskForm.description}
                      onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Create high-fidelity mockup for the homepage"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="taskStatus">Status</Label>
                      <Select
                        value={taskForm.status}
                        onValueChange={(value) => setTaskForm(prev => ({ ...prev, status: value as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">To Do</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="review">Review</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taskPriority">Priority</Label>
                      <Select
                        value={taskForm.priority}
                        onValueChange={(value) => setTaskForm(prev => ({ ...prev, priority: value as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dueDate">Due Date</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={taskForm.due_date}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, due_date: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estimatedHours">Estimated Hours</Label>
                      <Input
                        id="estimatedHours"
                        type="number"
                        value={taskForm.estimated_hours || ''}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, estimated_hours: Number(e.target.value) || undefined }))}
                        placeholder="8"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowAddTask(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddTask}>
                    Create Task
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle>Tasks</CardTitle>
                  <CardDescription>
                    Manage individual tasks across all projects
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
                          <TableHead>Task</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Assigned To</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTasks.map((task) => (
                          <TableRow key={task.id}>
                            <TableCell className="font-medium">
                              <div>
                                <div className="font-medium">{task.title}</div>
                                <div className="text-sm text-gray-500">{task.description}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {getTaskStatusIcon(task.status)}
                                <Badge variant={
                                  task.status === 'done' ? 'default' :
                                  task.status === 'in_progress' ? 'secondary' :
                                  'outline'
                                }>
                                  {task.status.replace('_', ' ')}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                task.priority === 'urgent' ? 'destructive' :
                                task.priority === 'high' ? 'default' :
                                'secondary'
                              }>
                                {task.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {task.assigned_first_name && task.assigned_last_name
                                ? `${task.assigned_first_name} ${task.assigned_last_name}`
                                : '-'}
                            </TableCell>
                            <TableCell>
                              {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredTasks.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-12">
                              <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                              <h3 className="text-sm font-medium text-gray-900">No tasks found</h3>
                              <p className="text-sm text-gray-500 mt-1">
                                {searchTerm ? 'Try adjusting your search terms.' : 'Create your first task to get started.'}
                              </p>
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
                  <CardTitle>Task Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Tasks</span>
                    <span className="font-semibold">{tasks.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">To Do</span>
                    <span className="font-semibold">
                      {tasks.filter(t => t.status === 'todo').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">In Progress</span>
                    <span className="font-semibold">
                      {tasks.filter(t => t.status === 'in_progress').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Completed</span>
                    <span className="font-semibold">
                      {tasks.filter(t => t.status === 'done').length}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
