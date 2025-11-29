import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  MapPin, 
  Cable, 
  Search,
  CheckCircle2,
  Info,
  Link as LinkIcon
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function LCPContextPanel({ onLCPSelect, selectedLCP }) {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: lcpEntries = [], isLoading } = useQuery({
    queryKey: ['lcp-entries'],
    queryFn: () => base44.entities.LCPEntry.list(),
  });

  const filteredLCPs = lcpEntries.filter(lcp => 
    lcp.lcp_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lcp.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lcp.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (lcp) => {
    if (onLCPSelect) {
      onLCPSelect(lcp);
    }
  };

  return (
    <Card className="border-2 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Cable className="h-5 w-5 text-blue-600" />
          LCP/CLCP Context
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Link to LCP/CLCP data for contextual analysis. The AI will consider known fiber lengths, splitter locations, and historical data.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Search LCP/CLCP</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by number or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {selectedLCP ? (
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg border-2 border-green-300">
            <div className="flex items-center justify-between mb-2">
              <Badge className="bg-green-600">Selected</Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleSelect(null)}
                className="text-red-500 h-6 px-2"
              >
                Clear
              </Button>
            </div>
            <div className="space-y-1 text-sm">
              <div className="font-semibold">{selectedLCP.lcp_number}</div>
              {selectedLCP.splitter_number && (
                <div className="text-gray-600">Splitter: {selectedLCP.splitter_number}</div>
              )}
              {selectedLCP.location && (
                <div className="flex items-center gap-1 text-gray-600">
                  <MapPin className="h-3 w-3" />
                  {selectedLCP.location}
                </div>
              )}
              {selectedLCP.olt_name && (
                <div className="text-gray-600">
                  OLT: {selectedLCP.olt_name} {selectedLCP.olt_port && `Port ${selectedLCP.olt_port}`}
                </div>
              )}
              {selectedLCP.splitter_ratio && (
                <div className="text-gray-600">Split: {selectedLCP.splitter_ratio}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="max-h-48 overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="text-center text-gray-500 py-4">Loading LCPs...</div>
            ) : filteredLCPs.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                {lcpEntries.length === 0 ? 'No LCP entries found' : 'No matches found'}
              </div>
            ) : (
              filteredLCPs.slice(0, 10).map((lcp) => (
                <button
                  key={lcp.id}
                  onClick={() => handleSelect(lcp)}
                  className="w-full p-3 bg-white dark:bg-gray-800 rounded-lg border hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{lcp.lcp_number}</span>
                    {lcp.splitter_ratio && (
                      <Badge variant="outline" className="text-xs">{lcp.splitter_ratio}</Badge>
                    )}
                  </div>
                  {lcp.location && (
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {lcp.location}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        )}

        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-200">
              Linking LCP data helps the AI correlate event distances with known infrastructure points like splitters, NAPs, and splice locations.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}