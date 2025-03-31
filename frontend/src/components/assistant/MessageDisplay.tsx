'use client';

import React, { useState } from 'react';
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
  
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [zoomedImageAlt, setZoomedImageAlt] = useState<string>('');
  
  // Helper function to handle zooming in on an image
  const handleImageClick = (imageUrl: string, altText: string) => {
    setZoomedImage(imageUrl);
    setZoomedImageAlt(altText);
  };
  
  // Helper function to close zoomed image modal
  const closeZoomedImage = () => {
    setZoomedImage(null);
    setZoomedImageAlt('');
  };
  
  // Helper function to render content with markdown elements
  const renderContent = (content: string) => {
    // Check for raw chart URLs that aren't properly formatted as markdown images
    const chartUrlPattern = /\(https:\/\/quickchart\.io\/chart\?c=[^)]+\)/g;
    let modifiedContent = content;
    
    // Convert raw chart URLs to markdown image format
    if (chartUrlPattern.test(content)) {
      modifiedContent = content.replace(
        chartUrlPattern, 
        match => {
          // Remove the parentheses and ensure proper URL encoding
          const url = match.slice(1, -1);
          return `![GA4 Analysis Chart](${url})`;
        }
      );
    }
    
    // Split by code blocks first
    const parts = modifiedContent.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      // Check if this part is a code block
      if (part.startsWith('```') && part.endsWith('```')) {
        // Extract the code and language
        const match = part.match(/```(\w*)\n([\s\S]*?)```/);
        
        if (match) {
          const [, language, code] = match;
          
          return (
            <div key={index} className="my-2 rounded-md overflow-hidden w-full">
              {language && (
                <div className="bg-gray-800 text-gray-200 text-xs py-1 px-3">
                  {language}
                </div>
              )}
              <pre className="bg-gray-900 text-gray-100 p-3 overflow-x-auto whitespace-pre-wrap break-words w-full max-w-full">
                <code className="break-words block w-full">{code}</code>
              </pre>
            </div>
          );
        }
        
        // Fallback for malformed code blocks
        return (
          <pre key={index} className="my-2 bg-gray-100 p-3 rounded-md overflow-x-auto whitespace-pre-wrap break-words w-full">
            <code className="break-words block w-full">{part.slice(3, -3)}</code>
          </pre>
        );
      }
      
      // Process the regular text part (non-code blocks)
      return processTextContent(part, index);
    });
  };
  
  // Helper function to process regular text content with markdown elements
  const processTextContent = (content: string, blockIndex: number) => {
    const lines = content.split('\n');
    const result: React.ReactNode[] = [];
    let currentParagraph: string[] = [];
    let inTable = false;
    let tableRows: string[] = [];
    let isBigQueryTable = false;
    
    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        result.push(
          <p key={`p-${blockIndex}-${result.length}`} className="mb-3">
            {currentParagraph.map((line, i) => (
              <React.Fragment key={i}>
                {processInlineMarkdown(line)}
                {i < currentParagraph.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
        currentParagraph = [];
      }
    };
    
    const flushTable = () => {
      if (tableRows.length > 0) {
        // Detect if it's a markdown table
        const isMarkdownTable = tableRows.some(row => row.includes('|---'));
        // Detect if it's a BigQuery table format
        const isBigQueryFormat = isBigQueryTable;
        
        result.push(renderTable(tableRows, blockIndex, isMarkdownTable, isBigQueryFormat));
        tableRows = [];
        inTable = false;
        isBigQueryTable = false;
      }
    };
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Check for headers
      if (trimmedLine.startsWith('# ')) {
        flushParagraph();
        flushTable();
        result.push(
          <h1 key={`h1-${blockIndex}-${i}`} className="text-2xl font-bold mb-3 mt-4">
            {processInlineMarkdown(trimmedLine.substring(2))}
          </h1>
        );
      } else if (trimmedLine.startsWith('## ')) {
        flushParagraph();
        flushTable();
        result.push(
          <h2 key={`h2-${blockIndex}-${i}`} className="text-xl font-bold mb-2 mt-3">
            {processInlineMarkdown(trimmedLine.substring(3))}
          </h2>
        );
      } else if (trimmedLine.startsWith('### ')) {
        flushParagraph();
        flushTable();
        result.push(
          <h3 key={`h3-${blockIndex}-${i}`} className="text-lg font-bold mb-2 mt-3">
            {processInlineMarkdown(trimmedLine.substring(4))}
          </h3>
        );
      } else if (trimmedLine.startsWith('#### ')) {
        flushParagraph();
        flushTable();
        result.push(
          <h4 key={`h4-${blockIndex}-${i}`} className="text-md font-bold mb-1 mt-2">
            {processInlineMarkdown(trimmedLine.substring(5))}
          </h4>
        );
      }
      // Check for horizontal rule
      else if (trimmedLine.match(/^(\*{3,}|-{3,}|_{3,})$/)) {
        flushParagraph();
        flushTable();
        result.push(
          <hr key={`hr-${blockIndex}-${i}`} className="my-5 border-t border-gray-300" />
        );
      }
      // Check for lists
      else if (trimmedLine.match(/^(\d+\.|[-*+])\s/)) {
        flushParagraph();
        flushTable();
        
        const isOrderedList = /^\d+\./.test(trimmedLine);
        const listItems: string[] = [];
        let j = i;
        
        while (j < lines.length && lines[j].trim().match(/^(\d+\.|[-*+])\s/)) {
          const itemContent = lines[j].trim().replace(/^(\d+\.|[-*+])\s/, '');
          listItems.push(itemContent);
          j++;
        }
        
        if (isOrderedList) {
          result.push(
            <ol key={`ol-${blockIndex}-${i}`} className="list-decimal pl-5 mb-3">
              {listItems.map((item, idx) => (
                <li key={idx} className="mb-1">{processInlineMarkdown(item)}</li>
              ))}
            </ol>
          );
        } else {
          result.push(
            <ul key={`ul-${blockIndex}-${i}`} className="list-disc pl-5 mb-3">
              {listItems.map((item, idx) => (
                <li key={idx} className="mb-1">{processInlineMarkdown(item)}</li>
              ))}
            </ul>
          );
        }
        
        i = j - 1; // Skip processed lines
      }
      // Check for BigQuery table format (starts with '+--' and ends with '+') 
      else if (trimmedLine.startsWith('+') && trimmedLine.endsWith('+') && 
               trimmedLine.includes('-') && (trimmedLine.includes('+--') || trimmedLine.includes('-+-'))) {
        if (!inTable) {
          flushParagraph();
          inTable = true;
          isBigQueryTable = true;
        }
        tableRows.push(trimmedLine);
      }
      // Standard markdown table (starts with | and ends with |)
      else if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
        if (!inTable) {
          flushParagraph();
          inTable = true;
        }
        tableRows.push(trimmedLine);
      }
      // If we detected a BigQuery table and this is a data row (usually starts with |)
      else if (inTable && isBigQueryTable && trimmedLine.startsWith('|')) {
        tableRows.push(trimmedLine);
      }
      // Empty line marks the end of a paragraph or table
      else if (trimmedLine === '') {
        if (inTable) {
          flushTable();
        } else {
          flushParagraph();
        }
      }
      // Regular text line
      else {
        if (inTable) {
          flushTable();
        }
        currentParagraph.push(line);
      }
    }
    
    // Flush any remaining content
    flushTable();
    flushParagraph();
    
    return <div key={`block-${blockIndex}`}>{result}</div>;
  };
  
  // Process inline markdown (bold, italic, etc.)
  const processInlineMarkdown = (text: string) => {
    // Check for markdown image links first
    const imageRegex = /!\[(.*?)\]\((https?:\/\/[^)]+)\)/g;
    const hasImages = imageRegex.test(text);
    
    if (hasImages) {
      // Reset regex lastIndex for reuse
      imageRegex.lastIndex = 0;
      
      const parts = [];
      let lastIndex = 0;
      let match;
      
      while ((match = imageRegex.exec(text)) !== null) {
        // Add text before the image
        if (match.index > lastIndex) {
          const beforeText = text.substring(lastIndex, match.index);
          parts.push(<span key={`text-${lastIndex}`} dangerouslySetInnerHTML={{ __html: processMarkdownText(beforeText) }} />);
        }
        
        // Add the image
        const [, altText, imageUrl] = match;
        
        // Check if this is a chart from QuickChart.io
        const isChart = imageUrl.includes('quickchart.io/chart');
        
        // Ensure the URL is properly encoded for QuickChart
        const encodedUrl = isChart ? imageUrl.replace(/\s/g, '%20') : imageUrl;
        
        parts.push(
          <div key={`img-${match.index}`} className={`my-4 ${isChart ? 'chart-container relative w-full max-w-full overflow-hidden' : ''}`}>
            <img 
              src={encodedUrl} 
              alt={altText} 
              className={`${isChart ? 'w-full h-auto max-h-[400px] object-contain rounded-lg shadow-md cursor-pointer border border-gray-200' : 'inline-block max-w-full h-auto'}`}
              loading="lazy"
              onClick={() => isChart && handleImageClick(encodedUrl, altText)}
            />
            {isChart && (
              <>
                <div className="text-xs text-gray-500 mt-1 text-center truncate">{altText}</div>
                <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full opacity-80">
                  Click to enlarge
                </div>
              </>
            )}
          </div>
        );
        
        lastIndex = imageRegex.lastIndex;
      }
      
      // Add any remaining text
      if (lastIndex < text.length) {
        const remainingText = text.substring(lastIndex);
        parts.push(<span key={`text-${lastIndex}`} dangerouslySetInnerHTML={{ __html: processMarkdownText(remainingText) }} />);
      }
      
      return <>{parts}</>;
    }
    
    // If no images, process as regular markdown text
    return <span dangerouslySetInnerHTML={{ __html: processMarkdownText(text) }} />;
  };
  
  // Helper function to process regular markdown text without images
  const processMarkdownText = (text: string) => {
    // Replace ** or __ with bold
    let processed = text.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
    
    // Replace * or _ with italic
    processed = processed.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');
    
    // Replace ` with inline code
    processed = processed.replace(/`(.*?)`/g, '<code>$1</code>');
    
    return processed;
  };
  
  // Render a table from markdown-style or ASCII-style tables
  const renderTable = (tableRows: string[], blockIndex: number, isMarkdownStyle: boolean, isBigQueryFormat: boolean = false) => {
    let dataRows: string[] | string[][] = tableRows;
    let headerRow: string[] = [];
    
    if (isBigQueryFormat) {
      // For BigQuery tables, convert ASCII format to structured data
      const cleanedRows = processBigQueryTable(tableRows);
      if (cleanedRows.header && cleanedRows.rows) {
        headerRow = cleanedRows.header;
        dataRows = cleanedRows.rows;
      }
    } else if (isMarkdownStyle) {
      // For markdown tables, remove separator row (contains only |, -, and spaces)
      dataRows = tableRows.filter(row => !row.match(/^\|[\s\-\|]*\|$/));
    }
    
    // Get column alignment information if it's a markdown table
    let alignments: ('left' | 'center' | 'right')[] = [];
    if (isMarkdownStyle && !isBigQueryFormat) {
      const separatorRow = tableRows.find(row => row.match(/^\|[\s\-\|]*\|$/));
      if (separatorRow) {
        alignments = separatorRow.split('|').filter(Boolean).map(cell => {
          const trimmedCell = cell.trim();
          if (trimmedCell.startsWith(':') && trimmedCell.endsWith(':')) return 'center';
          if (trimmedCell.endsWith(':')) return 'right';
          return 'left';
        });
      }
    }
    
    return (
      <div key={`table-container-${blockIndex}`} className="overflow-x-auto my-4 w-full max-w-full">
        <div className="inline-block max-w-full">
          <table className="w-full border-collapse border border-gray-300 table-fixed">
            <tbody>
              {Array.isArray(dataRows) && dataRows.map((row, rowIdx) => {
                let cells: string[];
                const isStringArray = Array.isArray(row);
                
                if (isBigQueryFormat && isStringArray) {
                  // For BigQuery format, row is already a string array
                  cells = row;
                } else {
                  // For markdown tables, split by pipe and trim
                  const rowStr = isStringArray ? row.join('|') : row;
                  cells = rowStr.split('|').filter(Boolean).map((cell: string) => cell.trim());
                }
                
                const isHeader = rowIdx === 0 || (isBigQueryFormat && !isStringArray && row.includes('---'));
                
                if (isHeader && cells.length === 1 && cells[0].includes('---')) {
                  // This is a separator row in BigQuery format, skip it
                  return null;
                }
                
                return (
                  <tr 
                    key={rowIdx} 
                    className={isHeader ? "bg-gray-100" : rowIdx % 2 === 0 ? "bg-gray-50" : ""}
                  >
                    {cells.map((cell, cellIdx) => {
                      const align = alignments[cellIdx] || 'left';
                      const style = { textAlign: align };
                      
                      return isHeader ? (
                        <th 
                          key={cellIdx} 
                          className="px-4 py-2 border border-gray-300 font-medium whitespace-normal break-words max-w-xs"
                          style={style as React.CSSProperties}
                        >
                          {processInlineMarkdown(cell)}
                        </th>
                      ) : (
                        <td 
                          key={cellIdx} 
                          className="px-4 py-2 border border-gray-300 whitespace-normal break-words max-w-xs"
                          style={style as React.CSSProperties}
                        >
                          {processInlineMarkdown(cell)}
                        </td>
                      );
                    })}
                  </tr>
                );
              }).filter(Boolean)}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  
  // Process BigQuery ASCII table format to extract structured data
  const processBigQueryTable = (rows: string[]): { header: string[], rows: string[][] } => {
    const result: { header: string[], rows: string[][] } = {
      header: [],
      rows: []
    };
    
    // Find header separator (usually a row with '+-+-+' pattern)
    const headerSeparatorIndex = rows.findIndex(row => 
      row.startsWith('+') && row.endsWith('+') && row.includes('-+-')
    );
    
    if (headerSeparatorIndex > 0 && headerSeparatorIndex < rows.length - 1) {
      // Extract header row (usually the row before header separator)
      const headerRow = rows[headerSeparatorIndex - 1];
      
      // Parse header cells
      if (headerRow.startsWith('|') && headerRow.endsWith('|')) {
        // Split by | and remove empty entries
        result.header = headerRow
          .split('|')
          .map(cell => cell.trim())
          .filter(cell => cell.length > 0);
      }
      
      // Process data rows (after the header separator)
      for (let i = headerSeparatorIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        
        // Skip separator rows
        if (row.startsWith('+') && row.endsWith('+') && row.includes('-')) {
          continue;
        }
        
        // Parse data cells
        if (row.startsWith('|') && row.endsWith('|')) {
          const cells = row
            .split('|')
            .map(cell => cell.trim())
            .filter(cell => cell.length > 0);
          
          if (cells.length > 0) {
            result.rows.push(cells);
          }
        }
      }
    }
    
    return result;
  };
  
  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`rounded-lg p-3 w-[80%] max-w-[80%] overflow-hidden ${
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
        <div className={`text-sm break-words whitespace-pre-wrap overflow-hidden ${message.role === 'user' ? 'text-white' : 'text-gray-800'}`}>
          {renderContent(message.content)}
        </div>
      </div>
      
      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4" onClick={closeZoomedImage}>
          <div className="max-w-[95%] max-h-[95%] bg-white rounded-lg shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-medium text-gray-900 truncate">{zoomedImageAlt}</h3>
              <button 
                className="text-gray-500 hover:text-gray-800" 
                onClick={closeZoomedImage}
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 bg-gray-100 flex items-center justify-center">
              <img 
                src={zoomedImage} 
                alt={zoomedImageAlt} 
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>
            <div className="p-3 bg-white border-t text-center">
              <div className="text-sm text-gray-600">{zoomedImageAlt}</div>
              <a 
                href={zoomedImage} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-block mt-2 text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                Open image in new tab
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 