import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Zap } from 'lucide-react';

const TriggerNode: React.FC<NodeProps> = ({ data, selected }) => {
  const triggerData = data as {
    label: string;
    type: string;
    config: {
      event?: string;
      schedule?: string;
      conditions?: any[];
    };
  };
  
  return (
    <div className={`px-4 py-2 shadow-md rounded-md bg-white border-2 min-w-[200px] ${
      selected ? 'border-blue-500' : 'border-green-500'
    }`}>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-green-500"
      />

      <div className="flex items-center">
        <div className="rounded-full w-8 h-8 flex items-center justify-center bg-green-100">
          <Zap className="w-4 h-4 text-green-600" />
        </div>
        <div className="ml-2">
          <div className="text-sm font-bold">{triggerData.label}</div>
          <div className="text-xs text-gray-500">Trigger</div>
        </div>
      </div>

      <div className="mt-2 text-xs">
        {triggerData.config?.event && (
          <div>Event: {triggerData.config.event}</div>
        )}
        {triggerData.config?.schedule && (
          <div>Schedule: {triggerData.config.schedule}</div>
        )}
      </div>
    </div>
  );
};

export default TriggerNode;
