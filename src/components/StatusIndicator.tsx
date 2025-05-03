import React from 'react';

interface StatusIndicatorProps {
  isLoading: boolean;
  iterations?: number;
  time?: number;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ isLoading, iterations = 0, time = 0 }) => {
  
  // Format execution time
  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };
  
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center">
        <div className={`w-3 h-3 rounded-full mr-2 ${isLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`}></div>
        <span className="text-sm">
          {isLoading ? 'Transpiling...' : 'Ready'}
        </span>
      </div>
      
      {!isLoading && iterations > 0 && (
        <div className="text-sm">
          <span className="text-gray-400 mr-1">Iterations:</span>
          <span>{iterations}</span>
        </div>
      )}
      
      {!isLoading && time > 0 && (
        <div className="text-sm">
          <span className="text-gray-400 mr-1">Time:</span>
          <span>{formatTime(time)}</span>
        </div>
      )}
    </div>
  );
};

export default StatusIndicator; 