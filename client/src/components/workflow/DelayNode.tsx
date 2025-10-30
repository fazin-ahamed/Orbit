import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Timer } from 'lucide-react';

const DelayNode: React.FC<NodeProps> = ({ data, selected }) => {
  const delayData = data as {
    label: string;
    type: string;
    config: {
      duration?: number;
      unit?: string;
    };
  };
  
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
        className="w-3 h-3 bg-yellow-500"
      />

      <div className="flex items-center">
        <div className="rounded-full w-8 h-8 flex items-center justify-center bg-yellow-100">
          <Timer className="w-4 h-4 text-yellow-600" />
        </div>
        <div className="ml-2">
          <div className="text-sm font-bold">{delayData.label}</div>
          <div className="text-xs text-gray-500">Delay</div>
        </div>
      </div>

      <div className="mt-2 text-xs">
        {delayData.config?.duration && delayData.config?.unit && (
          <div>Wait: {delayData.config.duration} {delayData.config.unit}</div>
        )}
      </div>
    </div>
  );
};

export default DelayNode;
