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
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Fixed Header with Back & Download */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-b border-gray-200/50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" size="sm" className="gap-2">
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
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500"></div>
        <div className="absolute inset-0 opacity-30" style={{backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"}}></div>
        
        <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-32">
          <div className="text-center">
            <Badge className="bg-white/10 text-white border-white/20 backdrop-blur-sm mb-6 px-4 py-1">
              <Zap className="h-3 w-3 mr-1" />
              Version 2.0 • Built for Professionals
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
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
                <Button size="lg" className="bg-white text-indigo-600 hover:bg-gray-100 shadow-xl">
                  <Zap className="h-5 w-5 mr-2" />
                  Launch App
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <Link to={createPageUrl('Fiber101')}>
                <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-indigo-600 transition-all">
                  <BookOpen className="h-5 w-5 mr-2" />
                  Education Quick Start
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white" className="dark:fill-gray-900"/>
          </svg>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-12 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-indigo-600 dark:text-indigo-400">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
            <Badge className="mb-4 bg-indigo-100 text-indigo-700 border-indigo-200">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Everything You Need in the Field
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              From quick power calculations to comprehensive testing wizards, Fiber Oracle has you covered.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <Card key={i} className="border-0 shadow-lg hover:shadow-xl transition-shadow group">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">Why Fiber Oracle?</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
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
                    <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                      <benefit.icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">{benefit.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{benefit.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-1">
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
                        <Zap className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-medium">Power Level Calc</div>
                        <div className="text-xs text-gray-500">GPON & XGS-PON</div>
                      </div>
                      <Badge className="ml-auto bg-emerald-100 text-emerald-700">Quick</Badge>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
                        <Layers className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-medium">Fiber Locator</div>
                        <div className="text-xs text-gray-500">Up to 3456 fibers</div>
                      </div>
                      <Badge className="ml-auto bg-purple-100 text-purple-700">New</Badge>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                        <Activity className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-medium">OTDR Wizard</div>
                        <div className="text-xs text-gray-500">Tier-2 Testing</div>
                      </div>
                      <Badge className="ml-auto bg-blue-100 text-blue-700">Pro</Badge>
                    </div>
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
            <Badge className="mb-4 bg-purple-100 text-purple-700 border-purple-200">Testimonials</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Trusted by Fiber Professionals
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((testimonial, i) => (
              <Card key={i} className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-4 italic">
                    "{testimonial.quote}"
                  </p>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">{testimonial.author}</div>
                    <div className="text-sm text-gray-500">{testimonial.company}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Streamline Your Fiber Work?
          </h2>
          <p className="text-xl text-white/80 mb-10">
            Start using Fiber Oracle today — it's free and works on any device.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to={createPageUrl('Home')}>
              <Button size="lg" className="bg-white text-indigo-600 hover:bg-gray-100 shadow-xl">
                <Zap className="h-5 w-5 mr-2" />
                Launch Fiber Oracle
                <ChevronRight className="h-5 w-5 ml-1" />
              </Button>
            </Link>
            <Link to={createPageUrl('Manual')}>
              <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-indigo-600 transition-all">
                <BookOpen className="h-5 w-5 mr-2" />
                Read the Manual
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6927bc307b96037b8506c608/66efc74e1_fiberoraclenew.png" 
                alt="Fiber Oracle" 
                className="w-10 h-10 rounded-xl object-cover"
              />
              <div>
                <div className="font-bold">Fiber Oracle</div>
                <div className="text-xs text-gray-400">Field Reference Tool v2.0</div>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <Link to={createPageUrl('Fiber101')} className="hover:text-white transition-colors">
                                    Education Quick Start
                                  </Link>
              <Link to={createPageUrl('Manual')} className="hover:text-white transition-colors">
                Manual
              </Link>
              <Link to={createPageUrl('Home')} className="hover:text-white transition-colors">
                Launch App
              </Link>
            </div>
            <div className="text-sm text-gray-400">
              © 2025 Fiber Oracle
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}