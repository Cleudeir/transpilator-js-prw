import React, { useState, useEffect } from 'react';
import { checkHealth } from '../lib/api';

const StatusIndicator: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    const checkConnection = async () => {
      const status = await checkHealth();
      setIsConnected(status);
    };

    // Check connection on component mount
    checkConnection();

    // Set up periodic checking
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center">
      <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
      <span className="text-xs text-gray-600 dark:text-gray-400">
        {isConnected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
};

export default StatusIndicator; 