import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, X } from 'lucide-react';
import moment from 'moment';

export default function DateRangeFilter({ onRangeChange, availableDates }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [quickRange, setQuickRange] = useState('all');

  const handleApply = () => {
    onRangeChange({ start: startDate, end: endDate });
  };

  const handleQuickRange = (range) => {
    setQuickRange(range);
    const today = moment();
    let start = '';
    let end = today.format('YYYY-MM-DD');

    switch (range) {
      case '7d':
        start = today.clone().subtract(7, 'days').format('YYYY-MM-DD');
        break;
      case '30d':
        start = today.clone().subtract(30, 'days').format('YYYY-MM-DD');
        break;
      case '90d':
        start = today.clone().subtract(90, 'days').format('YYYY-MM-DD');
        break;
      case 'all':
      default:
        start = '';
        end = '';
        break;
    }

    setStartDate(start);
    setEndDate(end);
    onRangeChange({ start, end });
  };

  const handleClear = () => {
    setStartDate('');
    setEndDate('');
    setQuickRange('all');
    onRangeChange({ start: '', end: '' });
  };

  const activeRange = startDate || endDate;

  return (
    <div className="p-3 bg-gray-50 rounded-lg border space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Date Range Filter
        </Label>
        {activeRange && (
          <Button variant="ghost" size="sm" onClick={handleClear} className="h-6 text-xs">
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Quick Range Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={quickRange === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleQuickRange('all')}
          className="text-xs h-7"
        >
          All Time
        </Button>
        <Button
          variant={quickRange === '7d' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleQuickRange('7d')}
          className="text-xs h-7"
        >
          Last 7 Days
        </Button>
        <Button
          variant={quickRange === '30d' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleQuickRange('30d')}
          className="text-xs h-7"
        >
          Last 30 Days
        </Button>
        <Button
          variant={quickRange === '90d' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleQuickRange('90d')}
          className="text-xs h-7"
        >
          Last 90 Days
        </Button>
      </div>

      {/* Custom Date Inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-gray-500">Start Date</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setQuickRange('custom');
            }}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500">End Date</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setQuickRange('custom');
            }}
            className="h-8 text-xs"
          />
        </div>
      </div>

      {quickRange === 'custom' && (
        <Button onClick={handleApply} size="sm" className="w-full h-7 text-xs">
          Apply Custom Range
        </Button>
      )}

      {activeRange && (
        <Badge variant="outline" className="text-xs w-full justify-center">
          {startDate ? moment(startDate).format('MMM D, YYYY') : 'Beginning'} 
          {' → '}
          {endDate ? moment(endDate).format('MMM D, YYYY') : 'Now'}
        </Badge>
      )}
    </div>
  );
}