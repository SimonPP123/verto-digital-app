import React from 'react';

interface SidebarProps {
  title: string;
  children: React.ReactNode;
  actionButton?: {
    label: string;
    onClick: () => void;
  };
}

const Sidebar: React.FC<SidebarProps> = ({
  title,
  children,
  actionButton
}) => {
  return (
    <>
      <div className="p-4 border-b bg-white">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">{title}</h2>
        {actionButton && (
          <button
            onClick={actionButton.onClick}
            className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            {actionButton.label}
          </button>
        )}
      </div>
      <div className="h-[calc(100vh-5rem)] overflow-y-auto">
        {children}
      </div>
    </>
  );
};

export default Sidebar; 