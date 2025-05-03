import React from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import TranspilerArea from './components/TranspilerArea';
import './styles/index.css';

function App() {
  return (
    <div className="flex flex-col h-screen dark:bg-gray-900">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <TranspilerArea />
      </div>
    </div>
  );
}

export default App; 