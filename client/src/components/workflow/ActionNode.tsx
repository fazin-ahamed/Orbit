import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Wrench } from 'lucide-react';

interface ActionNodeData {
  label: string;
  type: string;
  config: {
    action?: string;
    template?: string;
    params?: Record<string, any>;
  };
}

const ActionNode: React.FC<NodeProps<ActionNodeData>> = ({ data, selected }) => {
  return (
    <div className={`px-4 py-2 shadow-md rounded-md bg-white border-2 min-w-[200px] ${
      selected ? 'border-blue-500' : 'border-blue-500'
    }`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-blue-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-blue-500"
      />

      <div className="flex items-center">
        <div className="rounded-full w-8 h-8 flex items-center justify-center bg-blue-100">
          <Wrench className="w-4 h-4 text-blue-600" />
        </div>
        <div className="ml-2">
          <div className="text-sm font-bold">{data.label}</div>
          <div className="text-xs text-gray-500">Action</div>
        </div>
      </div>

      <div className="mt-2 text-xs">
        {data.config.action && (
          <div>Action: {data.config.action}</div>
        )}
        {data.config.template && (
          <div>Template: {data.config.template}</div>
        )}
      </div>
    </div>
  );
};

export default ActionNode;
