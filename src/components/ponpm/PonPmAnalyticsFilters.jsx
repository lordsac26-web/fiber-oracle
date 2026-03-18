import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUS_OPTIONS = ['critical', 'warning'];

export default function PonPmAnalyticsFilters({
  preset,
  onPresetChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  lcpFilter,
  onLcpChange,
  splitterFilter,
  onSplitterChange,
  lcpOptions,
  splitterOptions,
  selectedStatuses,
  onStatusToggle,
}) {
  const presets = [
    { id: '7d', label: '7D' },
    { id: '30d', label: '30D' },
    { id: '90d', label: '90D' },
    { id: 'all', label: 'All Time' },
  ];

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {presets.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant={preset === item.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPresetChange(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="ponpm-start-date">Start Date</Label>
            <Input id="ponpm-start-date" type="date" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ponpm-end-date">End Date</Label>
            <Input id="ponpm-end-date" type="date" value={endDate} onChange={(e) => onEndDateChange(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>LCP</Label>
            <Select value={lcpFilter} onValueChange={onLcpChange}>
              <SelectTrigger>
                <SelectValue placeholder="All LCPs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All LCPs</SelectItem>
                {lcpOptions.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Splitter</Label>
            <Select value={splitterFilter} onValueChange={onSplitterChange}>
              <SelectTrigger>
                <SelectValue placeholder="All splitters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All splitters</SelectItem>
                {splitterOptions.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Issue Scope</span>
          {STATUS_OPTIONS.map((status) => {
            const active = selectedStatuses.includes(status);
            return (
              <Button
                key={status}
                type="button"
                size="sm"
                variant={active ? 'default' : 'outline'}
                onClick={() => onStatusToggle(status)}
                className={active ? '' : 'text-slate-700'}
              >
                {status === 'critical' ? 'Critical ONTs' : 'Warning ONTs'}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}