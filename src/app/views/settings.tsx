import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Cog, Bell, Palette } from "lucide-react";

export function SettingsPage() {
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
            <Input id="jobs-per-run" type="number" defaultValue="5" className="bg-neutral-950 border-neutral-700" />
            <p className="text-xs text-neutral-500">Number of jobs to apply for in a single run (1-10).</p>
          </div>
          <div className="flex items-center justify-between space-x-2 p-4 border border-neutral-800 rounded-md">
            <div className="flex flex-col space-y-1">
              <Label htmlFor="skip-questions" className="text-neutral-400">Stealth Mode</Label>
              <p className="text-xs text-neutral-500">Adds randomized delays to mimic human behavior.</p>
            </div>
            <Switch id="skip-questions" defaultChecked={true} />
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
            <Switch id="desktop-notifications" />
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button className="bg-orange-600 text-white hover:bg-orange-700">Save Configuration</Button>
      </div>
    </div>
  );
}