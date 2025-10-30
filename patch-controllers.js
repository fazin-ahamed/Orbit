const fs = require('fs');
const path = require('path');

// Define the table mapping from old schema.table to new table names
const tableMapping = {
  'platform.users': 'users',
  'platform.tenants': 'tenants',
  'platform.audit_logs': 'audit_logs',
  'crm.contacts': 'contacts',
  'crm.companies': 'companies',
  'crm.deals': 'deals',
  'ai_providers': 'ai_providers',
  'ai_models': 'ai_models',
  'ai_conversations': 'ai_conversations',
  'ai_messages': 'ai_messages',
  'ai_usage_logs': 'ai_usage_logs',
  'projects': 'projects',
  'project_tasks': 'project_tasks',
  'project_comments': 'project_comments',
  'workflows': 'workflows',
  'workflow_nodes': 'workflow_nodes',
  'workflow_connections': 'workflow_connections',
  'workflow_executions': 'workflow_executions',
  'subscriptions': 'subscriptions',
  'usage_tracking': 'usage_tracking',
  'invoices': 'invoices',
  'refresh_tokens': 'refresh_tokens'
};

function patchController(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace table references
    Object.entries(tableMapping).forEach(([oldTable, newTable]) => {
      const regex = new RegExp(`'${oldTable}'`, 'g');
      content = content.replace(regex, `'${newTable}'`);
    });
    
    // Fix column name mismatches
    const columnMappings = {
      'hashed_password': 'password_hash',
      'first_name': 'first_name',
      'last_name': 'last_name',
      'tenant_id': 'tenant_id',
      'resource_type': 'resource',
      'resource_id': 'resource_id'
    };
    
    Object.entries(columnMappings).forEach(([oldColumn, newColumn]) => {
      const regex = new RegExp(`\\b${oldColumn}\\b`, 'g');
      content = content.replace(regex, newColumn);
    });
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Patched: ${filePath}`);
  } catch (error) {
    console.log(`❌ Failed to patch: ${filePath} - ${error.message}`);
  }
}

function main() {
  console.log('🔧 Patching controllers to match database schema...');
  
  const controllerFiles = [
    './src/services/auth/auth.controller.ts',
    './src/services/tenant/tenant.controller.ts',
    './src/services/ai/ai.controller.ts',
    './src/services/ai/vector.controller.ts',
    './src/services/crm/crm.controller.ts',
    './src/services/workflow/workflow.controller.ts',
    './src/services/projects/projects.controller.ts',
    './src/services/billing/billing.controller.ts'
  ];
  
  controllerFiles.forEach(patchController);
  console.log('\n🎉 Controller patching completed!');
}

main();