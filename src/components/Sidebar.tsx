import React from 'react';

const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-gray-200 dark:bg-gray-800 p-4 hidden md:block flex-shrink-0">
      <h2 className="text-lg font-semibold mb-4">Options</h2>
      {/* Placeholder for future options */}
      <p className="text-sm text-gray-600 dark:text-gray-400">Transpilation settings and history will appear here.</p>
    </aside>
  );
};

export default Sidebar; 