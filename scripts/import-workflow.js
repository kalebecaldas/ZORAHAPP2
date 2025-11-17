import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the workflow JSON file
const workflowPath = process.argv[2] || 'workflow_dinamico_completo.json';
const fullPath = path.resolve(process.cwd(), workflowPath);

console.log('Importing workflow from:', fullPath);

try {
  const workflowData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  
  // Convert to API format
  const workflowPayload = {
    name: workflowData.name,
    description: workflowData.description,
    isActive: workflowData.isActive,
    nodes: workflowData.nodes,
    connections: workflowData.connections
  };
  
  console.log('Workflow data prepared:');
  console.log('- Name:', workflowPayload.name);
  console.log('- Description:', workflowPayload.description);
  console.log('- Nodes:', workflowPayload.nodes.length);
  console.log('- Connections:', workflowPayload.connections.length);
  
  // Make API call to create workflow
  const apiUrl = process.env.API_URL || 'http://localhost:3000';
  
  console.log('\nTo import this workflow, run the following curl command:');
  console.log(`curl -X POST ${apiUrl}/api/workflows \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(workflowPayload, null, 2)}'`);
  
  console.log('\nOr use this simplified command:');
  console.log(`curl -X POST ${apiUrl}/api/workflows -H "Content-Type: application/json" -d '${JSON.stringify(workflowPayload)}'`);
  
} catch (error) {
  console.error('Error reading or parsing workflow file:', error.message);
  process.exit(1);
}