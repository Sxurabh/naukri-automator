"use client";

import { useState, useEffect, useRef } from 'react';

const JOB_SECTIONS = ["Profile", "Top Candidate", "Preferences", "You Might Like"];

// --- Reusable UI Components based on the provided design ---

const Panel = ({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) => (
  <div className={`bg-panel-bg border border-accent flex flex-col ${className}`}>
    <div className="px-4 py-2 border-b border-accent bg-black/20">
      <h2 className="text-sm font-bold tracking-widest text-accent uppercase">{title}</h2>
    </div>
    <div className="p-4 flex-grow overflow-hidden">{children}</div>
  </div>
);

const Sidebar = () => (
    <aside className="w-64 bg-panel-bg border-r border-accent flex-col h-full hidden lg:flex">
        <div className="p-4 border-b border-accent">
            <h1 className="text-lg font-bold text-white">TACTICAL OPS</h1>
            <p className="text-xs text-text-secondary">V2.1.7 / CLASSIFIED</p>
        </div>
        <nav className="flex-grow p-4 space-y-2">
            <a href="#" className="flex items-center px-3 py-2 text-sm font-semibold bg-accent/20 text-accent border border-accent/80">
                COMMAND CENTER
            </a>
            <a href="#" className="flex items-center px-3 py-2 text-sm text-text-secondary hover:bg-white/5">AGENT NETWORK</a>
            <a href="#" className="flex items-center px-3 py-2 text-sm text-text-secondary hover:bg-white/5">OPERATIONS</a>
            <a href="#" className="flex items-center px-3 py-2 text-sm text-text-secondary hover:bg-white/5">INTELLIGENCE</a>
        </nav>
        <div className="p-4 border-t border-accent text-xs text-text-secondary space-y-1">
            <p className="text-green-400">● SYSTEM ONLINE</p>
            <p>UPTIME: 72:14:33</p>
            <p>AGENTS: 647 ACTIVE</p>
        </div>
    </aside>
);


// --- Main Page Component ---
export default function TacticalDashboard() {
  const [naukriCookie, setNaukriCookie] = useState("");
  const [selectedSection, setSelectedSection] = useState(JOB_SECTIONS[0]);
  const [logs, setLogs] = useState<string[]>(['Standby. Awaiting mission parameters...']);
  const [isLoading, setIsLoading] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleStartAutomation = async () => {
    if (!naukriCookie) {
      setLogs(prev => [...prev, ">> [ERROR] Authentication token required."]);
      return;
    }
    
    setIsLoading(true);
    setLogs([`>> [INIT] Mission started for sector '${selectedSection}'...`]);

    try {
      const response = await fetch('/api/start-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookie: naukriCookie, section: selectedSection }),
      });

      if (!response.body) throw new Error("Response stream not available.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setLogs(prev => [...prev, ...chunk.split('\n').filter(Boolean).map(log => `>> ${log}`)]);
      }
    } catch (error: any) {
      setLogs(prev => [...prev, `>> [FATAL] ${error.message}`]);
    } finally {
      setIsLoading(false);
      setLogs(prev => [...prev, `>> [END] Mission concluded.`]);
    }
  };

  return (
    <div className="min-h-screen flex text-sm">
      <Sidebar />
      <main className="flex-grow flex flex-col p-4 lg:p-6 gap-4">
        <header className="flex justify-between items-center flex-shrink-0">
          <h1 className="text-xl font-bold text-text-secondary">TACTICAL COMMAND / <span className="text-accent">OVERVIEW</span></h1>
          <div className="text-right text-xs text-text-secondary">
            <p>LAST UPDATE: {new Date().toUTCString()}</p>
          </div>
        </header>

        {/* Top Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          <Panel title="AGENT ALLOCATION">
              <label htmlFor="cookie" className="block text-xs font-medium text-text-secondary mb-2">
                // AGENT_AUTH_TOKEN (nauk_at)
              </label>
              <textarea
                id="cookie"
                className="w-full h-24 bg-black/50 border border-accent p-2 text-xs text-green-300 focus:ring-1 focus:ring-accent focus:border-accent resize-none"
                placeholder="Paste token..."
                value={naukriCookie}
                onChange={(e) => setNaukriCookie(e.target.value)}
              />
          </Panel>
          <Panel title="ACTIVITY LOG">
              <label className="block text-xs font-medium text-text-secondary mb-2">// TARGET SECTOR</label>
              <div className="grid grid-cols-2 gap-3">
                {JOB_SECTIONS.map(section => (
                  <button
                    key={section}
                    onClick={() => setSelectedSection(section)}
                    className={`py-3 text-sm border transition-all ${
                      selectedSection === section
                        ? 'bg-accent border-orange-400 text-white font-semibold'
                        : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-700/50 hover:border-gray-600'
                    }`}
                  >
                    {section}
                  </button>
                ))}
              </div>
          </Panel>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 flex-grow">
          <div className="lg:col-span-2 h-[50vh] lg:h-auto">
            <Panel title="MISSION ACTIVITY OVERVIEW" className="h-full">
              <div id="system-log" className="text-xs h-full overflow-y-auto pr-2 space-y-1">
                {logs.map((log, index) => {
                  const color = log.includes('ERROR') || log.includes('FATAL') ? 'text-red-400' 
                              : log.includes('WARN') ? 'text-yellow-400' 
                              : log.includes('SUCCESS') ? 'text-green-400'
                              : 'text-text-secondary';
                  return (
                    <p key={index} className={`log-entry whitespace-pre-wrap ${color}`}>
                      <span>{log}</span>
                    </p>
                  );
                })}
                {isLoading && <p className="text-yellow-400 animate-pulse"> Executing command...</p>}
                <div ref={logsEndRef} />
              </div>
            </Panel>
          </div>
          <div className="lg:col-span-1 h-[50vh] lg:h-auto">
            <Panel title="MISSION INFORMATION" className="h-full">
              <div className="h-full flex flex-col justify-end">
                <button
                  onClick={handleStartAutomation}
                  disabled={isLoading}
                  className="w-full bg-accent text-white font-bold py-3 px-4 border border-orange-400 hover:bg-orange-700 disabled:bg-gray-600 disabled:border-gray-500 disabled:cursor-not-allowed transition-colors text-sm tracking-widest"
                >
                  {isLoading ? "IN PROGRESS..." : "INITIATE MISSION"}
                </button>
              </div>
            </Panel>
          </div>
        </div>
      </main>
    </div>
  );
}