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
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Fiber Oracle!',
    description: 'Your complete field reference tool for fiber optic professionals. Let\'s take a quick tour of what\'s available.',
    icon: Zap,
    color: 'from-indigo-500 to-purple-600',
  },
  {
    id: 'calculators',
    title: 'Powerful Calculators',
    description: 'Instantly calculate power levels, loss budgets, splitter losses, and bend radius requirements. All values follow TIA/IEEE standards.',
    icon: Calculator,
    color: 'from-emerald-500 to-teal-600',
    features: ['Power Level Calculator', 'Loss Budget Calculator', 'Splitter Loss Tables', 'Bend Radius Guide']
  },
  {
    id: 'testing',
    title: 'Testing Wizards',
    description: 'Step-by-step guided testing procedures for OLTS Tier-1 and OTDR Tier-2 certification with automatic pass/fail analysis.',
    icon: Activity,
    color: 'from-blue-500 to-indigo-600',
    features: ['OLTS Tier-1 Wizard', 'OTDR Tier-2 Wizard', 'Cleaning & Inspection', 'Job Reports']
  },
  {
    id: 'troubleshooting',
    title: 'Smart Troubleshooting',
    description: 'Fiber Doctor guides you through interactive flowcharts to diagnose issues. AI OTDR Analysis helps identify trace anomalies.',
    icon: Stethoscope,
    color: 'from-rose-500 to-pink-600',
    features: ['Fiber Doctor Flowchart', 'AI OTDR Analysis (Beta)', 'Impairment Library']
  },
  {
    id: 'reference',
    title: 'Quick Reference',
    description: 'Access fiber color codes, PON power specifications, attenuation tables, and industry standards instantly.',
    icon: Cable,
    color: 'from-orange-500 to-amber-600',
    features: ['Fiber Locator (TIA-598)', 'PON Power Levels', 'Reference Tables', 'LCP/CLCP Database']
  },
  {
    id: 'education',
    title: 'Education Center',
    description: 'Learn with Fiber 101, 102, and 103 courses. Take certification exams and download study guides.',
    icon: GraduationCap,
    color: 'from-green-500 to-emerald-600',
    features: ['Fiber 101-103 Courses', 'Certification Exams', 'Study Guides', 'Downloadable Certificates']
  },
  {
    id: 'customize',
    title: 'Make It Yours',
    description: 'Customize your experience in Settings. Hide modules you don\'t need, set custom test values, and toggle dark mode.',
    icon: Settings,
    color: 'from-slate-500 to-gray-600',
    features: ['Hide/Show Modules', 'Custom Test Values', 'Dark Mode', 'Company Branding']
  },
  {
    id: 'ready',
    title: 'You\'re Ready!',
    description: 'That\'s it! Start exploring Fiber Oracle. You can always restart this tour from Settings.',
    icon: Sparkles,
    color: 'from-violet-500 to-purple-600',
  },
];

export default function OnboardingTour({ isOpen, onClose, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = TOUR_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

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
                    Step {currentStep + 1} of {TOUR_STEPS.length}
                  </Badge>
                  <h2 className="text-xl font-bold">{step.title}</h2>
                </div>
              </div>
            </div>

            <CardContent className="p-6">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {step.description}
              </p>

              {step.features && (
                <div className="mb-6">
                  <p className="text-sm font-medium text-gray-500 mb-2">Includes:</p>
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

              {/* Progress dots */}
              <div className="flex justify-center gap-1.5 mb-6">
                {TOUR_STEPS.map((_, i) => (
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