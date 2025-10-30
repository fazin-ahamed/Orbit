import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings as SettingsIcon, User, Shield, Database, Bot } from 'lucide-react'

export default function Settings() {
  const settingsSections = [
    {
      title: 'Profile',
      description: 'Manage your account settings and preferences',
      icon: User,
      items: ['Personal Information', 'Notifications', 'Security']
    },
    {
      title: 'AI Configuration',
      description: 'Configure AI providers and models',
      icon: Bot,
      items: ['API Keys', 'Model Settings', 'Usage Limits']
    },
    {
      title: 'Security',
      description: 'Manage security settings and access controls',
      icon: Shield,
      items: ['Two-Factor Auth', 'API Tokens', 'Team Access']
    },
    {
      title: 'Data & Integrations',
      description: 'Manage data connections and third-party integrations',
      icon: Database,
      items: ['Database Settings', 'API Integrations', 'Data Export']
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {settingsSections.map((section) => {
          const Icon = section.icon
          return (
            <Card key={section.title}>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Icon className="h-5 w-5 text-blue-600" />
                  <CardTitle>{section.title}</CardTitle>
                </div>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {section.items.map((item) => (
                    <li key={item} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{item}</span>
                      <Button variant="ghost" size="sm">
                        Configure
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <SettingsIcon className="mr-2 h-5 w-5" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Version:</span> 0.1.0
            </div>
            <div>
              <span className="font-medium">Environment:</span> Development
            </div>
            <div>
              <span className="font-medium">Database:</span> PostgreSQL
            </div>
            <div>
              <span className="font-medium">AI Providers:</span> OpenAI, Groq
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
