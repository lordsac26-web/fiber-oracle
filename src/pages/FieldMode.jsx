import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Calculator,
  Stethoscope,
  BookOpen,
  Zap,
  ArrowLeft,
  Wifi,
  WifiOff,
  Download,
  Upload,
  FileText,
  Camera,
  CloudOff,
  Cloud
} from 'lucide-react';
import { toast } from 'sonner';
import { getDraftReports, getTestResults, initDB } from '@/components/OfflineStorage';
import CameraCapture from '@/components/CameraCapture';
import { useGeolocation } from '@/components/useGeolocation';
import LocationMap from '@/components/LocationMap';

const FIELD_TOOLS = [
  {
    id: 'calculator',
    title: 'Loss Budget',
    description: 'Calculate link loss',
    icon: Calculator,
    color: 'from-blue-500 to-indigo-600',
    page: 'LossBudget',
    offline: true
  },
  {
    id: 'doctor',
    title: 'Fiber Doctor',
    description: 'Troubleshoot issues',
    icon: Stethoscope,
    color: 'from-rose-500 to-pink-600',
    page: 'FiberDoctor',
    offline: true
  },
  {
    id: 'tables',
    title: 'Reference Tables',
    description: 'Standards & specs',
    icon: BookOpen,
    color: 'from-slate-500 to-gray-600',
    page: 'ReferenceTables',
    offline: true
  },
  {
    id: 'photon',
    title: 'P.H.O.T.O.N.',
    description: 'AI Assistant',
    icon: Zap,
    color: 'from-cyan-400 to-blue-600',
    page: 'PhotonChat',
    offline: false
  },
  {
    id: 'reports',
    title: 'Job Reports',
    description: 'Document work',
    icon: FileText,
    color: 'from-emerald-500 to-teal-600',
    page: 'JobReports',
    offline: true
  }
];

export default function FieldMode() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [draftCount, setDraftCount] = useState(0);
  const [testCount, setTestCount] = useState(0);
  const [dbReady, setDbReady] = useState(false);
  const [recentLocations, setRecentLocations] = useState([]);
  const { location, loading: locationLoading, getCurrentLocation } = useGeolocation();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialize IndexedDB and load counts
    initDB()
      .then(() => {
        setDbReady(true);
        loadCounts();
        loadRecentLocations();
      })
      .catch(() => toast.error('Offline storage unavailable'));

    // Get current location on mount
    getCurrentLocation();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadCounts = async () => {
    try {
      const drafts = await getDraftReports();
      const tests = await getTestResults();
      setDraftCount(drafts.filter(d => !d.synced).length);
      setTestCount(tests.length);
    } catch (error) {
      console.error('Failed to load counts:', error);
    }
  };

  const loadRecentLocations = async () => {
    try {
      const tests = await getTestResults();
      const locationsWithGPS = tests
        .filter(t => t.gps?.latitude && t.gps?.longitude)
        .slice(0, 10)
        .map((t, idx) => ({
          gps: t.gps,
          title: t.title || `Test ${idx + 1}`,
          description: t.type,
          timestamp: t.timestamp
        }));
      setRecentLocations(locationsWithGPS);
    } catch (error) {
      console.error('Failed to load locations:', error);
    }
  };

  const handlePhotoCapture = (photo) => {
    toast.success('Photo ready for attachment');
    console.log('Captured photo:', photo);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon" className="rounded-full text-white hover:bg-slate-800">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                  <Zap className="h-5 w-5 text-cyan-400" />
                  Field Mode
                </h1>
                <p className="text-xs text-slate-400">Mobile-optimized tools for technicians</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`${
                  isOnline
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-950/50'
                    : 'border-amber-500 text-amber-400 bg-amber-950/50'
                }`}
              >
                {isOnline ? (
                  <>
                    <Wifi className="h-3 w-3 mr-1" />
                    Online
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 mr-1" />
                    Offline
                  </>
                )}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Quick Actions */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <CameraCapture
              onPhotoCapture={handlePhotoCapture}
              buttonVariant="default"
              buttonSize="lg"
              buttonText="Photo"
            />
            <Link to={createPageUrl('JobReports')} className="w-full">
              <Button variant="outline" size="lg" className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                New Report
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Offline Status */}
        {dbReady && (draftCount > 0 || testCount > 0) && (
          <Card className="bg-amber-900/20 border-amber-700/50">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-3">
                <CloudOff className="h-5 w-5 text-amber-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-200">
                    Unsaved Data
                  </p>
                  <p className="text-xs text-amber-300/80">
                    {draftCount} draft report{draftCount !== 1 ? 's' : ''}, {testCount} test result{testCount !== 1 ? 's' : ''}
                  </p>
                </div>
                {isOnline && (
                  <Button size="sm" variant="outline" className="border-amber-500 text-amber-400">
                    <Upload className="h-3 w-3 mr-1" />
                    Sync
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tools Grid */}
        <div className="grid grid-cols-2 gap-3">
          {FIELD_TOOLS.map((tool) => (
            <Link key={tool.id} to={createPageUrl(tool.page)}>
              <Card
                className={`border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-full ${
                  !isOnline && !tool.offline ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <CardContent className="p-4 flex flex-col items-center text-center space-y-3">
                  <div
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${tool.color} flex items-center justify-center shadow-lg`}
                  >
                    <tool.icon className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                      {tool.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      {tool.description}
                    </p>
                  </div>
                  {tool.offline && (
                    <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-600">
                      <Cloud className="h-3 w-3 mr-1" />
                      Offline
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Location Map */}
        {location && (
          <LocationMap 
            currentLocation={location}
            locations={recentLocations}
            height="300px"
          />
        )}

        {/* Tips */}
        <Card className="bg-blue-900/20 border-blue-700/50">
          <CardContent className="py-3 px-4">
            <div className="flex items-start gap-3">
              <Download className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-200">
                  {location ? 'GPS Active' : 'Offline Mode Active'}
                </p>
                <p className="text-xs text-blue-300/80 mt-1">
                  {location 
                    ? `GPS coordinates captured automatically with photos and test results. Current accuracy: ±${location.accuracy.toFixed(0)}m`
                    : 'Tools marked with offline badge work without internet. Data syncs automatically when online.'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}