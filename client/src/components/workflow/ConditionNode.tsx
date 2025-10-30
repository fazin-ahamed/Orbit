import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitBranch } from 'lucide-react';

const ConditionNode: React.FC<NodeProps> = ({ data, selected }) => {
  const conditionData = data as {
    label: string;
    type: string;
    config: {
      condition?: string;
      operator?: string;
    };
  };
  
  return (
    <div className={`px-4 py-2 shadow-md rounded-md bg-white border-2 min-w-[200px] ${
      selected ? 'border-blue-500' : 'border-purple-500'
    }`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-purple-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="w-3 h-3 bg-green-500"
        style={{ left: '30%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="w-3 h-3 bg-red-500"
        style={{ left: '70%' }}
      />

      <div className="flex items-center">
        <div className="rounded-full w-8 h-8 flex items-center justify-center bg-purple-100">
          <GitBranch className="w-4 h-4 text-purple-600" />
        </div>
        <div className="ml-2">
          <div className="text-sm font-bold">{conditionData.label}</div>
          <div className="text-xs text-gray-500">Condition</div>
        </div>
      </div>

      <div className="mt-2 text-xs">
        {conditionData.config?.condition && (
          <div>Condition: {conditionData.config.condition}</div>
        )}
        {conditionData.config?.operator && (
          <div>Operator: {conditionData.config.operator}</div>
        )}
      </div>

      <div className="mt-1 flex justify-between text-xs">
        <span className="text-green-600">True</span>
        <span className="text-red-600">False</span>
      </div>
    </div>
  );
};

export default ConditionNode;
