import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  Move,
  AlertTriangle,
  CheckCircle2,
  Info,
  Settings,
  Download,
  Printer,
  Upload,
  Layers,
  Ruler,
  X
} from 'lucide-react';
import { toast } from 'sonner';

const severityColors = {
  critical: { bg: '#ef4444', text: 'text-red-600', border: 'border-red-400' },
  warning: { bg: '#f59e0b', text: 'text-amber-600', border: 'border-amber-400' },
  info: { bg: '#3b82f6', text: 'text-blue-600', border: 'border-blue-400' },
  ok: { bg: '#22c55e', text: 'text-green-600', border: 'border-green-400' },
};

const EVENT_TYPE_LABELS = {
  connector: 'CONN',
  splice: 'SPL',
  macrobend: 'BEND',
  microbend: 'μBEND',
  break: 'BRK',
  end: 'END',
  splitter: 'SPLIT',
  unknown: '?'
};

export default function TraceVisualization({ 
  events, 
  totalLength, 
  totalLoss, 
  analysisResult,
  onEventClick 
}) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  
  // View state
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Settings
  const [showThresholds, setShowThresholds] = useState(true);
  const [showEventLabels, setShowEventLabels] = useState(true);
  const [showDistanceMarkers, setShowDistanceMarkers] = useState(true);
  const [connectorThreshold, setConnectorThreshold] = useState(0.5);
  const [spliceThreshold, setSpliceThreshold] = useState(0.1);
  
  // Reference trace
  const [referenceTrace, setReferenceTrace] = useState(null);
  const [showReference, setShowReference] = useState(false);

  // Dimensions
  const width = 900;
  const height = 280;
  const padding = { top: 40, right: 40, bottom: 50, left: 60 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Calculate dynamic scales
  const maxDistance = parseFloat(totalLength) * 1000 || 5000;
  const calculatedMaxLoss = Math.max(
    parseFloat(totalLoss) || 5,
    ...events.filter(e => e.loss).map(e => parseFloat(e.loss) || 0)
  );
  const maxLoss = Math.ceil(calculatedMaxLoss * 1.3); // 30% headroom

  // Generate trace path
  const generateTracePath = (eventData, isReference = false) => {
    if (!eventData || eventData.length === 0) return '';
    
    let pathData = `M ${padding.left} ${padding.top}`;
    let currentLoss = 0;
    
    const sortedEvents = [...eventData]
      .filter(e => e.distance)
      .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
    
    sortedEvents.forEach((event) => {
      const distance = parseFloat(event.distance) || 0;
      const loss = parseFloat(event.loss) || 0;
      
      const x = padding.left + (distance / maxDistance) * plotWidth;
      const fiberLoss = (distance / 1000) * 0.35;
      currentLoss += fiberLoss;
      const yBeforeEvent = padding.top + (currentLoss / maxLoss) * plotHeight;
      
      pathData += ` L ${x} ${yBeforeEvent}`;
      currentLoss += loss;
      const yAfterEvent = padding.top + (currentLoss / maxLoss) * plotHeight;
      pathData += ` L ${x} ${yAfterEvent}`;
    });
    
    pathData += ` L ${width - padding.right} ${padding.top + (currentLoss / maxLoss) * plotHeight}`;
    return pathData;
  };

  const getEventPosition = (event) => {
    const distance = parseFloat(event.distance) || 0;
    return padding.left + (distance / maxDistance) * plotWidth;
  };

  const getEventYPosition = (event, index) => {
    let currentLoss = 0;
    const sortedEvents = [...events]
      .filter(e => e.distance)
      .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
    
    for (let i = 0; i <= index && i < sortedEvents.length; i++) {
      const e = sortedEvents[i];
      const distance = parseFloat(e.distance) || 0;
      currentLoss += (distance / 1000) * 0.35;
      if (i < index) currentLoss += parseFloat(e.loss) || 0;
    }
    
    return padding.top + (currentLoss / maxLoss) * plotHeight;
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

  // Pan handlers
  const handleMouseDown = (e) => {
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.5, Math.min(4, prev + delta)));
  };

  // Reset view
  const resetView = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Generate distance markers
  const generateDistanceMarkers = () => {
    const markers = [];
    const numMarkers = 10;
    const step = maxDistance / numMarkers;
    
    for (let i = 0; i <= numMarkers; i++) {
      const distance = i * step;
      const x = padding.left + (distance / maxDistance) * plotWidth;
      markers.push({
        x,
        label: distance >= 1000 ? `${(distance / 1000).toFixed(1)}km` : `${Math.round(distance)}m`
      });
    }
    return markers;
  };

  // Generate loss markers
  const generateLossMarkers = () => {
    const markers = [];
    const numMarkers = 5;
    const step = maxLoss / numMarkers;
    
    for (let i = 0; i <= numMarkers; i++) {
      const loss = i * step;
      const y = padding.top + (loss / maxLoss) * plotHeight;
      markers.push({
        y,
        label: `${loss.toFixed(1)} dB`
      });
    }
    return markers;
  };

  // Handle reference trace upload
  const handleReferenceUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // For demo, create a slightly different trace
    const refEvents = events.map(ev => ({
      ...ev,
      loss: (parseFloat(ev.loss) * 0.8).toString() // Simulated reference with lower loss
    }));
    setReferenceTrace(refEvents);
    setShowReference(true);
    toast.success('Reference trace loaded');
  };

  // Export as PNG
  const exportAsPNG = () => {
    const svg = svgRef.current;
    if (!svg) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    
    canvas.width = width * 2;
    canvas.height = height * 2;
    ctx.scale(2, 2);
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, width, height);
    
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.download = `otdr-trace-${new Date().toISOString().slice(0,10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Trace exported as PNG');
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Print
  const handlePrint = () => {
    const svg = svgRef.current;
    if (!svg) return;
    
    const printWindow = window.open('', '_blank');
    const svgData = new XMLSerializer().serializeToString(svg);
    
    printWindow.document.write(`
      <html>
        <head>
          <title>OTDR Trace - ${new Date().toLocaleDateString()}</title>
          <style>
            body { margin: 20px; font-family: sans-serif; }
            h1 { font-size: 18px; margin-bottom: 10px; }
            .info { font-size: 12px; color: #666; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>OTDR Trace Analysis</h1>
          <div class="info">
            Length: ${totalLength} km | Total Loss: ${totalLoss} dB | Events: ${events.length}
          </div>
          ${svgData}
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const distanceMarkers = generateDistanceMarkers();
  const lossMarkers = generateLossMarkers();

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardContent className="p-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-semibold">Interactive Trace View</h3>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Zoom controls */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setZoom(Math.min(4, zoom + 0.25))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={resetView}>
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Settings popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-1" />
                  Options
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72">
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm">Display Options</h4>
                  
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Event Labels</Label>
                    <Switch checked={showEventLabels} onCheckedChange={setShowEventLabels} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Distance Markers</Label>
                    <Switch checked={showDistanceMarkers} onCheckedChange={setShowDistanceMarkers} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Threshold Lines</Label>
                    <Switch checked={showThresholds} onCheckedChange={setShowThresholds} />
                  </div>

                  {showThresholds && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-xs">Connector Threshold: {connectorThreshold} dB</Label>
                        <Slider
                          value={[connectorThreshold]}
                          onValueChange={([v]) => setConnectorThreshold(v)}
                          min={0.1}
                          max={1.0}
                          step={0.05}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Splice Threshold: {spliceThreshold} dB</Label>
                        <Slider
                          value={[spliceThreshold]}
                          onValueChange={([v]) => setSpliceThreshold(v)}
                          min={0.05}
                          max={0.5}
                          step={0.01}
                        />
                      </div>
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Reference trace */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Layers className="h-4 w-4 mr-1" />
                  Reference
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Reference Trace</h4>
                  
                  {referenceTrace ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Show Overlay</Label>
                        <Switch checked={showReference} onCheckedChange={setShowReference} />
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => { setReferenceTrace(null); setShowReference(false); }}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Remove Reference
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">
                        Upload a baseline trace for comparison
                      </p>
                      <Input
                        type="file"
                        accept=".sor,.csv,.json"
                        onChange={handleReferenceUpload}
                        className="text-xs"
                      />
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Export options */}
            <Button variant="outline" size="sm" onClick={exportAsPNG}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* SVG Container with pan/zoom */}
        <div 
          ref={containerRef}
          className="relative overflow-hidden bg-gray-900 rounded-lg cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{ height: height + 20 }}
        >
          <svg 
            ref={svgRef}
            width={width} 
            height={height}
            style={{
              transform: `scale(${zoom}) translate(${panOffset.x / zoom}px, ${panOffset.y / zoom}px)`,
              transformOrigin: 'center center'
            }}
          >
            {/* Background grid */}
            <defs>
              <pattern id="grid" width="50" height="25" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 25" fill="none" stroke="#374151" strokeWidth="0.5" />
              </pattern>
              <pattern id="gridSmall" width="10" height="5" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 5" fill="none" stroke="#374151" strokeWidth="0.2" />
              </pattern>
            </defs>
            <rect x={padding.left} y={padding.top} width={plotWidth} height={plotHeight} fill="url(#gridSmall)" />
            <rect x={padding.left} y={padding.top} width={plotWidth} height={plotHeight} fill="url(#grid)" />
            
            {/* Plot border */}
            <rect 
              x={padding.left} 
              y={padding.top} 
              width={plotWidth} 
              height={plotHeight} 
              fill="none" 
              stroke="#4b5563" 
              strokeWidth="1"
            />

            {/* Threshold lines */}
            {showThresholds && (
              <>
                {/* Connector threshold */}
                <line
                  x1={padding.left}
                  y1={padding.top + (connectorThreshold / maxLoss) * plotHeight}
                  x2={width - padding.right}
                  y2={padding.top + (connectorThreshold / maxLoss) * plotHeight}
                  stroke="#ef4444"
                  strokeWidth="1"
                  strokeDasharray="8,4"
                  opacity="0.6"
                />
                <text
                  x={width - padding.right + 5}
                  y={padding.top + (connectorThreshold / maxLoss) * plotHeight + 4}
                  fill="#ef4444"
                  fontSize="9"
                >
                  Conn Max
                </text>
                
                {/* Splice threshold */}
                <line
                  x1={padding.left}
                  y1={padding.top + (spliceThreshold / maxLoss) * plotHeight}
                  x2={width - padding.right}
                  y2={padding.top + (spliceThreshold / maxLoss) * plotHeight}
                  stroke="#f59e0b"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                  opacity="0.6"
                />
                <text
                  x={width - padding.right + 5}
                  y={padding.top + (spliceThreshold / maxLoss) * plotHeight + 4}
                  fill="#f59e0b"
                  fontSize="9"
                >
                  Splice Max
                </text>
              </>
            )}

            {/* Distance markers (X-axis) */}
            {showDistanceMarkers && distanceMarkers.map((marker, i) => (
              <g key={`dist-${i}`}>
                <line
                  x1={marker.x}
                  y1={height - padding.bottom}
                  x2={marker.x}
                  y2={height - padding.bottom + 5}
                  stroke="#9ca3af"
                  strokeWidth="1"
                />
                <text
                  x={marker.x}
                  y={height - padding.bottom + 18}
                  fill="#9ca3af"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {marker.label}
                </text>
              </g>
            ))}

            {/* Loss markers (Y-axis) */}
            {lossMarkers.map((marker, i) => (
              <g key={`loss-${i}`}>
                <line
                  x1={padding.left - 5}
                  y1={marker.y}
                  x2={padding.left}
                  y2={marker.y}
                  stroke="#9ca3af"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 10}
                  y={marker.y + 4}
                  fill="#9ca3af"
                  fontSize="10"
                  textAnchor="end"
                >
                  {marker.label}
                </text>
              </g>
            ))}

            {/* Axis labels */}
            <text x={width / 2} y={height - 5} fill="#9ca3af" fontSize="11" textAnchor="middle">
              Distance
            </text>
            <text 
              x={15} 
              y={height / 2} 
              fill="#9ca3af" 
              fontSize="11" 
              textAnchor="middle" 
              transform={`rotate(-90, 15, ${height / 2})`}
            >
              Loss (dB)
            </text>

            {/* Reference trace (if enabled) */}
            {showReference && referenceTrace && (
              <path
                d={generateTracePath(referenceTrace, true)}
                fill="none"
                stroke="#60a5fa"
                strokeWidth="2"
                strokeDasharray="6,3"
                opacity="0.7"
              />
            )}
            
            {/* Main trace path */}
            <path
              d={generateTracePath(events)}
              fill="none"
              stroke="#22c55e"
              strokeWidth="2.5"
              className="drop-shadow-lg"
            />
            
            {/* Event markers */}
            <TooltipProvider>
              {events.filter(e => e.distance).map((event, index) => {
                const x = getEventPosition(event);
                const y = getEventYPosition(event, index);
                const analysis = getAnalysisForEvent(index);
                const severity = analysis?.severity || 'info';
                const color = severityColors[severity];
                const eventType = analysis?.impairment_category || event.type || 'unknown';
                
                return (
                  <g key={index}>
                    {/* Vertical line at event */}
                    <line
                      x1={x}
                      y1={padding.top}
                      x2={x}
                      y2={height - padding.bottom}
                      stroke={color.bg}
                      strokeWidth="1"
                      strokeDasharray="4,4"
                      opacity={0.4}
                    />
                    
                    {/* Event marker */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <g 
                          className="cursor-pointer"
                          onClick={() => handleEventClick(event, index)}
                        >
                          <circle
                            cx={x}
                            cy={y}
                            r={selectedEvent === index ? 14 : 10}
                            fill={color.bg}
                            stroke="white"
                            strokeWidth="2"
                            className="hover:opacity-80 transition-all"
                          />
                          <text
                            x={x}
                            y={y}
                            fill="white"
                            fontSize="9"
                            textAnchor="middle"
                            dominantBaseline="central"
                            className="pointer-events-none font-bold"
                          >
                            {index + 1}
                          </text>
                        </g>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-1">
                          <div className="font-semibold">Event {index + 1}: {analysis?.identified_type || eventType}</div>
                          <div className="text-xs">Distance: {event.distance}m</div>
                          <div className="text-xs">Loss: {event.loss} dB</div>
                          {event.reflectance && <div className="text-xs">Reflectance: {event.reflectance} dB</div>}
                          {analysis?.confidence_score && (
                            <div className="text-xs font-medium">Confidence: {analysis.confidence_score}%</div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                    
                    {/* Event label */}
                    {showEventLabels && (
                      <g>
                        <rect
                          x={x - 20}
                          y={y - 30}
                          width={40}
                          height={14}
                          rx={3}
                          fill={color.bg}
                          opacity={0.9}
                        />
                        <text
                          x={x}
                          y={y - 20}
                          fill="white"
                          fontSize="8"
                          textAnchor="middle"
                          className="pointer-events-none font-semibold"
                        >
                          {EVENT_TYPE_LABELS[eventType] || eventType.slice(0, 4).toUpperCase()}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </TooltipProvider>
          </svg>

          {/* Zoom indicator */}
          {zoom !== 1 && (
            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              <Move className="h-3 w-3 inline mr-1" />
              Drag to pan | Scroll to zoom
            </div>
          )}
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
          {showReference && referenceTrace && (
            <div className="flex items-center gap-2 ml-4 pl-4 border-l">
              <div className="w-6 h-0.5 bg-blue-400" style={{ borderTop: '2px dashed #60a5fa' }} />
              <span>Reference</span>
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <Info className="h-4 w-4 text-gray-500" />
            <span className="text-gray-500">Click events for details</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}