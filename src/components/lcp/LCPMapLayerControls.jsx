import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Layers, Upload, Trash2 } from 'lucide-react';

export default function LCPMapLayerControls({
  oltOptions,
  selectedOlt,
  onOltChange,
  planningLayer,
  showPlanningLayer,
  onPlanningLayerToggle,
  onPlanningLayerUpload,
  onPlanningLayerClear,
  isUploadingPlanningLayer,
}) {
  return (
    <div className="absolute top-4 right-4 z-[500] pointer-events-none w-[min(340px,calc(100vw-2rem))]">
      <Card className="pointer-events-auto border border-white/70 bg-white/95 shadow-xl backdrop-blur dark:border-gray-700 dark:bg-gray-900/95">
        <CardContent className="space-y-4 p-4">
          <div className="space-y-2">
            <Label>OLT Scope</Label>
            <Select value={selectedOlt} onValueChange={onOltChange}>
              <SelectTrigger>
                <SelectValue placeholder="All OLTs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All OLTs</SelectItem>
                {oltOptions.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                  <Layers className="h-4 w-4" />
                  Planning Layer
                </div>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  Upload KML or KMZ placemarks to overlay planning points on the live fiber map.
                </p>
              </div>
              <Switch
                checked={showPlanningLayer}
                onCheckedChange={onPlanningLayerToggle}
                disabled={!planningLayer}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label htmlFor="planning-layer-upload">
                <input
                  id="planning-layer-upload"
                  type="file"
                  accept=".kml,.kmz"
                  className="hidden"
                  onChange={onPlanningLayerUpload}
                  disabled={isUploadingPlanningLayer}
                />
                <span className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:bg-slate-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700">
                  <Upload className="h-4 w-4" />
                  {isUploadingPlanningLayer ? 'Uploading…' : 'Upload Layer'}
                </span>
              </label>

              {planningLayer && (
                <Button variant="outline" size="sm" onClick={onPlanningLayerClear}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>

            {planningLayer && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="max-w-full truncate bg-blue-50 text-blue-700 border-blue-200">
                  {planningLayer.fileName}
                </Badge>
                <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                  {planningLayer.placemarks.length} planning points
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}