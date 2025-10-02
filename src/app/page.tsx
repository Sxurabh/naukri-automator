"use client";

import { useState, useEffect, useRef } from 'react';

const JOB_SECTIONS = ["Profile", "Top Candidate", "Preferences", "You Might Like"];

export default function HomePage() {
  const [naukriCookie, setNaukriCookie] = useState("");
  const [selectedSection, setSelectedSection] = useState(JOB_SECTIONS[0]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom of the logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookie: naukriCookie, section: selectedSection }),
      });

      if (!response.body) {
        throw new Error("Response body is empty.");
      }

      // Handle the streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setLogs(prev => [...prev, ...chunk.split('\n').filter(Boolean)]);
      }

    } catch (error: any) {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] FATAL: ${error.message}`]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen p-4">
      <div className="border border-gray-700 rounded-lg shadow-lg w-full max-w-3xl">
        <div className="p-3 border-b border-gray-700 bg-gray-900/50 rounded-t-lg">
          <h1 className="text-lg font-bold text-green-400">Naukri.com Automator</h1>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-3">
            <div>
              <label htmlFor="cookie" className="block text-xs font-medium text-gray-400 mb-1">
                Naukri Session Cookie (AUTH_COOKIE)
              </label>
              <textarea
                id="cookie"
                rows={2}
                className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-xs text-gray-200 focus:ring-1 focus:ring-green-500 focus:border-green-500"
                placeholder="Paste your cookie value here..."
                value={naukriCookie}
                onChange={(e) => setNaukriCookie(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Target Section</label>
              <div className="flex flex-wrap gap-2">
                {JOB_SECTIONS.map(section => (
                  <button
                    key={section}
                    onClick={() => setSelectedSection(section)}
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                      selectedSection === section
                        ? 'bg-green-600 text-white font-semibold'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {section}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="md:col-span-1 flex items-end">
            <button
              onClick={handleStartAutomation}
              disabled={isLoading}
              className="w-full h-fit bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Running..." : "Start"}
            </button>
          </div>
        </div>

        <div className="bg-black rounded-b-lg p-4 h-72 overflow-y-auto">
          <div className="text-xs">
            {logs.map((log, index) => (
              <p key={index} className={`log-entry whitespace-pre-wrap ${log.includes('ERROR') || log.includes('FATAL') ? 'text-red-400' : 'text-green-400'}`}>
                <span className="text-gray-600 mr-2 select-none">{`$`}</span>{log}
              </p>
            ))}
            {isLoading && !logs.some(l => l.includes('Complete')) && (
               <p className="text-green-400 animate-pulse">
                 <span className="text-gray-600 mr-2 select-none">{`$`}</span>Awaiting next step...
               </p>
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>
    </main>
  );
}