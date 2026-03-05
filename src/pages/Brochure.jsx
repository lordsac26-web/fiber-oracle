import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, 
  Calculator, 
  Cable, 
  Activity, 
  Sparkles, 
  BookOpen,
  CheckCircle2,
  Star,
  Smartphone,
  Wifi,
  WifiOff,
  Shield,
  Clock,
  Users,
  ArrowRight,
  ChevronRight,
  Target,
  Layers,
  Stethoscope,
  Download,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';

const FEATURES = [
  {
    icon: Calculator,
    title: 'Power Level Calculator',
    description: 'Instantly estimate ONT receive power for GPON and XGS-PON networks with accurate loss calculations.',
    color: 'from-emerald-500 to-teal-600'
  },
  {
    icon: Layers,
    title: 'Advanced Fiber Locator',
    description: 'Identify any fiber from 12 to 3,456 count cables using TIA-598 color codes. Supports loose tube and ribbon.',
    color: 'from-purple-500 to-pink-600'
  },
  {
    icon: Activity,
    title: 'OLTS & OTDR Wizards',
    description: 'Step-by-step guided testing for Tier-1 and Tier-2 certification with automatic pass/fail analysis.',
    color: 'from-blue-500 to-indigo-600'
  },
  {
    icon: Stethoscope,
    title: 'Fiber Doctor',
    description: 'Interactive troubleshooting flowchart to diagnose and resolve fiber issues quickly in the field.',
    color: 'from-rose-500 to-pink-600'
  },
  {
    icon: Sparkles,
    title: 'AI OTDR Analysis',
    description: 'Upload OTDR traces for AI-powered diagnostics, event identification, and troubleshooting recommendations.',
    color: 'from-violet-500 to-purple-600'
  },
  {
    icon: BookOpen,
    title: 'Education Center',
    description: 'Fiber 101, 102, 103 courses with certifications. Master FTTH and PON technologies at your own pace.',
    color: 'from-green-500 to-emerald-600'
  }
];

const STATS = [
  { value: '15+', label: 'Professional Tools' },
  { value: '3456', label: 'Max Fiber Count' },
  { value: '100%', label: 'Offline Capable' },
  { value: '2025', label: 'Standards Updated' }
];

const TESTIMONIALS = [
  {
    quote: "Finally, all my fiber reference tools in one place. The fiber locator alone saves me 10 minutes per job.",
    author: "Field Technician",
    company: "Regional ISP"
  },
  {
    quote: "The loss budget calculator with built-in standards makes pre-job planning a breeze.",
    author: "Network Engineer",
    company: "Data Center Operator"
  },
  {
    quote: "I use Fiber Doctor every day. It's like having a senior tech in my pocket.",
    author: "Junior Installer",
    company: "FTTH Contractor"
  }
];

export default function Brochure() {
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadBrochurePDF = async () => {
    setIsDownloading(true);
    try {
      const response = await base44.functions.invoke('generatePDF', { 
        type: 'brochure' 
      }, { responseType: 'arraybuffer' });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'FiberOracle-Brochure.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#07071a' }}>
      {/* Fixed Header with Back & Download */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-white/10" style={{ background: 'rgba(7,7,26,0.85)' }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" size="sm" className="gap-2 text-white/70 hover:text-white hover:bg-white/10">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <Button onClick={downloadBrochurePDF} disabled={isDownloading} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isDownloading ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600"></div>
        {/* Fiber optic light streak effect */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="absolute opacity-20" style={{
              left: `${10 + i * 12}%`, top: 0, bottom: 0,
              width: '1px',
              background: `linear-gradient(to bottom, transparent, rgba(167,139,250,0.8), transparent)`,
              transform: `rotate(${-5 + i * 2}deg)`,
            }} />
          ))}
        </div>
        
        <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-32">
          <div className="text-center">
            <Badge className="bg-white/10 text-white border-white/20 backdrop-blur-sm mb-6 px-4 py-1">
              <Zap className="h-3 w-3 mr-1" />
              Version 2.0 • Built for Professionals
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 drop-shadow-lg">
              Fiber Oracle
            </h1>
            
            <p className="text-xl md:text-2xl text-white/90 mb-4 max-w-2xl mx-auto">
              When You Need to Know, Ask the Oracle
            </p>
            
            <p className="text-lg text-white/70 mb-10 max-w-xl mx-auto">
              Power calculations, fiber identification, testing wizards, and comprehensive references — all in one offline-capable app.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to={createPageUrl('Home')}>
                <Button size="lg" className="bg-white text-indigo-700 hover:bg-white/90 shadow-xl font-semibold">
                  <Zap className="h-5 w-5 mr-2" />
                  Launch App
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <Link to={createPageUrl('Fiber101')}>
                <Button size="lg" variant="outline" className="border-2 border-white/60 text-white hover:bg-white/10 transition-all">
                  <BookOpen className="h-5 w-5 mr-2" />
                  Education Quick Start
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 80L60 70C120 60 240 40 360 30C480 20 600 20 720 25C840 30 960 40 1080 45C1200 50 1320 50 1380 50L1440 50V80H0Z" fill="#07071a"/>
          </svg>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-12" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-indigo-400">
                  {stat.value}
                </div>
                <div className="text-sm text-white/50 mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-indigo-500/20 text-indigo-300 border-indigo-500/30">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Everything You Need in the Field
            </h2>
            <p className="text-lg text-white/50 max-w-2xl mx-auto">
              From quick power calculations to comprehensive testing wizards, Fiber Oracle has you covered.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <div key={i} className="rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all group cursor-default" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)' }}>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-white/50">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="py-20" style={{ background: 'rgba(99,102,241,0.05)' }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-blue-500/20 text-blue-300 border-blue-500/30">Why Fiber Oracle?</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Built by Fiber Techs, For Fiber Techs
              </h2>
              
              <div className="space-y-4">
                {[
                  { icon: WifiOff, title: 'Works Offline', desc: 'Full functionality without internet connection' },
                  { icon: Smartphone, title: 'Mobile-First Design', desc: 'Optimized for field use on any device' },
                  { icon: Clock, title: 'Save Time', desc: 'No more flipping through reference books' },
                  { icon: Shield, title: 'Industry Standards', desc: 'TIA, IEEE, ITU-T, and IEC compliant values' },
                  { icon: Target, title: 'Accurate Calculations', desc: 'Current 2025 specifications and standards' },
                ].map((benefit, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-indigo-500/20 border border-indigo-500/20">
                      <benefit.icon className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{benefit.title}</h4>
                      <p className="text-sm text-white/50">{benefit.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-0.5">
                <div className="rounded-[14px] p-6" style={{ background: '#0d0d2b' }}>
                  <div className="space-y-3">
                    {[
                      { bg: 'bg-emerald-500', Icon: Zap, title: 'Power Level Calc', sub: 'GPON & XGS-PON', badge: 'Quick', badgeCls: 'bg-emerald-500/20 text-emerald-300' },
                      { bg: 'bg-purple-500', Icon: Layers, title: 'Fiber Locator', sub: 'Up to 3456 fibers', badge: 'New', badgeCls: 'bg-purple-500/20 text-purple-300' },
                      { bg: 'bg-blue-500', Icon: Activity, title: 'OTDR Wizard', sub: 'Tier-2 Testing', badge: 'Pro', badgeCls: 'bg-blue-500/20 text-blue-300' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center`}>
                          <item.Icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="font-medium text-white text-sm">{item.title}</div>
                          <div className="text-xs text-white/40">{item.sub}</div>
                        </div>
                        <Badge className={`ml-auto text-xs ${item.badgeCls} border-0`}>{item.badge}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-500/20 text-purple-300 border-purple-500/30">Testimonials</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Trusted by Fiber Professionals
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((testimonial, i) => (
              <div key={i} className="rounded-2xl p-6 border border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-white/60 mb-4 italic">
                  "{testimonial.quote}"
                </p>
                <div>
                  <div className="font-semibold text-white">{testimonial.author}</div>
                  <div className="text-sm text-white/40">{testimonial.company}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Streamline Your Fiber Work?
          </h2>
          <p className="text-xl text-white/80 mb-10">
            Start using Fiber Oracle today — it's free and works on any device.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to={createPageUrl('Home')}>
              <Button size="lg" className="bg-white text-indigo-700 hover:bg-white/90 shadow-xl font-semibold">
                <Zap className="h-5 w-5 mr-2" />
                Launch Fiber Oracle
                <ChevronRight className="h-5 w-5 ml-1" />
              </Button>
            </Link>
            <Link to={createPageUrl('UserGuide')}>
              <Button size="lg" variant="outline" className="border-2 border-white/60 text-white hover:bg-white/10 transition-all">
                <BookOpen className="h-5 w-5 mr-2" />
                Read the User Guide
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10" style={{ background: '#050514' }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6927bc307b96037b8506c608/66efc74e1_fiberoraclenew.png" 
                alt="Fiber Oracle" 
                className="w-10 h-10 rounded-xl object-cover"
              />
              <div>
                <div className="font-bold text-white">Fiber Oracle</div>
                <div className="text-xs text-white/40">Field Reference Tool v2.0</div>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-white/40">
              <Link to={createPageUrl('Fiber101')} className="hover:text-white transition-colors">Education</Link>
              <Link to={createPageUrl('UserGuide')} className="hover:text-white transition-colors">User Guide</Link>
              <Link to={createPageUrl('Home')} className="hover:text-white transition-colors">Launch App</Link>
            </div>
            <div className="text-sm text-white/30">
              © 2025 Fiber Oracle
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}