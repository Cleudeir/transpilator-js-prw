import React from 'react';
import StatusIndicator from './StatusIndicator';

const Header: React.FC = () => {
  return (
    <header className="bg-blue-600 dark:bg-blue-800 text-white p-4 shadow-md flex justify-between items-center">
      <h1 className="text-xl font-bold">JavaScript &lt;=&gt; AdvPL Transpiler</h1>
      <StatusIndicator />
    </header>
  );
};

export default Header; 