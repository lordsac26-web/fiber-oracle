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
  const { location, loading: locationLoading, getCurrentLocation } = useGeolocation();

  useEffect(() => {
    // Get current location on mount
    getCurrentLocation();
  }, []);

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
                  'border-blue-500 text-blue-400 bg-blue-950/50'
                }`}
              >
                <>
                  <Wifi className="h-3 w-3 mr-1" />
                  Connected
                </>
              
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

        {/* Tools Grid */}
        <div className="grid grid-cols-2 gap-3">
          {FIELD_TOOLS.map((tool) => (
            <Link key={tool.id} to={createPageUrl(tool.page)}>
              <Card
                className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-full"
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

                </CardContent>
              </Card>
            </Link>
          ))}
        </div>



        {/* Tips */}
        <Card className="bg-blue-900/20 border-blue-700/50">
          <CardContent className="py-3 px-4">
            <div className="flex items-start gap-3">
              <Download className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-200">
                  {location ? 'GPS Active' : 'Location Services'}
                </p>
                <p className="text-xs text-blue-300/80 mt-1">
                  {location 
                    ? `GPS coordinates captured automatically. Current accuracy: ±${location.accuracy.toFixed(0)}m`
                    : 'Enable location services for accurate GPS coordinates with photos and test results.'
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