// sxurabh/naukri-automator/naukri-automator-2395bd3b0e42cdcc1775f3531cce259c26dbec88/src/app/views/settings.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Cog, Bell } from "lucide-react";
import { AppSettings, SetAppSettings } from "../page";

interface SettingsPageProps {
  settings: AppSettings;
  setSettings: SetAppSettings;
}

export function SettingsPage({ settings, setSettings }: SettingsPageProps) {

  const handleJobsPerMissionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = parseInt(e.target.value, 10);
    if (isNaN(value)) value = 1;
    if (value < 1) value = 1;
    if (value > 10) value = 10;
    setSettings(prev => ({...prev, jobsPerMission: value}));
  };

  return (
    <div className="p-6 space-y-6">
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider flex items-center gap-2">
            <Cog className="w-4 h-4 text-orange-500" />
            AGENT CONFIGURATION
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="jobs-per-run" className="text-neutral-400">Jobs Per Mission</Label>
            <Input 
              id="jobs-per-run" 
              type="number" 
              min="1"
              max="10"
              value={settings.jobsPerMission}
              onChange={handleJobsPerMissionChange}
              className="bg-neutral-950 border-neutral-700" 
            />
            <p className="text-xs text-neutral-500">Number of jobs to apply for in a single batch (1-10).</p>
          </div>
          <div className="flex items-center justify-between space-x-2 p-4 border border-neutral-800 rounded-md">
            <div className="flex flex-col space-y-1">
              <Label htmlFor="stealth-mode" className="text-neutral-400">Stealth Mode</Label>
              <p className="text-xs text-neutral-500">Adds randomized delays to mimic human behavior.</p>
            </div>
            <Switch 
              id="stealth-mode" 
              checked={settings.stealthMode}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, stealthMode: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-neutral-300 tracking-wider flex items-center gap-2">
            <Bell className="w-4 h-4 text-orange-500" />
            NOTIFICATIONS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between space-x-2 p-4 border border-neutral-800 rounded-md">
            <Label htmlFor="desktop-notifications" className="text-neutral-400">Enable Desktop Notifications</Label>
            <Switch 
              id="desktop-notifications" 
              checked={settings.desktopNotifications}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, desktopNotifications: checked }))}
            />
          </div>
        </CardContent>
      </Card>
      
      <div className="text-right text-xs text-neutral-500">
        <p>Settings are saved automatically.</p>
      </div>
    </div>
  );
}