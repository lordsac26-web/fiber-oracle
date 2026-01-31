import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  X, 
  ChevronRight, 
  ChevronLeft,
  Calculator,
  Activity,
  Stethoscope,
  BookOpen,
  Cable,
  Sparkles,
  GraduationCap,
  Settings,
  Zap,
  MessageSquare,
  Upload,
  Shield,
  Eye,
  FileText,
  Brain
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';

const getTourSteps = (isAdmin) => {
  const baseSteps = [
    {
      id: 'welcome',
      title: 'Welcome to Fiber Oracle!',
      description: 'Your complete field reference tool for fiber optic professionals. Let\'s take a quick tour of the core features.',
      icon: Zap,
      color: 'from-indigo-500 to-purple-600',
    },
    {
      id: 'photon',
      title: 'Meet P.H.O.T.O.N.',
      description: 'Your AI technical assistant. Ask questions, troubleshoot issues, and get expert guidance in natural language.',
      icon: Brain,
      color: 'from-cyan-400 to-blue-600',
      actionButton: {
        label: 'Try P.H.O.T.O.N.',
        link: 'PhotonChat',
        icon: MessageSquare
      },
      features: [
        'Natural language queries',
        'Real-time troubleshooting',
        'Document Q&A',
        'Conversation history'
      ],
      visualGuide: {
        steps: [
          '1. Click any module to access tools',
          '2. Or start a P.H.O.T.O.N. chat',
          '3. Ask: "How do I test fiber loss?"',
          '4. Get instant expert answers'
        ]
      }
    },
    {
      id: 'upload-docs',
      title: 'Upload Reference Documents',
      description: 'Add PDFs, websites, or Google Drive files to expand P.H.O.T.O.N.\'s knowledge base.',
      icon: Upload,
      color: 'from-emerald-500 to-teal-600',
      actionButton: {
        label: 'Upload Documents',
        link: 'PhotonChat',
        icon: Upload
      },
      features: [
        'PDF manuals & datasheets',
        'Website content',
        'Google Drive integration',
        'Searchable knowledge base'
      ],
      visualGuide: {
        steps: [
          '1. Open P.H.O.T.O.N. chat',
          '2. Click upload icon (top right)',
          '3. Choose PDF, URL, or Drive',
          '4. Documents auto-indexed for AI'
        ]
      }
    },
    {
      id: 'modules',
      title: 'Powerful Tools',
      description: 'Calculators, testing wizards, troubleshooting flowcharts, and reference tables—all at your fingertips.',
      icon: Calculator,
      color: 'from-purple-500 to-pink-600',
      features: [
        'Optical calculators',
        'OLTS/OTDR testing wizards', 
        'Fiber Doctor diagnostics',
        'PON PM analysis'
      ]
    },
    {
      id: 'customize',
      title: 'Personalize Your Experience',
      description: 'Hide modules you don\'t need, toggle dark mode, and customize your dashboard.',
      icon: Eye,
      color: 'from-slate-500 to-gray-600',
      actionButton: {
        label: 'Open Settings',
        link: 'Settings',
        icon: Settings
      },
      features: [
        'Hide/show modules',
        'Dark mode toggle',
        'Custom test values',
        'Company branding'
      ]
    }
  ];

  const adminSteps = [
    {
      id: 'admin-panel',
      title: 'Admin Control Panel',
      description: 'As an admin, you have access to the Control Panel for managing users, documents, and system settings.',
      icon: Shield,
      color: 'from-purple-600 to-indigo-600',
      actionButton: {
        label: 'Open Control Panel',
        link: 'AdminPanel',
        icon: Shield
      },
      features: [
        'User management',
        'Document approval',
        'System analytics',
        'Data management'
      ],
      visualGuide: {
        steps: [
          '1. Look for purple bar at top',
          '2. Click "Control Panel" link',
          '3. Review pending documents',
          '4. Monitor system health'
        ]
      },
      isAdminOnly: true
    }
  ];

  const finalStep = {
    id: 'ready',
    title: 'You\'re All Set!',
    description: 'Start exploring Fiber Oracle. You can restart this tour anytime from Settings.',
    icon: Sparkles,
    color: 'from-violet-500 to-purple-600',
  };

  if (isAdmin) {
    return [...baseSteps, ...adminSteps, finalStep];
  }
  
  return [...baseSteps, finalStep];
};

export default function OnboardingTour({ isOpen, onClose, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tourSteps, setTourSteps] = useState([]);

  // Check admin status
  useEffect(() => {
    base44.auth.me().then(user => {
      const adminStatus = user?.role === 'admin';
      setIsAdmin(adminStatus);
      setTourSteps(getTourSteps(adminStatus));
    }).catch(() => {
      setTourSteps(getTourSteps(false));
    });
  }, []);

  const step = tourSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;

  if (!step) return null;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleSkip}
      />

      {/* Tour Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md"
        >
          <Card className="border-0 shadow-2xl overflow-hidden">
            {/* Header with gradient */}
            <div className={`bg-gradient-to-r ${step.color} p-6 text-white relative`}>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleSkip}
                className="absolute top-2 right-2 text-white/80 hover:text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
              
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <step.icon className="h-8 w-8" />
                </div>
                <div>
                  <Badge className="bg-white/20 text-white border-0 mb-1">
                    Step {currentStep + 1} of {tourSteps.length}
                  </Badge>
                  <h2 className="text-xl font-bold">{step.title}</h2>
                </div>
              </div>
            </div>

            <CardContent className="p-6">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {step.description}
              </p>

              {/* Action Button */}
              {step.actionButton && (
                <Link to={createPageUrl(step.actionButton.link)}>
                  <Button 
                    className={`w-full mb-4 bg-gradient-to-r ${step.color} hover:opacity-90 text-white`}
                    onClick={() => {
                      onClose();
                      setTimeout(() => {
                        onComplete();
                      }, 300);
                    }}
                  >
                    <step.actionButton.icon className="h-4 w-4 mr-2" />
                    {step.actionButton.label}
                  </Button>
                </Link>
              )}

              {/* Visual Guide */}
              {step.visualGuide && (
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    Quick Start Guide:
                  </p>
                  <div className="space-y-1">
                    {step.visualGuide.steps.map((guideStep, i) => (
                      <p key={i} className="text-xs text-blue-600 dark:text-blue-400">
                        {guideStep}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {step.features && (
                <div className="mb-6">
                  <p className="text-sm font-medium text-gray-500 mb-2">Key Features:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {step.features.map((feature, i) => (
                      <div 
                        key={i}
                        className="flex items-center gap-2 text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${step.color}`} />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin badge */}
              {step.isAdminOnly && (
                <Badge className="mb-4 bg-purple-100 text-purple-700 border-purple-300">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin Feature
                </Badge>
              )}

              {/* Progress dots */}
              <div className="flex justify-center gap-1.5 mb-6">
                {tourSteps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentStep(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === currentStep 
                        ? 'w-6 bg-blue-600' 
                        : i < currentStep 
                          ? 'bg-blue-300' 
                          : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                ))}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between">
                <Button 
                  variant="ghost" 
                  onClick={handleSkip}
                  className="text-gray-500"
                >
                  Skip Tour
                </Button>
                
                <div className="flex gap-2">
                  {!isFirstStep && (
                    <Button variant="outline" onClick={handlePrev}>
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                  )}
                  <Button onClick={handleNext} className={`bg-gradient-to-r ${step.color}`}>
                    {isLastStep ? 'Get Started' : 'Next'}
                    {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}