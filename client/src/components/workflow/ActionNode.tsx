import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Play } from 'lucide-react';

const ActionNode: React.FC<NodeProps> = ({ data, selected }) => {
  const actionData = data as {
    label: string;
    type: string;
    config: {
      action?: string;
      template?: string;
    };
  };
  
  return (
    <div className={`px-4 py-2 shadow-md rounded-md bg-white border-2 min-w-[200px] ${
      selected ? 'border-blue-500' : 'border-orange-500'
    }`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-orange-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-orange-500"
      />

      <div className="flex items-center">
        <div className="rounded-full w-8 h-8 flex items-center justify-center bg-orange-100">
          <Play className="w-4 h-4 text-orange-600" />
        </div>
        <div className="ml-2">
          <div className="text-sm font-bold">{actionData.label}</div>
          <div className="text-xs text-gray-500">Action</div>
        </div>
      </div>

      <div className="mt-2 text-xs">
        {actionData.config?.action && (
          <div>Action: {actionData.config.action}</div>
        )}
        {actionData.config?.template && (
          <div>Template: {actionData.config.template}</div>
        )}
      </div>
    </div>
  );
};

export default ActionNode;
