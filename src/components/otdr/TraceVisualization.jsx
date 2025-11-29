import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  AlertTriangle,
  CheckCircle2,
  Info
} from 'lucide-react';

const severityColors = {
  critical: { bg: '#ef4444', text: 'text-red-600', border: 'border-red-400' },
  warning: { bg: '#f59e0b', text: 'text-amber-600', border: 'border-amber-400' },
  info: { bg: '#3b82f6', text: 'text-blue-600', border: 'border-blue-400' },
  ok: { bg: '#22c55e', text: 'text-green-600', border: 'border-green-400' },
};

export default function TraceVisualization({ 
  events, 
  totalLength, 
  totalLoss, 
  analysisResult,
  onEventClick 
}) {
  const [zoom, setZoom] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Generate synthetic trace visualization based on events
  const generateTracePath = () => {
    if (!events || events.length === 0) return '';
    
    const width = 800;
    const height = 200;
    const padding = 40;
    const maxDistance = parseFloat(totalLength) * 1000 || 5000; // Convert km to m
    const maxLoss = parseFloat(totalLoss) || 10;
    
    let pathData = `M ${padding} ${padding}`;
    let currentLoss = 0;
    
    // Sort events by distance
    const sortedEvents = [...events]
      .filter(e => e.distance)
      .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
    
    // Start point
    let lastX = padding;
    let lastY = padding;
    
    sortedEvents.forEach((event) => {
      const distance = parseFloat(event.distance) || 0;
      const loss = parseFloat(event.loss) || 0;
      
      // Calculate position
      const x = padding + (distance / maxDistance) * (width - 2 * padding);
      
      // Add fiber attenuation slope before event
      const fiberLoss = (distance / 1000) * 0.35; // 0.35 dB/km
      currentLoss += fiberLoss;
      const yBeforeEvent = padding + (currentLoss / maxLoss) * (height - 2 * padding);
      
      // Draw line to event
      pathData += ` L ${x} ${yBeforeEvent}`;
      
      // Add event loss (step down)
      currentLoss += loss;
      const yAfterEvent = padding + (currentLoss / maxLoss) * (height - 2 * padding);
      pathData += ` L ${x} ${yAfterEvent}`;
      
      lastX = x;
      lastY = yAfterEvent;
    });
    
    // Extend to end
    pathData += ` L ${width - padding} ${lastY}`;
    
    return pathData;
  };

  const getEventPosition = (event) => {
    const width = 800;
    const padding = 40;
    const maxDistance = parseFloat(totalLength) * 1000 || 5000;
    const distance = parseFloat(event.distance) || 0;
    return padding + (distance / maxDistance) * (width - 2 * padding);
  };

  const getAnalysisForEvent = (eventIndex) => {
    if (!analysisResult?.events_analysis) return null;
    return analysisResult.events_analysis.find(e => e.event_number === eventIndex + 1);
  };

  const handleEventClick = (event, index) => {
    setSelectedEvent(index);
    if (onEventClick) {
      onEventClick(event, index, getAnalysisForEvent(index));
    }
  };

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Interactive Trace View</h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-500">{Math.round(zoom * 100)}%</span>
            <Button variant="outline" size="sm" onClick={() => setZoom(Math.min(2, zoom + 0.25))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setZoom(1)}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative overflow-x-auto bg-gray-900 rounded-lg p-4" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
          <svg width="800" height="250" className="w-full">
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="50" height="25" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 25" fill="none" stroke="#374151" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="800" height="200" fill="url(#grid)" y="25" />
            
            {/* Axis labels */}
            <text x="400" y="240" fill="#9ca3af" fontSize="12" textAnchor="middle">Distance (m)</text>
            <text x="15" y="125" fill="#9ca3af" fontSize="12" textAnchor="middle" transform="rotate(-90, 15, 125)">Loss (dB)</text>
            
            {/* Trace path */}
            <path
              d={generateTracePath()}
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
              className="drop-shadow-lg"
            />
            
            {/* Event markers */}
            <TooltipProvider>
              {events.filter(e => e.distance).map((event, index) => {
                const x = getEventPosition(event);
                const analysis = getAnalysisForEvent(index);
                const severity = analysis?.severity || 'info';
                const color = severityColors[severity];
                
                return (
                  <g key={index}>
                    {/* Vertical line at event */}
                    <line
                      x1={x}
                      y1={25}
                      x2={x}
                      y2={225}
                      stroke={color.bg}
                      strokeWidth="1"
                      strokeDasharray="4,4"
                      opacity={0.5}
                    />
                    
                    {/* Event marker */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <circle
                          cx={x}
                          cy={100}
                          r={selectedEvent === index ? 12 : 8}
                          fill={color.bg}
                          stroke="white"
                          strokeWidth="2"
                          className="cursor-pointer hover:opacity-80 transition-all"
                          onClick={() => handleEventClick(event, index)}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-1">
                          <div className="font-semibold">Event {index + 1}</div>
                          <div className="text-xs">Distance: {event.distance}m</div>
                          <div className="text-xs">Loss: {event.loss} dB</div>
                          {analysis && (
                            <>
                              <div className="text-xs font-medium mt-1">{analysis.identified_type}</div>
                              {analysis.confidence_score && (
                                <div className="text-xs">Confidence: {analysis.confidence_score}%</div>
                              )}
                            </>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                    
                    {/* Event number label */}
                    <text
                      x={x}
                      y={100}
                      fill="white"
                      fontSize="10"
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="pointer-events-none font-bold"
                    >
                      {index + 1}
                    </text>
                  </g>
                );
              })}
            </TooltipProvider>
          </svg>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Critical</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span>Warning</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Info</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>OK</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Info className="h-4 w-4 text-gray-500" />
            <span className="text-gray-500">Click events for details</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}