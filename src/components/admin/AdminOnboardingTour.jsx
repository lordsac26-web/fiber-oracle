import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, ChevronRight, ChevronLeft, CheckCircle, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const tourSteps = [
  {
    id: 'welcome',
    title: 'Welcome to the Admin Panel',
    description: 'Let\'s take a quick tour of the powerful admin features available to you.',
    icon: Sparkles,
    position: 'center'
  },
  {
    id: 'overview-tab',
    title: 'Overview Dashboard',
    description: 'Monitor pending requests, document submissions, and recent approvals at a glance.',
    target: '[data-tour="overview-tab"]',
    position: 'bottom'
  },
  {
    id: 'document-management',
    title: 'Document Management',
    description: 'Upload, activate, deactivate, or remove documents from the P.H.O.T.O.N. knowledge base. Bulk actions are available for efficiency.',
    target: '[data-tour="document-section"]',
    position: 'top'
  },
  {
    id: 'audit-trail',
    title: 'Audit Trail',
    description: 'Track all document management actions with advanced filtering. See who did what and when.',
    target: '[data-tour="audit-section"]',
    position: 'top'
  },
  {
    id: 'conversations',
    title: 'Conversation History',
    description: 'View and manage P.H.O.T.O.N. conversations. Search, filter, and bulk delete test or unwanted conversations.',
    target: '[data-tour="conversations-section"]',
    position: 'top'
  },
  {
    id: 'users-tab',
    title: 'User Management',
    description: 'View all users, their roles, and activity. Manage admin permissions and user access.',
    target: '[data-tour="users-tab"]',
    position: 'bottom'
  },
  {
    id: 'analytics-tab',
    title: 'Analytics & Insights',
    description: 'Track document usage, AI performance, and user engagement metrics.',
    target: '[data-tour="analytics-tab"]',
    position: 'bottom'
  },
  {
    id: 'health-tab',
    title: 'System Health',
    description: 'Monitor real-time system performance, response times, error rates, and active sessions.',
    target: '[data-tour="health-tab"]',
    position: 'bottom'
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'You can restart this tour anytime from your settings. Happy administrating!',
    icon: CheckCircle,
    position: 'center'
  }
];

export default function AdminOnboardingTour({ onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(true);
  const [targetPosition, setTargetPosition] = useState(null);

  const step = tourSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;
  const isCenterStep = step.position === 'center';

  useEffect(() => {
    if (!isCenterStep && step.target) {
      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetPosition(rect);
        
        // Scroll element into view smoothly
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Add highlight
        element.classList.add('tour-highlight');
        return () => element.classList.remove('tour-highlight');
      }
    }
  }, [currentStep, step.target, isCenterStep]);

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    setIsOpen(false);
    try {
      const user = await base44.auth.me();
      await base44.auth.updateMe({ admin_tour_completed: true });
      onComplete?.();
    } catch (error) {
      console.error('Failed to save tour completion:', error);
      onComplete?.();
    }
  };

  const handleSkip = async () => {
    setIsOpen(false);
    try {
      const user = await base44.auth.me();
      await base44.auth.updateMe({ admin_tour_completed: true });
      onSkip?.();
    } catch (error) {
      console.error('Failed to skip tour:', error);
      onSkip?.();
    }
  };

  if (!isOpen) return null;

  // Center dialog for welcome and complete steps
  if (isCenterStep) {
    const StepIcon = step.icon;
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
                <StepIcon className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">{step.title}</DialogTitle>
            <DialogDescription className="text-center text-slate-300">
              {step.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {!isLastStep && (
              <Button variant="outline" onClick={handleSkip} className="border-slate-600 text-slate-300 hover:bg-slate-700">
                Skip Tour
              </Button>
            )}
            <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700">
              {isLastStep ? 'Get Started' : 'Start Tour'}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Positioned tooltip for feature steps
  const tooltipStyle = targetPosition ? {
    position: 'fixed',
    left: step.position === 'bottom' || step.position === 'top' 
      ? `${targetPosition.left + targetPosition.width / 2}px`
      : step.position === 'right' ? `${targetPosition.right + 20}px` : `${targetPosition.left - 320}px`,
    top: step.position === 'bottom' 
      ? `${targetPosition.bottom + 20}px`
      : step.position === 'top' ? `${targetPosition.top - 200}px` : `${targetPosition.top}px`,
    transform: (step.position === 'bottom' || step.position === 'top') ? 'translateX(-50%)' : 'none',
    zIndex: 9999
  } : {};

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" onClick={handleSkip} />
      
      {/* Spotlight effect */}
      {targetPosition && (
        <div
          className="fixed pointer-events-none z-[9997]"
          style={{
            left: targetPosition.left - 8,
            top: targetPosition.top - 8,
            width: targetPosition.width + 16,
            height: targetPosition.height + 16,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
            borderRadius: '8px'
          }}
        />
      )}

      {/* Tooltip Card */}
      <Card 
        className="w-80 bg-slate-800 border-blue-500/50 shadow-2xl z-[9999]"
        style={tooltipStyle}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/50">
              Step {currentStep + 1} of {tourSteps.length}
            </Badge>
            <button
              onClick={handleSkip}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <h3 className="text-white font-semibold text-lg mb-2">{step.title}</h3>
          <p className="text-slate-300 text-sm mb-4">{step.description}</p>
          
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={isFirstStep}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            
            <Button
              size="sm"
              onClick={handleNext}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLastStep ? 'Finish' : 'Next'}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Global styles for highlight */}
      <style jsx global>{`
        .tour-highlight {
          position: relative;
          z-index: 9999;
          border-radius: 8px;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5);
          animation: pulse-highlight 2s ease-in-out infinite;
        }
        
        @keyframes pulse-highlight {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.3);
          }
        }
      `}</style>
    </>
  );
}