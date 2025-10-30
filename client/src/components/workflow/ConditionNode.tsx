import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitBranch } from 'lucide-react';

interface ConditionNodeData {
  label: string;
  type: string;
  config: {
    condition?: string;
    operator?: string;
    value1?: string;
    value2?: string;
  };
}

const ConditionNode: React.FC<NodeProps<ConditionNodeData>> = ({ data, selected }) => {
  return (
    <div className={`px-4 py-2 shadow-md rounded-md bg-white border-2 min-w-[200px] ${
      selected ? 'border-blue-500' : 'border-yellow-500'
    }`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-yellow-500"
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
        <div className="rounded-full w-8 h-8 flex items-center justify-center bg-yellow-100">
          <GitBranch className="w-4 h-4 text-yellow-600" />
        </div>
        <div className="ml-2">
          <div className="text-sm font-bold">{data.label}</div>
          <div className="text-xs text-gray-500">Condition</div>
        </div>
      </div>

      <div className="mt-2 text-xs">
        {data.config.condition && (
          <div>Condition: {data.config.condition}</div>
        )}
        {data.config.operator && (
          <div>Operator: {data.config.operator}</div>
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
