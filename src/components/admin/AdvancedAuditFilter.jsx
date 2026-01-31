import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X, Filter } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function AdvancedAuditFilter({ onFilterChange, totalCount }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [eventType, setEventType] = useState('all');
  const [status, setStatus] = useState('all');
  const [userFilter, setUserFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const applyFilters = () => {
    onFilterChange({
      searchTerm,
      eventType,
      status,
      userFilter,
      dateFrom,
      dateTo
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setEventType('all');
    setStatus('all');
    setUserFilter('');
    setDateFrom('');
    setDateTo('');
    onFilterChange({});
  };

  const hasActiveFilters = searchTerm || eventType !== 'all' || status !== 'all' || userFilter || dateFrom || dateTo;

  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="pt-4 space-y-3">
        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              placeholder="Search audit logs..."
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

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-white/60">Filters:</span>
            {searchTerm && (
              <Badge variant="outline" className="bg-blue-500/20 text-blue-200 border-blue-400/50">
                Search: "{searchTerm}"
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setSearchTerm('')} />
              </Badge>
            )}
            {eventType !== 'all' && (
              <Badge variant="outline" className="bg-purple-500/20 text-purple-200 border-purple-400/50">
                Type: {eventType}
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setEventType('all')} />
              </Badge>
            )}
            {status !== 'all' && (
              <Badge variant="outline" className="bg-green-500/20 text-green-200 border-green-400/50">
                Status: {status}
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setStatus('all')} />
              </Badge>
            )}
            {userFilter && (
              <Badge variant="outline" className="bg-amber-500/20 text-amber-200 border-amber-400/50">
                User: {userFilter}
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setUserFilter('')} />
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-white/70 hover:text-white">
              Clear all
            </Button>
          </div>
        )}

        {/* Advanced Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-white/10">
            <div>
              <label className="text-xs text-white/70 mb-1 block">Event Type</label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="query">Query</SelectItem>
                  <SelectItem value="response">Response</SelectItem>
                  <SelectItem value="document_reference">Document</SelectItem>
                  <SelectItem value="tool_invocation">Tool Call</SelectItem>
                  <SelectItem value="conversation_start">Conversation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-white/70 mb-1 block">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-white/70 mb-1 block">User Email</label>
              <Input
                placeholder="Filter by user..."
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>

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

            <div className="flex items-end">
              <Badge variant="outline" className="border-white/30 text-white/70">
                {totalCount} results
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}