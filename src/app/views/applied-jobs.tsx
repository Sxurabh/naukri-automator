// sxurabh/naukri-automator/naukri-automator-2395bd3b0e42cdcc1775f3531cce259c26dbec88/src/app/views/applied-jobs.tsx
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { CheckCheck, Search, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AppliedJobsPageProps {
  appliedJobIds: string[];
  clearAppliedJobs: () => void;
}

export function AppliedJobsPage({ appliedJobIds, clearAppliedJobs }: AppliedJobsPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isClearConfirmOpen, setClearConfirmOpen] = useState(false);

  const filteredIds = appliedJobIds.filter(id => 
    id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClear = () => {
    clearAppliedJobs();
    setClearConfirmOpen(false);
  }

  return (
    <div className="p-6 space-y-6">
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider flex items-center gap-2">
            <CheckCheck className="w-4 h-4 text-orange-500" />
            APPLIED JOBS DATABASE ({appliedJobIds.length} TOTAL)
          </CardTitle>
          <Button variant="destructive" size="sm" onClick={() => setClearConfirmOpen(true)} className="flex items-center gap-2 text-xs" disabled={appliedJobIds.length === 0}>
            <Trash2 className="w-4 h-4" />
            Clear Database
          </Button>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input 
              placeholder="Search by Job ID..." 
              className="pl-10 bg-neutral-950 border-neutral-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
            {filteredIds.length > 0 ? filteredIds.map(jobId => (
              <div key={jobId} className="flex items-center justify-between p-3 border border-neutral-800 rounded-md hover:bg-neutral-800/50">
                <p className="font-mono text-xs text-white">{jobId}</p>
                <a 
                  href={`https://www.naukri.com/job-listings?keyword=${jobId}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-orange-400 hover:underline whitespace-nowrap"
                >
                  View on Naukri
                </a>
              </div>
            )) : (
              <div className="text-center py-8 text-neutral-500 text-sm">
                {appliedJobIds.length > 0 ? "No jobs found for your search." : "No jobs have been applied to yet."}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Clear Confirmation Dialog */}
      <Dialog open={isClearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="text-red-500"/>Confirm Database Deletion</DialogTitle>
            <DialogDescription>
              This action will permanently delete all Mission Logs and your history of applied jobs, resetting the total counter. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" variant="destructive" onClick={handleClear}>
              Clear All History
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}