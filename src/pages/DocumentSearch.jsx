import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Search,
  FileText,
  Calendar,
  Filter,
  Download,
  ExternalLink,
  Sparkles,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';

// Fuzzy search helper - Levenshtein distance
const levenshteinDistance = (str1, str2) => {
  const track = Array(str2.length + 1).fill(null).map(() =>
    Array(str1.length + 1).fill(null));
  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j;
  }
  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator,
      );
    }
  }
  return track[str2.length][str1.length];
};

const fuzzyMatch = (searchTerm, text, threshold = 3) => {
  const searchLower = searchTerm.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Exact match
  if (textLower.includes(searchLower)) return true;
  
  // Fuzzy match - check each word
  const words = textLower.split(/\s+/);
  return words.some(word => {
    if (word.length < 3) return false;
    return levenshteinDistance(searchLower, word) <= threshold;
  });
};

const highlightText = (text, searchTerm, maxLength = 200) => {
  if (!searchTerm || !text) return text.substring(0, maxLength);
  
  const lowerText = text.toLowerCase();
  const lowerSearch = searchTerm.toLowerCase();
  const index = lowerText.indexOf(lowerSearch);
  
  if (index === -1) return text.substring(0, maxLength);
  
  const start = Math.max(0, index - 50);
  const end = Math.min(text.length, index + searchTerm.length + 150);
  const snippet = text.substring(start, end);
  
  return (start > 0 ? '...' : '') + snippet + (end < text.length ? '...' : '');
};

const CATEGORIES = [
  'installation', 'troubleshooting', 'maintenance', 
  'safety', 'specifications', 'training', 'other'
];

export default function DocumentSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [fuzzyEnabled, setFuzzyEnabled] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['referenceDocuments'],
    queryFn: () => base44.entities.ReferenceDocument.filter({ is_active: true }),
  });

  const filteredDocuments = useMemo(() => {
    let results = documents;

    // Category filter
    if (selectedCategories.length > 0) {
      results = results.filter(doc => 
        selectedCategories.includes(doc.category)
      );
    }

    // Date filter
    if (dateFrom) {
      results = results.filter(doc => 
        moment(doc.created_date).isSameOrAfter(moment(dateFrom))
      );
    }
    if (dateTo) {
      results = results.filter(doc => 
        moment(doc.created_date).isSameOrBefore(moment(dateTo))
      );
    }

    // Search filter
    if (searchTerm) {
      results = results.filter(doc => {
        const searchableText = [
          doc.title,
          doc.content,
          doc.comments,
          doc.category,
          JSON.stringify(doc.metadata || {})
        ].join(' ');

        if (fuzzyEnabled) {
          return fuzzyMatch(searchTerm, searchableText);
        } else {
          return searchableText.toLowerCase().includes(searchTerm.toLowerCase());
        }
      });
    }

    return results;
  }, [documents, searchTerm, selectedCategories, dateFrom, dateTo, fuzzyEnabled]);

  const toggleCategory = (category) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategories([]);
    setDateFrom('');
    setDateTo('');
    setFuzzyEnabled(false);
  };

  const hasActiveFilters = searchTerm || selectedCategories.length > 0 || dateFrom || dateTo;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('PhotonChat')}>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6927bc307b96037b8506c608/1652e0384_oracle.jpg" 
                alt="Fiber Oracle" 
                className="w-10 h-10 rounded-xl object-cover shadow-lg"
              />
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Document Search</h1>
                <p className="text-xs text-gray-500">Advanced search across knowledge base</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-blue-50 border-blue-300' : ''}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* Search Bar */}
        <Card className="border-0 shadow">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search documents by title, content, or keywords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 text-base"
                />
              </div>
              <Button
                variant={fuzzyEnabled ? 'default' : 'outline'}
                size="lg"
                onClick={() => setFuzzyEnabled(!fuzzyEnabled)}
                className={fuzzyEnabled ? 'bg-purple-600 hover:bg-purple-700' : ''}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Fuzzy
              </Button>
            </div>
            
            {hasActiveFilters && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="text-xs text-gray-500">Active filters:</span>
                {searchTerm && (
                  <Badge variant="outline" className="bg-blue-50">
                    Search: "{searchTerm}"
                    <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setSearchTerm('')} />
                  </Badge>
                )}
                {selectedCategories.map(cat => (
                  <Badge key={cat} variant="outline" className="bg-green-50">
                    {cat}
                    <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => toggleCategory(cat)} />
                  </Badge>
                ))}
                {(dateFrom || dateTo) && (
                  <Badge variant="outline" className="bg-amber-50">
                    Date range
                    <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => { setDateFrom(''); setDateTo(''); }} />
                  </Badge>
                )}
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6">
                  Clear all
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filters Panel */}
        {showFilters && (
          <Card className="border-0 shadow">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Advanced Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Category Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Categories</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(category => (
                    <div
                      key={category}
                      onClick={() => toggleCategory(category)}
                      className={`px-3 py-1.5 rounded-lg border cursor-pointer transition-all text-sm ${
                        selectedCategories.includes(category)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                      }`}
                    >
                      {category}
                    </div>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    From Date
                  </label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    To Date
                  </label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        <Card className="border-0 shadow">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Search Results ({filteredDocuments.length})
              </span>
              {fuzzyEnabled && (
                <Badge variant="outline" className="bg-purple-50 border-purple-300 text-purple-700">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Fuzzy Search Active
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50 animate-pulse" />
                <p>Loading documents...</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium mb-1">No documents found</p>
                <p className="text-sm">Try adjusting your search terms or filters</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDocuments.map(doc => (
                  <Card key={doc.id} className="border hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-base text-gray-900 dark:text-white truncate">
                              {doc.title}
                            </h3>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                              {doc.category}
                            </Badge>
                            {doc.version && (
                              <Badge variant="outline" className="text-xs">
                                v{doc.version}
                              </Badge>
                            )}
                          </div>
                          
                          {doc.content && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {highlightText(doc.content, searchTerm)}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {moment(doc.created_date).format('MMM D, YYYY')}
                            </span>
                            <span>Type: {doc.source_type}</span>
                            {doc.comments && (
                              <span className="truncate max-w-xs">Note: {doc.comments}</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 flex-shrink-0">
                          {doc.source_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <a href={doc.source_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}