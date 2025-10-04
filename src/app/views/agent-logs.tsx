// sxurabh/naukri-automator/naukri-automator-2395bd3b0e42cdcc1775f3531cce259c26dbec88/src/app/views/agent-logs.tsx
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Archive, CheckCircle, Search, XCircle, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MissionLog } from '../page';

interface AgentLogsPageProps {
  missionLogs: MissionLog[];
  clearArchive: () => void;
}

export function AgentLogsPage({ missionLogs, clearArchive }: AgentLogsPageProps) {
  const [selectedLog, setSelectedLog] = useState<MissionLog | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isClearConfirmOpen, setClearConfirmOpen] = useState(false);

  const filteredLogs = missionLogs.filter(log => 
    log.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    log.section.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClear = () => {
    clearArchive();
    setClearConfirmOpen(false);
  }

  return (
    <div className="p-6 space-y-6">
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider flex items-center gap-2">
            <Archive className="w-4 h-4 text-orange-500" />
            MISSION ARCHIVE
          </CardTitle>
          <Button variant="destructive" size="sm" onClick={() => setClearConfirmOpen(true)} className="flex items-center gap-2 text-xs" disabled={missionLogs.length === 0}>
            <Trash2 className="w-4 h-4" />
            Clear Archive
          </Button>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input 
              placeholder="Search by Mission ID or Sector..." 
              className="pl-10 bg-neutral-950 border-neutral-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
            {filteredLogs.length > 0 ? filteredLogs.map(log => (
              <div key={log.id} onClick={() => setSelectedLog(log)} className="grid grid-cols-5 items-center gap-4 p-3 border border-neutral-800 rounded-md hover:bg-neutral-800/50 cursor-pointer">
                <p className="font-mono text-xs text-white col-span-2">{log.id}</p>
                <div className="flex items-center gap-2">
                   {log.status === 'Success' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                   <Badge variant={log.status === 'Success' ? 'default' : 'destructive'} className={log.status === 'Success' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}>
                    {log.status}
                   </Badge>
                </div>
                <p className="text-xs text-neutral-400">{log.section}</p>
                <p className="font-mono text-xs text-neutral-500 text-right">{new Date(log.date).toLocaleTimeString()}</p>
              </div>
            )) : (
              <div className="text-center py-8 text-neutral-500 text-sm">
                No mission logs found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="bg-neutral-900 border-orange-500/30 max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-orange-400 font-mono">{selectedLog?.id}</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Full mission debrief from {selectedLog?.date}.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 bg-neutral-950 p-4 rounded-md border border-neutral-800 text-xs text-neutral-300 font-mono h-96 overflow-y-auto custom-scrollbar">
            <p><strong>Status:</strong> {selectedLog?.status}</p>
            <p><strong>Jobs Applied:</strong> {selectedLog?.jobs}</p>
            <p><strong>Target Sector:</strong> {selectedLog?.section}</p>
            <hr className="my-2 border-neutral-700" />
            <div className="whitespace-pre-wrap space-y-1">
              {selectedLog?.fullLog.map((line, i) => (
                <p key={i} className="flex">
                  <span className="text-neutral-600 mr-2 shrink-0">&gt;</span>
                  <span>{line}</span>
                </p>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Clear Confirmation Dialog */}
      <Dialog open={isClearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="text-red-500"/>Confirm Archive Deletion</DialogTitle>
            <DialogDescription>
              This will permanently delete all mission logs and reset the total applied jobs counter. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" variant="destructive" onClick={handleClear}>
              Delete All Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}