import React, { useState, useEffect } from 'react'
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
import { api, Contact, Lead, CreateContactData, CreateLeadData } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import {
  Users,
  UserPlus,
  TrendingUp,
  Plus,
  Mail,
  Phone,
  Building,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye
} from 'lucide-react'

export default function CRM() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('contacts')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddContact, setShowAddContact] = useState(false)
  const [showAddLead, setShowAddLead] = useState(false)
  const [stats, setStats] = useState({
    totalContacts: 0,
    activeLeads: 0,
    wonDeals: 0
  })

  // Form states
  const [contactForm, setContactForm] = useState<CreateContactData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    job_title: '',
    source: '',
  })

  const [leadForm, setLeadForm] = useState<CreateLeadData>({
    title: '',
    description: '',
    contact_id: '',
    value: undefined,
    priority: 'medium',
  })

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    try {
      setIsLoading(true)

      if (activeTab === 'contacts') {
        const response = await api.getContacts({ limit: 50 })
        setContacts(response.data)
        setStats(prev => ({ ...prev, totalContacts: response.pagination.total }))
      } else if (activeTab === 'leads') {
        const response = await api.getLeads({ limit: 50 })
        setLeads(response.data)
        setStats(prev => ({
          ...prev,
          activeLeads: response.data.filter(l => l.status === 'new').length,
          wonDeals: response.data.filter(l => l.status === 'closed_won').length
        }))
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

  const handleAddContact = async () => {
    try {
      await api.createContact(contactForm)
      toast({
        title: 'Success',
        description: 'Contact created successfully',
      })
      setShowAddContact(false)
      setContactForm({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company: '',
        job_title: '',
        source: '',
      })
      loadData()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create contact',
        variant: 'destructive',
      })
    }
  }

  const handleAddLead = async () => {
    try {
      await api.createLead(leadForm)
      toast({
        title: 'Success',
        description: 'Lead created successfully',
      })
      setShowAddLead(false)
      setLeadForm({
        title: '',
        description: '',
        contact_id: '',
        value: undefined,
        priority: 'medium',
      })
      loadData()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create lead',
        variant: 'destructive',
      })
    }
  }

  const filteredContacts = contacts.filter(contact =>
    contact.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.company?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredLeads = leads.filter(lead =>
    lead.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.contact_first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.contact_last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">CRM</h1>
        <div className="space-x-2">
          <Button variant="outline">
            <TrendingUp className="mr-2 h-4 w-4" />
            Reports
          </Button>
          <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Contact</DialogTitle>
                <DialogDescription>
                  Create a new contact in your CRM system.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={contactForm.first_name}
                      onChange={(e) => setContactForm(prev => ({ ...prev, first_name: e.target.value }))}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={contactForm.last_name}
                      onChange={(e) => setContactForm(prev => ({ ...prev, last_name: e.target.value }))}
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="john.doe@example.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={contactForm.company}
                      onChange={(e) => setContactForm(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="Acme Corp"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input
                    id="jobTitle"
                    value={contactForm.job_title}
                    onChange={(e) => setContactForm(prev => ({ ...prev, job_title: e.target.value }))}
                    placeholder="CEO"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source">Source</Label>
                  <Input
                    id="source"
                    value={contactForm.source}
                    onChange={(e) => setContactForm(prev => ({ ...prev, source: e.target.value }))}
                    placeholder="Website"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowAddContact(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddContact}>
                  Create Contact
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search contacts..."
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
                  <CardTitle>Contacts</CardTitle>
                  <CardDescription>
                    Manage your customer relationships
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
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredContacts.map((contact) => (
                          <TableRow key={contact.id}>
                            <TableCell className="font-medium">
                              {contact.first_name} {contact.last_name}
                            </TableCell>
                            <TableCell>{contact.email || '-'}</TableCell>
                            <TableCell>{contact.company || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={contact.status === 'active' ? 'default' : 'secondary'}>
                                {contact.status}
                              </Badge>
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
                        {filteredContacts.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-12">
                              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                              <h3 className="text-sm font-medium text-gray-900">No contacts found</h3>
                              <p className="text-sm text-gray-500 mt-1">
                                {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first contact.'}
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
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Contacts</span>
                    <span className="font-semibold">{stats.totalContacts}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Active Contacts</span>
                    <span className="font-semibold">
                      {contacts.filter(c => c.status === 'active').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">This Month</span>
                    <span className="font-semibold">
                      {contacts.filter(c =>
                        new Date(c.created_at).getMonth() === new Date().getMonth()
                      ).length}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Dialog open={showAddLead} onOpenChange={setShowAddLead}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Lead
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Lead</DialogTitle>
                  <DialogDescription>
                    Create a new sales lead.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={leadForm.title}
                      onChange={(e) => setLeadForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Website Redesign Project"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={leadForm.description}
                      onChange={(e) => setLeadForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Client wants a complete website redesign"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="value">Value</Label>
                      <Input
                        id="value"
                        type="number"
                        value={leadForm.value || ''}
                        onChange={(e) => setLeadForm(prev => ({ ...prev, value: Number(e.target.value) || undefined }))}
                        placeholder="50000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={leadForm.priority}
                        onChange={(e) => setLeadForm(prev => ({ ...prev, priority: e.target.value as any }))}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowAddLead(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddLead}>
                    Create Lead
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle>Leads</CardTitle>
                  <CardDescription>
                    Manage your sales pipeline
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
                          <TableHead>Title</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLeads.map((lead) => (
                          <TableRow key={lead.id}>
                            <TableCell className="font-medium">{lead.title}</TableCell>
                            <TableCell>
                              {lead.contact_first_name && lead.contact_last_name
                                ? `${lead.contact_first_name} ${lead.contact_last_name}`
                                : '-'}
                            </TableCell>
                            <TableCell>
                              {lead.value ? `$${lead.value.toLocaleString()}` : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  lead.status === 'closed_won' ? 'default' :
                                  lead.status === 'closed_lost' ? 'destructive' :
                                  'secondary'
                                }
                              >
                                {lead.status.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  lead.priority === 'urgent' ? 'destructive' :
                                  lead.priority === 'high' ? 'default' :
                                  'secondary'
                                }
                              >
                                {lead.priority}
                              </Badge>
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
                        {filteredLeads.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-12">
                              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                              <h3 className="text-sm font-medium text-gray-900">No leads found</h3>
                              <p className="text-sm text-gray-500 mt-1">
                                {searchTerm ? 'Try adjusting your search terms.' : 'Create your first lead to get started.'}
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
                  <CardTitle>Pipeline Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Active Leads</span>
                    <span className="font-semibold">{stats.activeLeads}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Won Deals</span>
                    <span className="font-semibold">{stats.wonDeals}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Value</span>
                    <span className="font-semibold">
                      ${leads.reduce((sum, lead) => sum + (lead.value || 0), 0).toLocaleString()}
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
