'use client';

import React from 'react';
import { format } from 'date-fns';

type MessageProps = {
  message: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date | string;
  };
};

export default function MessageDisplay({ message }: MessageProps) {
  const timestamp = typeof message.timestamp === 'string' 
    ? new Date(message.timestamp) 
    : message.timestamp;
  
  // Helper function to render content with code blocks and tables
  const renderContent = (content: string) => {
    // First, split by code blocks (```code```)
    const parts = content.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      // Check if this part is a code block
      if (part.startsWith('```') && part.endsWith('```')) {
        // Extract the code and language
        const match = part.match(/```(\w*)\n([\s\S]*?)```/);
        
        if (match) {
          const [, language, code] = match;
          
          return (
            <div key={index} className="my-2 rounded-md overflow-hidden">
              {language && (
                <div className="bg-gray-800 text-gray-200 text-xs py-1 px-3">
                  {language}
                </div>
              )}
              <pre className="bg-gray-900 text-gray-100 p-3 overflow-x-auto whitespace-pre-wrap break-words">
                <code className="break-words">{code}</code>
              </pre>
            </div>
          );
        }
        
        // Fallback for malformed code blocks
        return (
          <pre key={index} className="my-2 bg-gray-100 p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-words">
            <code className="break-words">{part.slice(3, -3)}</code>
          </pre>
        );
      }
      
      // Check if this part contains an ASCII table (with +---+---+ format)
      if (part.includes('+--') && part.includes('\n+')) {
        const lines = part.split('\n');
        
        // Filter out the rows that are just borders (contain only +, -, |)
        const borderRows = lines.filter(line => 
          line.trim().startsWith('+') && 
          line.trim().endsWith('+') && 
          /^[+\-|]+$/.test(line.trim())
        );
        
        // Get data rows (rows between the borders)
        const dataRows = lines.filter(line => 
          line.trim().startsWith('|') && 
          line.trim().endsWith('|') && 
          !borderRows.includes(line)
        );
        
        if (dataRows.length > 0) {
          // Extract other text content (not part of the table)
          const nonTableContent = lines.filter(line => 
            !line.trim().startsWith('+') && 
            !line.trim().startsWith('|')
          ).join('\n');
          
          return (
            <React.Fragment key={index}>
              {nonTableContent && (
                <div className="whitespace-pre-wrap mb-3">
                  {nonTableContent.split('\n').map((line, i) => (
                    <React.Fragment key={i}>
                      {line}
                      {i < nonTableContent.split('\n').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </div>
              )}
              <div className="overflow-x-auto mb-3 max-w-full">
                <table className="min-w-full border-collapse border border-gray-300">
                  <tbody>
                    {dataRows.map((row, i) => (
                      <tr key={i} className={i === 0 ? "bg-gray-100" : ""}>
                        {row.split('|').filter(Boolean).map((cell, j) => {
                          if (i === 0) {
                            return <th key={j} className="px-4 py-2 text-left border border-gray-300">{cell.trim()}</th>;
                          }
                          return <td key={j} className="px-4 py-2 border border-gray-300">{cell.trim()}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </React.Fragment>
          );
        }
      }
      
      // Check if this part contains a Markdown table
      else if (part.includes('|') && part.includes('\n|')) {
        const lines = part.split('\n');
        const tableLines = lines.filter(line => line.trim().startsWith('|') && line.trim().endsWith('|'));
        
        if (tableLines.length >= 2) {
          // This looks like a Markdown table
          const tableContent = tableLines.join('\n');
          const nonTableContent = lines.filter(line => !line.trim().startsWith('|') || !line.trim().endsWith('|')).join('\n');
          
          return (
            <React.Fragment key={index}>
              {nonTableContent && (
                <div className="whitespace-pre-wrap mb-3">
                  {nonTableContent.split('\n').map((line, i) => (
                    <React.Fragment key={i}>
                      {line}
                      {i < nonTableContent.split('\n').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </div>
              )}
              <div className="overflow-x-auto mb-3 max-w-full">
                <table className="min-w-full border-collapse">
                  <tbody>
                    {tableLines.map((line, i) => (
                      <tr key={i} className={i === 1 ? "border-t border-b" : ""}>
                        {line.split('|').filter(Boolean).map((cell, j) => {
                          if (i === 0) {
                            return <th key={j} className="px-4 py-2 text-left">{cell.trim()}</th>;
                          }
                          // Skip the separator row (row with dashes)
                          if (i === 1 && line.includes('----')) {
                            return null;
                          }
                          return <td key={j} className="px-4 py-2 border-t">{cell.trim()}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </React.Fragment>
          );
        }
      }
      
      // Regular text - render paragraphs
      return (
        <div key={index} className="whitespace-pre-wrap">
          {part.split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {line}
              {i < part.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </div>
      );
    });
  };
  
  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`rounded-lg p-3 max-w-[85%] ${
        message.role === 'user' 
          ? 'bg-blue-500 text-white' 
          : 'bg-white border border-gray-200 text-gray-800'
      }`}>
        <div className="flex items-center mb-1">
          <div className={`text-xs ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
            {message.role === 'user' ? 'You' : 'Assistant'}
          </div>
          <div className={`text-xs ml-auto ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
            {format(timestamp, 'p')}
          </div>
        </div>
        <div className={`text-sm break-words ${message.role === 'user' ? 'text-white' : 'text-gray-800'}`}>
          {renderContent(message.content)}
        </div>
      </div>
    </div>
  );
} 