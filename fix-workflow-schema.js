const fs = require('fs');

const workflowControllerPath = './src/services/workflow/workflow.controller.ts';

try {
  let content = fs.readFileSync(workflowControllerPath, 'utf8');
  
  // Replace all schema.table references with just table names
  const replacements = [
    { from: /workflow\.workflows/g, to: 'workflows' },
    { from: /workflow\.executions/g, to: 'workflow_executions' },
    { from: /workflow\.execution_steps/g, to: 'workflow_execution_steps' },
    { from: /workflow\.triggers/g, to: 'workflow_triggers' },
    { from: /workflow\.trigger_workflows/g, to: 'workflow_trigger_workflows' },
    { from: /workflow\.templates/g, to: 'workflow_templates' },
    { from: /workflows\./g, to: 'workflows.' },
    { from: /executions\./g, to: 'workflow_executions.' },
    { from: /trigger_workflows\./g, to: 'workflow_trigger_workflows.' }
  ];
  
  replacements.forEach(replacement => {
    content = content.replace(replacement.from, replacement.to);
  });
  
  fs.writeFileSync(workflowControllerPath, content);
  console.log('✅ Fixed workflow controller schema references');
  
} catch (error) {
  console.error('❌ Failed to fix workflow schema:', error.message);
}