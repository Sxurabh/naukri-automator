// sxurabh/naukri-automator/naukri-automator-2395bd3b0e42cdcc1775f3531cce259c26dbec88/src/app/page.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { Monitor, Settings, Bot, KeyRound, Briefcase, Target, Archive, X, LoaderCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AgentLogsPage } from './views/agent-logs';
import { SettingsPage } from './views/settings';
import useLocalStorage from './lib/hooks/useLocalStorage';

interface JobSection {
  name: string;
  count: number;
}

export interface MissionLog {
  id: string;
  status: 'Success' | 'Failed' | 'In Progress';
  jobs: number;
  section: string;
  date: string;
  fullLog: string[];
}

interface CommandCenterProps {
  naukriCookie: string;
  setNaukriCookie: (value: string) => void;
  appliedJobIds: string[];
  onMissionComplete: (log: MissionLog, newIds: string[]) => void;
  jobSections: JobSection[];
  sectionsLoading: boolean;
  sectionsError: string | null;
}

function CommandCenter({
  naukriCookie,
  setNaukriCookie,
  appliedJobIds,
  onMissionComplete,
  jobSections,
  sectionsLoading,
  sectionsError,
}: CommandCenterProps) {
  const [selectedSection, setSelectedSection] = useState("");
  const [logs, setLogs] = useState<string[]>(['[SYSTEM] Standby. Awaiting mission parameters...']);
  const [isLoading, setIsLoading] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (jobSections.length > 0 && !jobSections.some(s => s.name === selectedSection)) {
      setSelectedSection(jobSections[0].name);
    } else if (jobSections.length === 0) {
      setSelectedSection("");
    }
  }, [jobSections, selectedSection]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleStartAutomation = async () => {
    if (!naukriCookie) {
      setLogs(prev => [...prev, "[ERROR] AGENT_AUTH_TOKEN required for deployment."]);
      return;
    }
    if (!selectedSection) {
      setLogs(prev => [...prev, "[ERROR] TARGET_SECTOR must be selected."]);
      return;
    }
    
    setIsLoading(true);
    const missionId = `RUN-${new Date().toISOString().replace(/[-:.]/g, '').slice(0, -4)}`;
    const missionStartTime = new Date();
    const initialLogs = [`[INIT] Mission ${missionId} started for sector '${selectedSection}'. Deploying agent...`];
    setLogs(initialLogs);

    let tempLogs = [...initialLogs];
    let newMissionAppliedIds: string[] = [];

    try {
      const response = await fetch('/api/start-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cookie: naukriCookie, 
          section: selectedSection,
          appliedJobIds: appliedJobIds,
        }),
      });

      if (!response.body) throw new Error("Response stream not available.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const newLogEntries = chunk.split('\n').filter(Boolean);
        
        const displayLogs: string[] = [];
        newLogEntries.forEach(line => {
          if (line.startsWith('APPLIED_JOB_IDS:')) {
            try {
              const ids = JSON.parse(line.substring(line.indexOf(':') + 1));
              if (Array.isArray(ids)) {
                newMissionAppliedIds = ids;
              }
            } catch (e) {
              console.error("Failed to parse applied job IDs", e);
            }
          } else {
            displayLogs.push(line);
          }
        });

        if (displayLogs.length > 0) {
          setLogs(prev => [...prev, ...displayLogs]);
          tempLogs.push(...displayLogs);
        }
      }
      
    } catch (error: any) {
        const fatalLog = `[FATAL] ${error.message}`;
        setLogs(prev => [...prev, fatalLog]);
        tempLogs.push(fatalLog);
    } finally {
      const endLog = `[END] Mission concluded. Agent returned.`;
      setLogs(prev => [...prev, endLog]);
      tempLogs.push(endLog);
      setIsLoading(false);

      const missionStatus = tempLogs.some(log => log.includes('FATAL') || log.includes('ERROR')) ? 'Failed' : 'Success';
      
      onMissionComplete({
        id: missionId,
        status: missionStatus,
        jobs: newMissionAppliedIds.length,
        section: selectedSection,
        date: missionStartTime.toUTCString(),
        fullLog: tempLogs,
      }, newMissionAppliedIds);
    }
  };

  const clearLogs = () => {
    setLogs(['[SYSTEM] Standby. Awaiting mission parameters...']);
  }

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
              {sectionsLoading ? (
                Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-full bg-neutral-800 animate-pulse rounded-md"></div>)
              ) : sectionsError ? (
                <div className="col-span-2 flex items-center justify-center text-xs text-red-400 text-center p-4 bg-red-500/10 border border-red-500/20 rounded-md">
                  <div className="flex flex-col items-center gap-2">
                    <AlertTriangle className="w-6 h-6"/>
                    <p>{sectionsError}</p>
                  </div>
                </div>
              ) : jobSections.length > 0 ? (
                jobSections.map(section => (
                  <Button key={section.name} variant="outline" onClick={() => setSelectedSection(section.name)}
                    className={`justify-center text-xs h-full ${ selectedSection === section.name ? 'bg-orange-500/20 border-orange-500/50 text-orange-300' : 'border-neutral-700 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-300 bg-transparent'}`}
                  >
                    {section.name.toUpperCase()} ({section.count})
                  </Button>
                ))
              ) : (
                <div className="col-span-2 flex items-center justify-center text-xs text-neutral-500">
                  <p>Enter your auth token to load sections.</p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="bg-neutral-900 border-neutral-800 flex flex-col">
            <CardHeader>
                <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider flex items-center gap-2"><Target className="w-4 h-4 text-orange-500"/>MISSION CONTROL</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 flex-grow justify-between">
                <div className="text-xs text-neutral-400 border border-neutral-800 bg-neutral-950 p-3 rounded-md space-y-1">
                  <p>TARGET: <span className="text-orange-400">{selectedSection ? selectedSection.toUpperCase() : 'N/A'}</span></p>
                  <p>STATUS: <span className="text-white">{isLoading ? 'ACTIVE' : 'STANDBY'}</span></p>
                </div>
                  <Button onClick={handleStartAutomation} disabled={isLoading || !selectedSection || sectionsError !== null}
                    className="w-full h-12 bg-orange-600 text-white font-bold hover:bg-orange-700 disabled:bg-neutral-700 disabled:text-neutral-400 disabled:cursor-not-allowed transition-colors text-sm tracking-widest"
                  >
                    {isLoading ? "IN PROGRESS..." : "INITIATE MISSION"}
                </Button>
            </CardContent>
          </Card>
        </div>
        <Card className="bg-neutral-900 border-neutral-800 flex-grow flex flex-col min-h-0">
          <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider flex items-center gap-2"><Bot className="w-4 h-4 text-orange-500"/>LIVE MISSION FEED</CardTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-neutral-400 hover:text-white" onClick={clearLogs}>
                <X className="w-4 h-4" />
              </Button>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden">
              <div id="system-log" className="h-full text-xs overflow-y-auto pr-2 space-y-2 font-mono custom-scrollbar">
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
  const [missionLogs, setMissionLogs] = useLocalStorage<MissionLog[]>("missionLogs", []);
  const [lastRun, setLastRun] = useLocalStorage("lastRun", "N/A");
  const [appliedJobIds, setAppliedJobIds] = useLocalStorage<string[]>("appliedJobIds", []);
  const [naukriCookie, setNaukriCookie] = useLocalStorage("naukriCookie", "");
  
  const [jobSections, setJobSections] = useState<JobSection[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [sectionsError, setSectionsError] = useState<string | null>(null);

  const jobsApplied = appliedJobIds.length;

  useEffect(() => {
    const fetchSections = async () => {
      if (!naukriCookie) {
        setJobSections([]);
        setSectionsError(null);
        return;
      }
      setSectionsLoading(true);
      setSectionsError(null);
      try {
        const response = await fetch('/api/get-sections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cookie: naukriCookie }),
        });
        if (!response.ok) {
          if (response.status === 401) {
            const data = await response.json();
            throw new Error(data.error || "Authentication failed. Please update your token.");
          }
          throw new Error("Failed to fetch sections from server.");
        }
        const data = await response.json();
        if (data.length === 0) {
            throw new Error("No job sections found. The page might have changed or the cookie is partially invalid.");
        }
        setJobSections(data);
      } catch (error: any) {
        console.error(error);
        setSectionsError(error.message);
        setJobSections([]);
      } finally {
        setSectionsLoading(false);
      }
    };

    const debounceFetch = setTimeout(() => {
        fetchSections();
    }, 500);

    return () => clearTimeout(debounceFetch);
  }, [naukriCookie]);

  const handleMissionComplete = (log: MissionLog, newIds: string[]) => {
    setMissionLogs(prev => [log, ...prev].slice(0, 100));
    if (log.status === 'Success' && newIds.length > 0) {
      setLastRun(log.date);
      setAppliedJobIds(prev => [...new Set([...prev, ...newIds])]);
    }
  };

  const clearMissionArchive = () => {
    setMissionLogs([]);
    setAppliedJobIds([]);
    setLastRun("N/A");
  };

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date().toUTCString());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const navItems = [
    { id: 'center', label: 'COMMAND CENTER', icon: Monitor },
    { id: 'logs', label: 'MISSION ARCHIVE', icon: Archive },
    { id: 'settings', label: 'SETTINGS', icon: Settings },
  ]

  const renderContent = () => {
    switch(activeSection) {
      case 'center':
        return <CommandCenter 
          naukriCookie={naukriCookie}
          setNaukriCookie={setNaukriCookie}
          appliedJobIds={appliedJobIds} 
          onMissionComplete={handleMissionComplete}
          jobSections={jobSections}
          sectionsLoading={sectionsLoading}
          sectionsError={sectionsError}
        />;
      case 'logs':
        return <AgentLogsPage missionLogs={missionLogs} clearArchive={clearMissionArchive} />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <CommandCenter 
          naukriCookie={naukriCookie}
          setNaukriCookie={setNaukriCookie}
          appliedJobIds={appliedJobIds} 
          onMissionComplete={handleMissionComplete}
          jobSections={jobSections}
          sectionsLoading={sectionsLoading}
          sectionsError={sectionsError}
        />;
    }
  }

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100">
      <div className="w-72 bg-neutral-900 border-r border-neutral-800 flex-col h-full hidden lg:flex">
        <div className="p-4 border-b border-neutral-800">
          <h1 className="text-orange-500 font-bold text-lg tracking-wider">NAUKRI OPS</h1>
          <p className="text-neutral-500 text-xs">v1.2.0 / AUTOMATOR</p>
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
            <div className="text-xs text-neutral-500 space-y-1">
              <div>LAST RUN: {lastRun}</div>
              <div>JOBS APPLIED (TOTAL): {jobsApplied}</div>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 flex flex-col">
        <div className="h-16 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-6 flex-shrink-0">
            <div className="text-sm text-neutral-400 flex items-center gap-2">
              TACTICAL COMMAND / <span className="text-orange-500">{navItems.find(i => i.id === activeSection)?.label}</span>
              {sectionsLoading && <LoaderCircle className="w-4 h-4 animate-spin text-neutral-500"/>}
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