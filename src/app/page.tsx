"use client";

import { useState } from 'react';

// The sub-sections available on Naukri's "Recommended Jobs" page
const JOB_SECTIONS = ["Profile", "Top Candidate", "Preferences", "You Might Like"];

export default function HomePage() {
  const [naukriCookie, setNaukriCookie] = useState("");
  const [selectedSection, setSelectedSection] = useState(JOB_SECTIONS[0]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleStartAutomation = async () => {
    if (!naukriCookie) {
      setLogs(prev => [...prev, "ERROR: Naukri session cookie is required."]);
      return;
    }
    
    setIsLoading(true);
    setLogs([`[${new Date().toLocaleTimeString()}] Starting automation for '${selectedSection}' section...`]);

    try {
      const response = await fetch('/api/start-automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cookie: naukriCookie,
          section: selectedSection,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "An unknown error occurred.");
      }

      // We will implement a streaming response later for real-time logs.
      // For now, we just get the final result.
      const result = await response.json();
      setLogs(prev => [...prev, ...result.logs, `[${new Date().toLocaleTimeString()}] ${result.summary}`]);

    } catch (error: any) {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] FATAL: ${error.message}`]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="container mx-auto p-4 md:p-8">
      <div className="border border-gray-700 rounded-lg shadow-lg max-w-4xl mx-auto">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 bg-gray-900/50 rounded-t-lg">
          <h1 className="text-xl font-bold text-green-400">Naukri.com Automation Dashboard</h1>
          <p className="text-sm text-gray-400">One-click job application bot</p>
        </div>

        {/* Controls */}
        <div className="p-4 space-y-4">
          <div>
            <label htmlFor="cookie" className="block text-sm font-medium text-gray-300 mb-2">
              Naukri Session Cookie
            </label>
            <textarea
              id="cookie"
              rows={3}
              className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-sm text-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Paste your 'AUTH_COOKIE' value here..."
              value={naukriCookie}
              onChange={(e) => setNaukriCookie(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Target Section</label>
            <div className="flex flex-wrap gap-2">
              {JOB_SECTIONS.map(section => (
                <button
                  key={section}
                  onClick={() => setSelectedSection(section)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    selectedSection === section
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {section}
                </button>
              ))}
            </div>
          </div>
          
          <button
            onClick={handleStartAutomation}
            disabled={isLoading}
            className="w-full bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Running..." : "Start Automation"}
          </button>
        </div>

        {/* Terminal Log */}
        <div className="bg-black rounded-b-lg p-4 h-80 overflow-y-auto">
          <div className="font-mono text-sm">
            {logs.map((log, index) => (
              <p key={index} className={`whitespace-pre-wrap ${log.includes('ERROR') || log.includes('FATAL') ? 'text-red-400' : 'text-green-400'}`}>
                <span className="text-gray-500 mr-2">{`>`}</span>{log}
              </p>
            ))}
            {isLoading && (
               <p className="text-green-400 animate-pulse">
                 <span className="text-gray-500 mr-2">{`>`}</span>Waiting for logs...
               </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}