import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Archive, CheckCircle, Search, XCircle } from 'lucide-react';

// Mock data for demonstration
const mockLogs = [
  { id: 'RUN-20251002-150449', status: 'Success', jobs: 5, section: 'Profile', date: '2025-10-02 15:04:49 UTC', fullLog: '...' },
  { id: 'RUN-20251002-143210', status: 'Failed', jobs: 0, section: 'Top Candidate', date: '2025-10-02 14:32:10 UTC', fullLog: 'FATAL: Invalid credentials.' },
  { id: 'RUN-20251001-091533', status: 'Success', jobs: 3, section: 'You Might Like', date: '2025-10-01 09:15:33 UTC', fullLog: '...' },
];

export function AgentLogsPage() {
  const [selectedLog, setSelectedLog] = useState<any>(null);

  return (
    <div className="p-6 space-y-6">
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider flex items-center gap-2">
            <Archive className="w-4 h-4 text-orange-500" />
            MISSION ARCHIVE
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input placeholder="Search by Mission ID..." className="pl-10 bg-neutral-950 border-neutral-700" />
          </div>
          <div className="space-y-2">
            {mockLogs.map(log => (
              <div key={log.id} onClick={() => setSelectedLog(log)} className="grid grid-cols-4 items-center gap-4 p-3 border border-neutral-800 rounded-md hover:bg-neutral-800/50 cursor-pointer">
                <p className="font-mono text-xs text-white">{log.id}</p>
                <div className="flex items-center gap-2">
                   {log.status === 'Success' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                   <Badge variant={log.status === 'Success' ? 'default' : 'destructive'} className={log.status === 'Success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}>
                    {log.status}
                   </Badge>
                </div>
                <p className="text-xs text-neutral-400">{log.section}</p>
                <p className="font-mono text-xs text-neutral-500 text-right">{log.date}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="bg-neutral-900 border-orange-500/30">
          <DialogHeader>
            <DialogTitle className="text-orange-400 font-mono">{selectedLog?.id}</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Full mission debrief from {selectedLog?.date}.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 bg-neutral-950 p-4 rounded-md border border-neutral-800 text-xs text-neutral-300 font-mono h-64 overflow-y-auto">
            <p><strong>Status:</strong> {selectedLog?.status}</p>
            <p><strong>Jobs Applied:</strong> {selectedLog?.jobs}</p>
            <p><strong>Target Sector:</strong> {selectedLog?.section}</p>
            <hr className="my-2 border-neutral-700" />
            <p className="whitespace-pre-wrap">{selectedLog?.fullLog}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}