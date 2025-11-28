import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ImageIcon, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Eye,
  Zap,
  Info,
  Plus,
  Upload,
  Trash2,
  Camera
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// Impairment definitions with visual descriptions (400x scope)
const SCOPE_IMPAIRMENTS = [
  {
    id: 'clean_pass',
    name: 'Clean Connector - PASS',
    category: 'good',
    severity: 'pass',
    visual: 'Clear end-face with no visible contamination. Core zone completely clear. May show slight polishing marks in outer zones.',
    description: 'This is what a properly cleaned connector looks like. Ready for connection.',
    action: 'No action needed - connector is ready to mate.',
    criteria: 'Per IEC 61300-3-35: No defects in Zone A (core), no scratches >3μm in Zone B',
    colorScheme: 'emerald',
    zones: { core: 'Clear', cladding: 'Clear', adhesive: 'Minor OK', contact: 'Acceptable' }
  },
  {
    id: 'dust_particles',
    name: 'Dust Particles',
    category: 'contamination',
    severity: 'warning',
    visual: 'Small dark spots scattered across end-face. Particles may be various sizes. Often concentrated around edges.',
    description: 'Loose particles from environment, cable jacket debris, or poor storage. Common issue.',
    action: 'Dry clean first with lint-free wipe or cleaning card. Single direction only. Re-inspect.',
    criteria: 'Must remove all particles from core zone. Cladding zone particles <2μm may be acceptable.',
    colorScheme: 'amber',
    zones: { core: 'Particles visible', cladding: 'Particles visible', adhesive: 'N/A', contact: 'N/A' }
  },
  {
    id: 'oil_film',
    name: 'Oil Film / Residue',
    category: 'contamination',
    severity: 'warning',
    visual: 'Hazy or foggy appearance across end-face. Rainbow sheen when light angle changes. Smeared appearance.',
    description: 'Finger oils, uncured epoxy, lubricants, or residue from improper cleaning. Can cause high loss.',
    action: 'Wet/dry cleaning required. Use IPA or approved solvent. Wet clean then immediate dry.',
    criteria: 'All residue must be removed. No haze in core or cladding zones.',
    colorScheme: 'amber',
    zones: { core: 'Hazy film', cladding: 'Hazy film', adhesive: 'May show film', contact: 'N/A' }
  },
  {
    id: 'scratches_cladding',
    name: 'Scratches - Cladding Zone',
    category: 'damage',
    severity: 'marginal',
    visual: 'Linear marks in cladding zone, not crossing core. May be single or multiple. Appear as bright lines.',
    description: 'Caused by contaminated mating, improper cleaning, or defective adapter. Monitor for progression.',
    action: 'If scratches do not enter core zone, connector may be usable. Document and monitor.',
    criteria: 'Scratches <3μm in cladding zone = marginal pass. Any core zone scratches = fail.',
    colorScheme: 'orange',
    zones: { core: 'Clear', cladding: 'Scratches present', adhesive: 'N/A', contact: 'N/A' }
  },
  {
    id: 'scratches_core',
    name: 'Scratches - Core Zone',
    category: 'damage',
    severity: 'fail',
    visual: 'Linear marks crossing the center core zone. May appear as bright lines. Cannot be cleaned.',
    description: 'Permanent damage from mating with contaminated connector or improper cleaning. Causes signal loss.',
    action: 'REPLACE connector or patch cord. Cannot be repaired. Document damage for quality tracking.',
    criteria: 'ANY scratch in core zone = automatic fail regardless of size.',
    colorScheme: 'red',
    zones: { core: 'Scratched - FAIL', cladding: 'May show damage', adhesive: 'N/A', contact: 'N/A' }
  },
  {
    id: 'pitting',
    name: 'Pitting / Chips',
    category: 'damage',
    severity: 'fail',
    visual: 'Small dark spots that appear as holes or divots in the glass. Do not move when cleaning. May have cracks.',
    description: 'Physical damage from impact or mating with severely contaminated connector. Permanent.',
    action: 'REPLACE immediately. Pitted connector will damage mating connector.',
    criteria: 'Any pitting in core or cladding = fail. Will cause IL and RL failures.',
    colorScheme: 'red',
    zones: { core: 'Pitted - FAIL', cladding: 'May show pits', adhesive: 'N/A', contact: 'N/A' }
  },
  {
    id: 'embedded_debris',
    name: 'Embedded Debris',
    category: 'contamination',
    severity: 'fail',
    visual: 'Particles that do not move with cleaning. Appear fixed in position. May be partially in glass.',
    description: 'Debris burned or pressed into end-face from high-power transmission or forceful mating.',
    action: 'Attempt wet clean with pressure. If debris remains, replace connector.',
    criteria: 'Embedded debris in core = fail. Must be completely removed to pass.',
    colorScheme: 'red',
    zones: { core: 'Debris embedded', cladding: 'May show debris', adhesive: 'N/A', contact: 'N/A' }
  },
  {
    id: 'cracked_ferrule',
    name: 'Cracked Ferrule',
    category: 'damage',
    severity: 'fail',
    visual: 'Linear crack extending from edge of ferrule. May reach core. Often from drop or impact.',
    description: 'Physical damage to ceramic or zirconia ferrule. Will cause intermittent or total failure.',
    action: 'REPLACE immediately. Do not attempt to use - may damage adapter and mating connector.',
    criteria: 'Any crack visible = immediate fail. May cause catastrophic failure under pressure.',
    colorScheme: 'red',
    zones: { core: 'Crack may reach', cladding: 'Crack visible', adhesive: 'Crack extends', contact: 'Crack source' }
  },
  {
    id: 'epoxy_ring',
    name: 'Epoxy Ring / Adhesive Visible',
    category: 'manufacturing',
    severity: 'marginal',
    visual: 'Dark ring visible around fiber, between core/cladding and ferrule. May be uniform or irregular.',
    description: 'Epoxy adhesive visible at fiber-ferrule interface. Normal if contained in adhesive zone.',
    action: 'If epoxy is only in adhesive zone (outside cladding), connector passes. If in cladding zone, marginal.',
    criteria: 'Epoxy in core/cladding zone = fail. Adhesive zone only = pass.',
    colorScheme: 'amber',
    zones: { core: 'Must be clear', cladding: 'Must be clear', adhesive: 'Epoxy OK here', contact: 'N/A' }
  },
  {
    id: 'fiber_protrusion',
    name: 'Fiber Protrusion / Recess',
    category: 'manufacturing',
    severity: 'fail',
    visual: 'Fiber appears raised above or sunken below ferrule surface. Focus changes when adjusting scope.',
    description: 'Manufacturing defect or damage. Will not make proper physical contact with mating connector.',
    action: 'REPLACE connector. Cannot be field-repaired. Will cause high insertion loss.',
    criteria: 'Fiber must be flush with ferrule surface ±50nm for PC contact.',
    colorScheme: 'red',
    zones: { core: 'Height issue', cladding: 'N/A', adhesive: 'N/A', contact: 'N/A' }
  },
  {
    id: 'mpo_fibers_dirty',
    name: 'MPO - Multiple Dirty Fibers',
    category: 'contamination',
    severity: 'warning',
    visual: 'MPO end-face showing contamination on multiple fibers. May be dust, oil, or debris.',
    description: 'Common with MPO due to larger exposure area. All 12/24 fibers must be clean.',
    action: 'Use MPO-specific cleaner. Push-type with correct ribbon width. Clean guide pins separately.',
    criteria: 'ALL fibers must pass individually. Single dirty fiber = overall fail.',
    colorScheme: 'amber',
    zones: { core: 'Check all fibers', cladding: 'Check all fibers', adhesive: 'N/A', contact: 'N/A' }
  },
  {
    id: 'guide_pin_damage',
    name: 'MPO - Guide Pin Damage',
    category: 'damage',
    severity: 'fail',
    visual: 'Bent, scratched, or broken guide pins on male MPO connector.',
    description: 'Guide pin damage prevents proper alignment. Will cause high loss across all fibers.',
    action: 'REPLACE connector. Damaged guide pins cannot be repaired.',
    criteria: 'Guide pins must be straight and undamaged. Check both pins.',
    colorScheme: 'red',
    zones: { core: 'N/A', cladding: 'N/A', adhesive: 'N/A', contact: 'Pin damage' }
  }
];

const OTDR_IMPAIRMENTS = [
  {
    id: 'otdr_good_connector',
    name: 'Good Mated Connector',
    category: 'good',
    severity: 'pass',
    visual: 'Small reflective spike (peak) with low loss. Reflectance better than -45dB.',
    trace_desc: 'Sharp peak returning to baseline quickly. Loss typically <0.3dB.',
    values: { reflectance: '< -45 dB', loss: '< 0.3 dB' },
    action: 'No action needed. Document for baseline.',
    colorScheme: 'emerald'
  },
  {
    id: 'otdr_dirty_connector',
    name: 'Contaminated Connector',
    category: 'contamination',
    severity: 'warning',
    visual: 'Large reflective spike. Reflectance between -35 to -45 dB. Elevated loss.',
    trace_desc: 'Tall peak, possibly with ringing after. Loss 0.3-0.75 dB typical.',
    values: { reflectance: '-35 to -45 dB', loss: '0.3-0.75 dB' },
    action: 'Locate connector. Clean per IEC procedure. Re-test.',
    colorScheme: 'amber'
  },
  {
    id: 'otdr_bad_connector',
    name: 'Damaged/Severely Dirty Connector',
    category: 'damage',
    severity: 'fail',
    visual: 'Very large reflective spike. Reflectance worse than -35 dB. High loss.',
    trace_desc: 'Very tall peak with significant loss. May show multiple reflections (ringing).',
    values: { reflectance: '> -35 dB', loss: '> 0.75 dB' },
    action: 'Clean first. If reflectance does not improve, inspect with scope and replace if damaged.',
    colorScheme: 'red'
  },
  {
    id: 'otdr_fusion_splice',
    name: 'Fusion Splice (Good)',
    category: 'good',
    severity: 'pass',
    visual: 'Non-reflective event. Small loss, no peak.',
    trace_desc: 'Slight step down in trace (loss) with no reflective peak. May show "gainer" from one direction.',
    values: { reflectance: 'N/A (non-reflective)', loss: '< 0.10 dB' },
    action: 'Document. If >0.10 dB, consider re-splice.',
    colorScheme: 'emerald'
  },
  {
    id: 'otdr_mech_splice',
    name: 'Mechanical Splice',
    category: 'marginal',
    severity: 'marginal',
    visual: 'Small reflective peak with loss. Reflectance -40 to -50 dB typical.',
    trace_desc: 'Small peak with loss event. Loss typically 0.1-0.3 dB.',
    values: { reflectance: '-40 to -50 dB', loss: '0.1-0.3 dB' },
    action: 'If emergency splice, plan to replace with fusion. If permanent install, replace with fusion splice.',
    colorScheme: 'amber'
  },
  {
    id: 'otdr_macrobend',
    name: 'Macrobend',
    category: 'damage',
    severity: 'warning',
    visual: 'Non-reflective loss event. Higher loss at 1550/1625nm than 1310nm.',
    trace_desc: 'Step down (loss) without reflective peak. Compare multi-wavelength - bend shows worse at longer wavelengths.',
    values: { reflectance: 'N/A', loss: 'Variable, wavelength dependent' },
    action: 'Locate by distance. Inspect route for tight bends. Relieve bend or use G.657 fiber.',
    colorScheme: 'amber'
  },
  {
    id: 'otdr_fiber_break',
    name: 'Fiber Break',
    category: 'damage',
    severity: 'fail',
    visual: 'Large reflective spike (near -14 dB) followed by no return signal (noise floor).',
    trace_desc: 'Trace drops to noise floor after large reflection. End of usable fiber.',
    values: { reflectance: '~ -14 dB (Fresnel)', loss: 'Total' },
    action: 'Calculate distance to break. Dispatch for repair. Prepare fusion splicer.',
    colorScheme: 'red'
  },
  {
    id: 'otdr_ghost',
    name: 'Ghost (Echo)',
    category: 'artifact',
    severity: 'info',
    visual: 'Apparent event at 2x the distance of a real reflective event.',
    trace_desc: 'Smaller peak appearing at double the distance of a high-reflectance connector. Not a real event.',
    values: { reflectance: 'Echo of real event', loss: 'N/A' },
    action: 'Ignore - not a real event. Clean high-reflectance connectors to eliminate ghost.',
    colorScheme: 'blue'
  },
  {
    id: 'otdr_gainer',
    name: 'Gainer (Apparent Gain)',
    category: 'artifact',
    severity: 'info',
    visual: 'Splice appears to show gain instead of loss when tested from one direction.',
    trace_desc: 'Trace steps UP at splice location. Normal artifact from backscatter coefficient difference.',
    values: { reflectance: 'N/A', loss: 'Appears as gain' },
    action: 'Test from BOTH directions and average. True loss = (A→B + B→A) / 2',
    colorScheme: 'blue'
  }
];

export default function ImpairmentLibrary() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImpairment, setSelectedImpairment] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [customImpairments, setCustomImpairments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [newImpairment, setNewImpairment] = useState({
    name: '',
    category: 'contamination',
    severity: 'warning',
    description: '',
    action: '',
    imageUrl: '',
    type: 'scope'
  });

  // Load custom impairments from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('customImpairments');
    if (saved) {
      setCustomImpairments(JSON.parse(saved));
    }
  }, []);

  // Save custom impairments to localStorage
  const saveCustomImpairments = (items) => {
    localStorage.setItem('customImpairments', JSON.stringify(items));
    setCustomImpairments(items);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setNewImpairment(prev => ({ ...prev, imageUrl: file_url }));
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Failed to upload image');
    }
    setUploading(false);
  };

  const handleAddImpairment = () => {
    if (!newImpairment.name || !newImpairment.description) {
      toast.error('Please fill in name and description');
      return;
    }
    
    const item = {
      ...newImpairment,
      id: `custom_${Date.now()}`,
      isCustom: true,
      colorScheme: newImpairment.severity === 'pass' ? 'emerald' : 
                   newImpairment.severity === 'fail' ? 'red' : 'amber',
      zones: { core: 'Custom', cladding: 'Custom', adhesive: 'N/A', contact: 'N/A' }
    };
    
    const updated = [...customImpairments, item];
    saveCustomImpairments(updated);
    setShowAddDialog(false);
    setNewImpairment({
      name: '',
      category: 'contamination',
      severity: 'warning',
      description: '',
      action: '',
      imageUrl: '',
      type: 'scope'
    });
    toast.success('Custom impairment saved');
  };

  const handleDeleteCustom = (id) => {
    const updated = customImpairments.filter(item => item.id !== id);
    saveCustomImpairments(updated);
    setSelectedImpairment(null);
    toast.success('Impairment deleted');
  };

  const customScopeItems = customImpairments.filter(i => i.type === 'scope');
  const customOTDRItems = customImpairments.filter(i => i.type === 'otdr');

  const filteredScope = [...SCOPE_IMPAIRMENTS, ...customScopeItems].filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory || 
                           (activeCategory === 'custom' && item.isCustom);
    return matchesSearch && matchesCategory;
  });

  const filteredOTDR = [...OTDR_IMPAIRMENTS, ...customOTDRItems].filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.description || item.trace_desc).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory ||
                           (activeCategory === 'custom' && item.isCustom);
    return matchesSearch && matchesCategory;
  });

  const getSeverityBadge = (severity) => {
    const config = {
      pass: { color: 'bg-emerald-500', text: 'PASS' },
      marginal: { color: 'bg-amber-500', text: 'MARGINAL' },
      warning: { color: 'bg-orange-500', text: 'WARNING' },
      fail: { color: 'bg-red-500', text: 'FAIL' },
      info: { color: 'bg-blue-500', text: 'INFO' }
    };
    const { color, text } = config[severity] || config.info;
    return <Badge className={`${color} text-white`}>{text}</Badge>;
  };

  const getIcon = (severity) => {
    switch (severity) {
      case 'pass': return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'fail': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning': case 'marginal': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
            <ImageIcon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Impairment Library</h2>
            <p className="text-sm text-gray-500">Visual reference for fiber optic defects</p>
          </div>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search impairments..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 items-center">
        {['all', 'good', 'contamination', 'damage', 'manufacturing', 'artifact', 'custom'].map(cat => (
          <Badge
            key={cat}
            variant={activeCategory === cat ? 'default' : 'outline'}
            className={`cursor-pointer capitalize ${activeCategory === cat ? 'bg-violet-600' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat === 'all' ? 'All Types' : cat === 'custom' ? `My Photos (${customImpairments.length})` : cat}
          </Badge>
        ))}
        <Button size="sm" variant="outline" onClick={() => setShowAddDialog(true)} className="ml-auto">
          <Plus className="h-4 w-4 mr-1" />
          Add Custom
        </Button>
      </div>

      <Tabs defaultValue="scope" className="space-y-6">
        <TabsList className="bg-white dark:bg-gray-800 shadow-lg p-1 rounded-xl">
          <TabsTrigger value="scope" className="rounded-lg">
            <Eye className="h-4 w-4 mr-2" />
            Scope (400x)
          </TabsTrigger>
          <TabsTrigger value="otdr" className="rounded-lg">
            <Zap className="h-4 w-4 mr-2" />
            OTDR Trace
          </TabsTrigger>
        </TabsList>

        {/* Scope Impairments */}
        <TabsContent value="scope">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredScope.map(item => (
              <Card 
                key={item.id}
                className={`border-0 shadow-lg cursor-pointer transition-all hover:shadow-xl hover:scale-[1.02] ${
                  item.severity === 'pass' ? 'ring-1 ring-emerald-200' :
                  item.severity === 'fail' ? 'ring-1 ring-red-200' :
                  'ring-1 ring-gray-100'
                }`}
                onClick={() => setSelectedImpairment(item)}
              >
                <CardContent className="p-4">
                  {/* Visual representation placeholder */}
                  <div className={`aspect-square rounded-xl mb-4 flex items-center justify-center bg-gradient-to-br ${
                    item.colorScheme === 'emerald' ? 'from-emerald-100 to-emerald-200' :
                    item.colorScheme === 'amber' ? 'from-amber-100 to-amber-200' :
                    item.colorScheme === 'orange' ? 'from-orange-100 to-orange-200' :
                    item.colorScheme === 'red' ? 'from-red-100 to-red-200' :
                    'from-gray-100 to-gray-200'
                  }`}>
                    <div className="relative">
                      {/* Simplified fiber end-face visualization */}
                      <div className="w-24 h-24 rounded-full border-4 border-gray-400 bg-gray-200 flex items-center justify-center relative overflow-hidden">
                        {/* Core */}
                        <div className={`w-3 h-3 rounded-full ${
                          item.zones.core.includes('FAIL') || item.zones.core.includes('Scratch') || item.zones.core.includes('Pit') 
                            ? 'bg-red-500' 
                            : item.zones.core === 'Clear' ? 'bg-blue-500' 
                            : 'bg-amber-400'
                        }`} />
                        {/* Impairment indicators */}
                        {item.category === 'contamination' && (
                          <>
                            <div className="absolute top-4 left-6 w-1.5 h-1.5 rounded-full bg-gray-600" />
                            <div className="absolute top-8 right-5 w-1 h-1 rounded-full bg-gray-600" />
                            <div className="absolute bottom-6 left-8 w-2 h-2 rounded-full bg-gray-500" />
                          </>
                        )}
                        {item.id === 'scratches_core' && (
                          <div className="absolute w-full h-0.5 bg-red-500 rotate-45" />
                        )}
                        {item.id === 'scratches_cladding' && (
                          <div className="absolute w-6 h-0.5 bg-orange-500 rotate-12 top-3 right-2" />
                        )}
                        {item.id === 'pitting' && (
                          <>
                            <div className="absolute top-3 left-4 w-2 h-2 rounded-full bg-black" />
                            <div className="absolute bottom-4 right-5 w-1.5 h-1.5 rounded-full bg-black" />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm">{item.name}</h3>
                    {getIcon(item.severity)}
                  </div>
                  
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{item.description}</p>
                  
                  <div className="flex items-center justify-between">
                    {getSeverityBadge(item.severity)}
                    <Badge variant="outline" className="text-xs capitalize">{item.category}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* OTDR Impairments */}
        <TabsContent value="otdr">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOTDR.map(item => (
              <Card 
                key={item.id}
                className={`border-0 shadow-lg cursor-pointer transition-all hover:shadow-xl hover:scale-[1.02] ring-1 ${
                  item.severity === 'pass' ? 'ring-emerald-200' :
                  item.severity === 'fail' ? 'ring-red-200' :
                  'ring-gray-100'
                }`}
                onClick={() => setSelectedImpairment({...item, type: 'otdr'})}
              >
                <CardContent className="p-4">
                  {/* OTDR trace visualization */}
                  <div className={`aspect-video rounded-xl mb-4 bg-gray-900 p-3 relative overflow-hidden`}>
                    <div className="absolute inset-0 flex items-end p-2">
                      {/* Simplified OTDR trace */}
                      <svg viewBox="0 0 100 40" className="w-full h-full">
                        {/* Background grid */}
                        <line x1="0" y1="10" x2="100" y2="10" stroke="#333" strokeWidth="0.5" />
                        <line x1="0" y1="20" x2="100" y2="20" stroke="#333" strokeWidth="0.5" />
                        <line x1="0" y1="30" x2="100" y2="30" stroke="#333" strokeWidth="0.5" />
                        
                        {/* Trace line based on impairment type */}
                        {item.id === 'otdr_good_connector' && (
                          <path d="M0,15 L30,16 L32,5 L34,17 L60,18 L100,19" fill="none" stroke="#4ade80" strokeWidth="1.5" />
                        )}
                        {item.id === 'otdr_dirty_connector' && (
                          <path d="M0,12 L30,14 L32,2 L34,16 L60,18 L100,20" fill="none" stroke="#fbbf24" strokeWidth="1.5" />
                        )}
                        {item.id === 'otdr_bad_connector' && (
                          <path d="M0,10 L30,12 L32,0 L34,18 L60,22 L100,26" fill="none" stroke="#ef4444" strokeWidth="1.5" />
                        )}
                        {item.id === 'otdr_fusion_splice' && (
                          <path d="M0,12 L40,14 L42,15 L44,16 L100,18" fill="none" stroke="#4ade80" strokeWidth="1.5" />
                        )}
                        {item.id === 'otdr_mech_splice' && (
                          <path d="M0,12 L40,14 L42,8 L44,16 L100,18" fill="none" stroke="#fbbf24" strokeWidth="1.5" />
                        )}
                        {item.id === 'otdr_macrobend' && (
                          <path d="M0,12 L40,14 L50,20 L100,22" fill="none" stroke="#fb923c" strokeWidth="1.5" />
                        )}
                        {item.id === 'otdr_fiber_break' && (
                          <path d="M0,10 L50,14 L52,2 L54,35 L100,38" fill="none" stroke="#ef4444" strokeWidth="1.5" />
                        )}
                        {item.id === 'otdr_ghost' && (
                          <path d="M0,12 L20,14 L22,5 L24,15 L40,16 L42,10 L44,16 L100,18" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="2,1" />
                        )}
                        {item.id === 'otdr_gainer' && (
                          <path d="M0,18 L40,20 L42,15 L44,14 L100,16" fill="none" stroke="#60a5fa" strokeWidth="1.5" />
                        )}
                      </svg>
                    </div>
                    <div className="absolute top-2 left-2 text-xs text-green-400 font-mono">OTDR</div>
                  </div>
                  
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm">{item.name}</h3>
                    {getIcon(item.severity)}
                  </div>
                  
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{item.trace_desc}</p>
                  
                  <div className="flex items-center justify-between">
                    {getSeverityBadge(item.severity)}
                    <div className="text-xs font-mono text-gray-500">
                      {item.values.loss}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!selectedImpairment} onOpenChange={() => setSelectedImpairment(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedImpairment && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  {getIcon(selectedImpairment.severity)}
                  <div>
                    <DialogTitle>{selectedImpairment.name}</DialogTitle>
                    <DialogDescription>
                      {selectedImpairment.category} - {getSeverityBadge(selectedImpairment.severity)}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div>
                  <h4 className="font-semibold mb-2">Visual Appearance</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedImpairment.visual || selectedImpairment.trace_desc}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedImpairment.description || selectedImpairment.trace_desc}
                  </p>
                </div>
                
                {selectedImpairment.values && (
                  <div>
                    <h4 className="font-semibold mb-2">Typical Values</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(selectedImpairment.values).map(([key, value]) => (
                        <div key={key} className="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <span className="text-sm capitalize">{key.replace(/_/g, ' ')}:</span>
                          <span className="text-sm font-mono">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedImpairment.zones && (
                  <div>
                    <h4 className="font-semibold mb-2">Zone Analysis</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(selectedImpairment.zones).map(([zone, status]) => (
                        <div key={zone} className="flex justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <span className="text-sm capitalize">{zone}:</span>
                          <span className={`text-sm ${status.includes('FAIL') ? 'text-red-500 font-semibold' : ''}`}>{status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className={`p-4 rounded-lg ${
                  selectedImpairment.severity === 'pass' ? 'bg-emerald-50 dark:bg-emerald-900/20' :
                  selectedImpairment.severity === 'fail' ? 'bg-red-50 dark:bg-red-900/20' :
                  'bg-amber-50 dark:bg-amber-900/20'
                }`}>
                  <h4 className="font-semibold mb-2">Recommended Action</h4>
                  <p className="text-sm">{selectedImpairment.action}</p>
                </div>
                
                {selectedImpairment.criteria && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-semibold mb-2">Pass/Fail Criteria</h4>
                    <p className="text-sm">{selectedImpairment.criteria}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}