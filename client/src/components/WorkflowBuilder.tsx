import React, { useCallback } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Panel,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Node types
import TriggerNode from './workflow/TriggerNode';
import ActionNode from './workflow/ActionNode';
import ConditionNode from './workflow/ConditionNode';
import DelayNode from './workflow/DelayNode';

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  delay: DelayNode,
};

const defaultEdgeOptions = {
  animated: true,
  style: { strokeWidth: 2 },
};

interface WorkflowBuilderProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onSave?: (nodes: Node[], edges: Edge[]) => void;
  onExecute?: (nodes: Node[], edges: Edge[]) => void;
  readOnly?: boolean;
}

const WorkflowBuilderContent: React.FC<WorkflowBuilderProps> = ({
  initialNodes = [],
  initialEdges = [],
  onSave,
  onExecute,
  readOnly = false,
}) => {
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition } = useReactFlow();

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addNode = useCallback(
    (type: string, label: string) => {
      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position: screenToFlowPosition({
          x: Math.random() * 500,
          y: Math.random() * 500,
        }),
        data: {
          label,
          type,
          config: {},
        },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [screenToFlowPosition, setNodes]
  );

  const handleSave = useCallback(() => {
    onSave?.(nodes, edges);
  }, [nodes, edges, onSave]);

  const handleExecute = useCallback(() => {
    onExecute?.(nodes, edges);
  }, [nodes, edges, onExecute]);

  const nodeOptions = [
    { type: 'trigger', label: 'Trigger', icon: '⚡', description: 'Start workflow on events' },
    { type: 'action', label: 'Action', icon: '🔧', description: 'Perform operations' },
    { type: 'condition', label: 'Condition', icon: '❓', description: 'Decision logic' },
    { type: 'delay', label: 'Delay', icon: '⏰', description: 'Wait before continuing' },
  ];

  return (
    <div className="h-full w-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        className="bg-gray-50"
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
      >
        <Controls showZoom={!readOnly} showFitView={!readOnly} showInteractive={!readOnly} />
        <MiniMap />

        {!readOnly && (
          <Panel position="top-left" className="bg-white p-4 rounded-lg shadow-lg border">
            <h3 className="text-lg font-semibold mb-4">Add Nodes</h3>
            <div className="grid grid-cols-2 gap-2">
              {nodeOptions.map((option) => (
                <button
                  key={option.type}
                  onClick={() => addNode(option.type, option.label)}
                  className="p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors text-left"
                >
                  <div className="text-2xl mb-1">{option.icon}</div>
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs text-gray-500">{option.description}</div>
                </button>
              ))}
            </div>
          </Panel>
        )}

        {!readOnly && (
          <Panel position="top-right" className="bg-white p-4 rounded-lg shadow-lg border">
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Workflow
              </button>
              <button
                onClick={handleExecute}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Execute Workflow
              </button>
            </div>
          </Panel>
        )}

        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
      </ReactFlow>
    </div>
  );
};

const WorkflowBuilder: React.FC<WorkflowBuilderProps> = (props) => {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderContent {...props} />
    </ReactFlowProvider>
  );
};

export default WorkflowBuilder;
