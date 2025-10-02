"use client";

import { useState, useEffect, useRef } from 'react';
import { Monitor, Settings, Users, Bot, KeyRound, Briefcase, Target, Archive } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// Import the new page views
import { AgentLogsPage } from './views/agent-logs';
import { SettingsPage } from './views/settings';

const JOB_SECTIONS = ["Profile", "Top Candidate", "Preferences", "You Might Like"];

// The main dashboard UI is now its own component
function CommandCenter() {
  const [naukriCookie, setNaukriCookie] = useState("");
  const [selectedSection, setSelectedSection] = useState(JOB_SECTIONS[0]);
  const [logs, setLogs] = useState<string[]>(['[SYSTEM] Standby. Awaiting mission parameters...']);
  const [isLoading, setIsLoading] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleStartAutomation = async () => {
    if (!naukriCookie) {
      setLogs(prev => [...prev, "[ERROR] AGENT_AUTH_TOKEN required for deployment."]);
      return;
    }
    
    setIsLoading(true);
    setLogs([`[INIT] Mission started for sector '${selectedSection}'. Deploying agent...`]);

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
        setLogs(prev => [...prev, ...chunk.split('\n').filter(Boolean)]);
      }
    } catch (error: any) {
      setLogs(prev => [...prev, `[FATAL] ${error.message}`]);
    } finally {
      setIsLoading(false);
      setLogs(prev => [...prev, `[END] Mission concluded. Agent returned.`]);
    }
  };

  return (
    <div className="flex-1 overflow-hidden p-6 flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="bg-neutral-900 border-neutral-800 flex flex-col">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider flex items-center gap-2"><KeyRound className="w-4 h-4 text-orange-500"/>AGENT AUTH TOKEN</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
                <Textarea
                id="cookie"
                className="h-full resize-none bg-neutral-950 border-neutral-700 text-green-400 placeholder:text-neutral-500 focus:ring-orange-500"
                placeholder="Paste nauk_at cookie..."
                value={naukriCookie}
                onChange={(e) => setNaukriCookie(e.target.value)}
              />
            </CardContent>
          </Card>
          <Card className="bg-neutral-900 border-neutral-800 flex flex-col">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider flex items-center gap-2"><Briefcase className="w-4 h-4 text-orange-500"/>TARGET SECTOR</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 flex-grow">
              {JOB_SECTIONS.map(section => (
                <Button key={section} variant="outline" onClick={() => setSelectedSection(section)}
                  className={`justify-center text-xs h-full ${ selectedSection === section ? 'bg-orange-500/20 border-orange-500/50 text-orange-300' : 'border-neutral-700 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-300 bg-transparent'}`}
                >
                  {section.toUpperCase()}
                </Button>
              ))}
            </CardContent>
          </Card>
          <Card className="bg-neutral-900 border-neutral-800 flex flex-col">
            <CardHeader>
                <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider flex items-center gap-2"><Target className="w-4 h-4 text-orange-500"/>MISSION CONTROL</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 flex-grow justify-between">
                <div className="text-xs text-neutral-400 border border-neutral-800 bg-neutral-950 p-3 rounded-md space-y-1">
                  <p>TARGET: <span className="text-orange-400">{selectedSection.toUpperCase()}</span></p>
                  <p>STATUS: <span className="text-white">{isLoading ? 'ACTIVE' : 'STANDBY'}</span></p>
                </div>
                  <Button onClick={handleStartAutomation} disabled={isLoading}
                    className="w-full h-12 bg-orange-600 text-white font-bold hover:bg-orange-700 disabled:bg-neutral-700 disabled:text-neutral-400 disabled:cursor-not-allowed transition-colors text-sm tracking-widest"
                  >
                    {isLoading ? "IN PROGRESS..." : "INITIATE MISSION"}
                </Button>
            </CardContent>
          </Card>
        </div>
        <Card className="bg-neutral-900 border-neutral-800 flex-grow flex flex-col">
          <CardHeader>
              <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider flex items-center gap-2"><Bot className="w-4 h-4 text-orange-500"/>LIVE MISSION FEED</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden">
              <div id="system-log" className="h-full text-xs overflow-y-auto pr-2 space-y-2 font-mono">
                  {logs.map((log, index) => {
                  const color = log.includes('ERROR') || log.includes('FATAL') ? 'text-red-400' : log.includes('WARN') ? 'text-yellow-400' : log.includes('SUCCESS') ? 'text-green-400' : log.includes('[INIT]') || log.includes('[END]') ? 'text-orange-400' : 'text-neutral-400';
                  return (
                      <p key={index} className="whitespace-pre-wrap">
                        <span className="text-neutral-600 mr-2">&gt;</span>
                        <span className={color}>{log}</span>
                      </p>
                  );
                  })}
                  {isLoading && <p className="text-yellow-400 animate-pulse"> &gt; Agent active. Awaiting field response...</p>}
                  <div ref={logsEndRef} />
              </div>
          </CardContent>
        </Card>
    </div>
  )
}


export default function TacticalDashboard() {
  const [activeSection, setActiveSection] = useState("center");
  const [currentTime, setCurrentTime] = useState("...");

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date().toUTCString());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const navItems = [
    { id: 'center', label: 'COMMAND CENTER', icon: Monitor },
    { id: 'logs', label: 'AGENT LOGS', icon: Archive },
    { id: 'settings', label: 'SETTINGS', icon: Settings },
  ]

  const renderContent = () => {
    switch(activeSection) {
      case 'center':
        return <CommandCenter />;
      case 'logs':
        return <AgentLogsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <CommandCenter />;
    }
  }

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100">
      {/* Sidebar */}
      <div className="w-72 bg-neutral-900 border-r border-neutral-800 flex-col h-full hidden lg:flex">
        <div className="p-4 border-b border-neutral-800">
          <h1 className="text-orange-500 font-bold text-lg tracking-wider">NAUKRI OPS</h1>
          <p className="text-neutral-500 text-xs">v1.0.0 / AUTOMATOR</p>
        </div>
        <nav className="flex-grow p-4 space-y-2">
            {navItems.map(item => (
              <button key={item.id} onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 p-3 rounded transition-colors text-left ${activeSection === item.id ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
              >
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
        </nav>
        <div className="p-4 border-t border-neutral-800">
          <div className="p-4 bg-neutral-800 border border-neutral-700 rounded">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full animate-pulse bg-green-500"></div>
              <span className="text-xs text-green-400">SYSTEM ONLINE</span>
            </div>
            <div className="text-xs text-neutral-500">
              <div>LAST RUN: N/A</div>
              <div>JOBS APPLIED: 0</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <div className="h-16 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-6 flex-shrink-0">
            <div className="text-sm text-neutral-400">
              TACTICAL COMMAND / <span className="text-orange-500">{navItems.find(i => i.id === activeSection)?.label}</span>
            </div>
            <div className="text-xs text-neutral-500">
              LAST SYNC: {currentTime}
            </div>
        </div>
        {renderContent()}
      </main>
    </div>
  );
}