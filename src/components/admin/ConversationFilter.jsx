import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X, Filter } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function ConversationFilter({ onFilterChange, totalCount }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minMessages, setMinMessages] = useState('');
  const [maxMessages, setMaxMessages] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const applyFilters = () => {
    onFilterChange({
      searchTerm,
      dateFrom,
      dateTo,
      minMessages: minMessages ? parseInt(minMessages) : null,
      maxMessages: maxMessages ? parseInt(maxMessages) : null
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setMinMessages('');
    setMaxMessages('');
    onFilterChange({});
  };

  const hasActiveFilters = searchTerm || dateFrom || dateTo || minMessages || maxMessages;

  return (
    <Card className="bg-slate-700/30 border-slate-600 mb-3">
      <CardContent className="pt-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={`border-white/20 ${showFilters ? 'bg-white/20' : 'bg-white/10'} text-white hover:bg-white/20`}
          >
            <Filter className="h-4 w-4" />
          </Button>
          <Button onClick={applyFilters} className="bg-blue-600 hover:bg-blue-700">
            Search
          </Button>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-white/60">Filters:</span>
            {searchTerm && (
              <Badge variant="outline" className="bg-blue-500/20 text-blue-200 border-blue-400/50">
                Search: "{searchTerm}"
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setSearchTerm('')} />
              </Badge>
            )}
            {(dateFrom || dateTo) && (
              <Badge variant="outline" className="bg-purple-500/20 text-purple-200 border-purple-400/50">
                Date range
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => { setDateFrom(''); setDateTo(''); }} />
              </Badge>
            )}
            {(minMessages || maxMessages) && (
              <Badge variant="outline" className="bg-green-500/20 text-green-200 border-green-400/50">
                Messages: {minMessages || '0'}-{maxMessages || '∞'}
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => { setMinMessages(''); setMaxMessages(''); }} />
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-white/70 hover:text-white">
              Clear all
            </Button>
          </div>
        )}

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-white/10">
            <div>
              <label className="text-xs text-white/70 mb-1 block">From Date</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-white/70 mb-1 block">To Date</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-white/70 mb-1 block">Min Messages</label>
              <Input
                type="number"
                placeholder="0"
                value={minMessages}
                onChange={(e) => setMinMessages(e.target.value)}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-white/70 mb-1 block">Max Messages</label>
              <Input
                type="number"
                placeholder="∞"
                value={maxMessages}
                onChange={(e) => setMaxMessages(e.target.value)}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}