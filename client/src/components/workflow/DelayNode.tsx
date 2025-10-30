import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Clock } from 'lucide-react';

interface DelayNodeData {
  label: string;
  type: string;
  config: {
    duration?: number;
    unit?: 'seconds' | 'minutes' | 'hours' | 'days';
  };
}

const DelayNode: React.FC<NodeProps<DelayNodeData>> = ({ data, selected }) => {
  const formatDuration = () => {
    const { duration, unit } = data.config;
    if (!duration || !unit) return 'Not set';
    return `${duration} ${unit}`;
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
        className="w-3 h-3 bg-purple-500"
      />

      <div className="flex items-center">
        <div className="rounded-full w-8 h-8 flex items-center justify-center bg-purple-100">
          <Clock className="w-4 h-4 text-purple-600" />
        </div>
        <div className="ml-2">
          <div className="text-sm font-bold">{data.label}</div>
          <div className="text-xs text-gray-500">Delay</div>
        </div>
      </div>

      <div className="mt-2 text-xs">
        <div>Duration: {formatDuration()}</div>
      </div>
    </div>
  );
};

export default DelayNode;
