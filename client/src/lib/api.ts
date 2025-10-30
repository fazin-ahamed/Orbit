import axios, { AxiosInstance } from 'axios';

// Types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  mfa_enabled: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  plan_tier: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

// Contact types
export interface Contact {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company?: string;
  job_title?: string;
  source?: string;
  status: string;
  custom_fields: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateContactData {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company?: string;
  job_title?: string;
  source?: string;
  custom_fields?: Record<string, any>;
}

// Lead types
export interface Lead {
  id: string;
  tenant_id: string;
  contact_id?: string;
  title: string;
  description?: string;
  value?: number;
  currency: string;
  status: string;
  priority: string;
  assigned_to?: string;
  pipeline_id?: string;
  pipeline_stage: number;
  expected_close_date?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  // Joined data
  contact_first_name?: string;
  contact_last_name?: string;
  contact_email?: string;
  assigned_first_name?: string;
  assigned_last_name?: string;
  pipeline_name?: string;
}

export interface CreateLeadData {
  title: string;
  description?: string;
  contact_id?: string;
  value?: number;
  currency?: string;
  priority?: string;
  assigned_to?: string;
  pipeline_id?: string;
  expected_close_date?: string;
  tags?: string[];
}

// Pipeline types
export interface Pipeline {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  stages: any[];
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Project types
export interface Project {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  status: string;
  start_date?: string;
  due_date?: string;
  budget?: number;
  priority: string;
  owner_id?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  tenant_id: string;
  project_id?: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assigned_to?: string;
  created_by: string;
  due_date?: string;
  estimated_hours?: number;
  tags: string[];
  order: number;
  created_at: string;
  updated_at: string;
  // Joined data
  assigned_first_name?: string;
  assigned_last_name?: string;
  creator_first_name?: string;
  creator_last_name?: string;
  project_name?: string;
}

// Project creation data types
export interface CreateProjectData {
  name: string;
  description?: string;
  status?: string;
  start_date?: string;
  due_date?: string;
  budget?: number;
  currency?: string;
  priority?: string;
  assigned_to?: string;
}

export interface CreateTaskData {
  project_id?: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  due_date?: string;
  estimated_hours?: number;
  assigned_to?: string;
  tags?: string[];
}

// Workflow types
export interface Workflow {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  status: string;
  nodes: any[];
  edges: any[];
  triggers: any[];
  variables: Record<string, any>;
  is_template: boolean;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Execution {
  id: string;
  tenant_id: string;
  workflow_id: string;
  status: string;
  trigger_data: Record<string, any>;
  execution_data: Record<string, any>;
  results: Record<string, any>;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  error_message?: string;
  created_at: string;
  // Joined data
  workflow_name?: string;
  steps?: ExecutionStep[];
}

export interface ExecutionStep {
  id: string;
  execution_id: string;
  node_id: string;
  node_type: string;
  status: string;
  input_data: Record<string, any>;
  output_data: Record<string, any>;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  error_message?: string;
  retry_count: number;
  next_retry_at?: string;
  created_at: string;
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// API Service Class
class ApiService {
  private api: AxiosInstance;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: '/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        // Add tenant ID if available
        const tenantId = localStorage.getItem('tenantId') || 'default';
        config.headers['x-tenant-id'] = tenantId;
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.api(originalRequest);
          } catch (refreshError) {
            // Refresh failed, logout user
            this.logout();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshToken(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = new Promise(async (resolve, reject) => {
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await this.api.post('/auth/refresh', { refreshToken });
        const { token } = response.data;

        localStorage.setItem('authToken', token);
        resolve(token);
      } catch (error) {
        reject(error);
      } finally {
        this.refreshPromise = null;
      }
    });

    return this.refreshPromise;
  }

  

  // Generic request methods
  private async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.api.get(url, { params });
    return response.data;
  }

  private async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.api.post(url, data);
    return response.data;
  }

  private async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.api.put(url, data);
    return response.data;
  }

  private async delete<T>(url: string): Promise<T> {
    const response = await this.api.delete(url);
    return response.data;
  }

  // Auth methods
  async login(email: string, password: string, mfaCode?: string): Promise<AuthResponse> {
    const response = await this.post<AuthResponse>('/auth/login', {
      email,
      password,
      mfaCode,
    });

    const { token, refreshToken, user } = response;
    localStorage.setItem('authToken', token);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));

    return response;
  }

  async register(data: {
    email: string;
    password: string;
    tenantId: string;
    firstName: string;
    lastName: string;
  }): Promise<AuthResponse> {
    return this.post<AuthResponse>('/auth/register', data);
  }

  async logout(): Promise<void> {
    try {
      await this.post('/auth/logout');
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }

  

  async getProfile(): Promise<User> {
    return this.get<User>('/auth/profile');
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    return this.put<User>('/auth/profile', data);
  }

  // CRM methods
  async getContacts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<PaginatedResponse<Contact>> {
    const response = await this.get<{
      contacts: Contact[];
      pagination: PaginatedResponse<any>['pagination'];
    }>('/crm/contacts', params);

    return {
      data: response.contacts,
      pagination: response.pagination,
    };
  }

  async getContact(id: string): Promise<Contact & { leads: Lead[] }> {
    return this.get<Contact & { leads: Lead[] }>(`/crm/contacts/${id}`);
  }

  async createContact(data: CreateContactData): Promise<Contact> {
    return this.post<Contact>('/crm/contacts', data);
  }

  async updateContact(id: string, data: Partial<CreateContactData>): Promise<Contact> {
    return this.put<Contact>(`/crm/contacts/${id}`, data);
  }

  async getLeads(params?: {
    page?: number;
    limit?: number;
    status?: string;
    assigned_to?: string;
    pipeline_id?: string;
  }): Promise<PaginatedResponse<Lead>> {
    const response = await this.get<{
      leads: Lead[];
      pagination: PaginatedResponse<any>['pagination'];
    }>('/crm/leads', params);

    return {
      data: response.leads,
      pagination: response.pagination,
    };
  }

  async createLead(data: Omit<CreateLeadData, 'currency'> & { currency?: string }): Promise<Lead> {
    return this.post<Lead>('/crm/leads', data);
  }

  async updateLead(id: string, data: Partial<CreateLeadData>): Promise<Lead> {
    return this.put<Lead>(`/crm/leads/${id}`, data);
  }

  async getPipelines(): Promise<{ pipelines: Pipeline[] }> {
    return this.get<{ pipelines: Pipeline[] }>('/crm/pipelines');
  }

  async createPipeline(data: {
    name: string;
    description?: string;
    stages: any[];
  }): Promise<Pipeline> {
    return this.post<Pipeline>('/crm/pipelines', data);
  }

  // Projects methods
  async getProjects(params?: {
    page?: number;
    limit?: number;
    status?: string;
    owner_id?: string;
  }): Promise<PaginatedResponse<Project>> {
    const response = await this.get<{
      projects: Project[];
      pagination: PaginatedResponse<any>['pagination'];
    }>('/projects/projects', params);

    return {
      data: response.projects,
      pagination: response.pagination,
    };
  }

  async createProject(data: {
    name: string;
    description?: string;
    start_date?: string;
    due_date?: string;
    budget?: number;
    priority?: string;
  }): Promise<Project> {
    return this.post<Project>('/projects/projects', data);
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    return this.put<Project>(`/projects/projects/${id}`, data);
  }

  async getTasks(params?: {
    page?: number;
    limit?: number;
    project_id?: string;
    status?: string;
    assigned_to?: string;
  }): Promise<PaginatedResponse<Task>> {
    const response = await this.get<{
      tasks: Task[];
      pagination: PaginatedResponse<any>['pagination'];
    }>('/projects/tasks', params);

    return {
      data: response.tasks,
      pagination: response.pagination,
    };
  }

  async createTask(data: {
    project_id?: string;
    title: string;
    description?: string;
    priority?: string;
    assigned_to?: string;
    due_date?: string;
    estimated_hours?: number;
    tags?: string[];
  }): Promise<Task> {
    return this.post<Task>('/projects/tasks', data);
  }

  async updateTask(id: string, data: Partial<Task>): Promise<Task> {
    return this.put<Task>(`/projects/tasks/${id}`, data);
  }

  async getProjectStats(): Promise<{
    projectStats: any[];
    taskStats: any[];
    recentTasks: any[];
  }> {
    return this.get('/projects/dashboard/stats');
  }

  // Workflows methods
  async getWorkflows(params?: {
    page?: number;
    limit?: number;
    status?: string;
    is_template?: boolean;
  }): Promise<PaginatedResponse<Workflow>> {
    const response = await this.get<{
      workflows: Workflow[];
      pagination: PaginatedResponse<any>['pagination'];
    }>('/workflows/workflows', params);

    return {
      data: response.workflows,
      pagination: response.pagination,
    };
  }

  async getWorkflow(id: string): Promise<Workflow> {
    return this.get<Workflow>(`/workflows/workflows/${id}`);
  }

  async createWorkflow(data: {
    name: string;
    description?: string;
    nodes?: any[];
    edges?: any[];
    triggers?: any[];
    variables?: Record<string, any>;
    is_template?: boolean;
  }): Promise<Workflow> {
    return this.post<Workflow>('/workflows/workflows', data);
  }

  async updateWorkflow(id: string, data: Partial<Workflow>): Promise<Workflow> {
    return this.put<Workflow>(`/workflows/workflows/${id}`, data);
  }

  async deleteWorkflow(id: string): Promise<{ message: string }> {
    return this.delete(`/workflows/workflows/${id}`);
  }

  async startExecution(data: { workflow_id: string; trigger_data?: any }): Promise<{
    execution_id: string;
    status: string;
    message: string;
  }> {
    return this.post('/workflows/executions', data);
  }

  async getExecutions(params?: {
    workflow_id?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Execution>> {
    const response = await this.get<{
      executions: Execution[];
      pagination: PaginatedResponse<any>['pagination'];
    }>('/workflows/executions', params);

    return {
      data: response.executions,
      pagination: response.pagination,
    };
  }

  async getExecution(id: string): Promise<Execution> {
    return this.get<Execution>(`/workflows/executions/${id}`);
  }

  async getWorkflowStats(): Promise<{
    workflowStats: any[];
    executionStats: any[];
    recentExecutions: any[];
  }> {
    return this.get('/workflows/stats');
  }

  // AI methods
  async getAIProviders(): Promise<{
    providers: any[];
    tenantConfig: any;
  }> {
    return this.get('/ai/providers');
  }

  async configureAIProvider(data: {
    provider: string;
    apiKey: string;
    models: any;
  }): Promise<{ message: string; config: any }> {
    return this.post('/ai/providers', data);
  }

  async createChatCompletion(data: {
    messages: Array<{ role: string; content: string }>;
    model?: string;
    max_tokens?: number;
    temperature?: number;
    stream?: boolean;
  }): Promise<{
    response: any;
    usage: any;
    provider: string;
    model: string;
  }> {
    return this.post('/ai/chat-completion', data);
  }

  async createEmbedding(data: {
    input: string | string[];
    model?: string;
  }): Promise<{
    embeddings: any[];
    usage: any;
    provider: string;
    model: string;
  }> {
    return this.post('/ai/embeddings', data);
  }

  async searchVectors(data: {
    query: string;
    top_k?: number;
    threshold?: number;
    source_filter?: string;
  }): Promise<{
    query: string;
    results: any[];
    total_results: number;
  }> {
    return this.post('/ai/vector-search', data);
  }

  async getAIUsage(): Promise<{
    period: any;
    total_tokens: number;
    daily_usage: Record<string, number>;
    requests: number;
  }> {
    return this.get('/ai/usage');
  }

  // CRM Dashboard
  async getCRMDashboardStats(): Promise<{
    leadStats: any[];
    contactStats: any[];
    pipelineStats: any[];
    recentActivities: any[];
  }> {
    return this.get('/crm/dashboard/stats');
  }
}

// Export singleton instance
export const api = new ApiService();
export default api;
