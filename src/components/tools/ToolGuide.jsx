import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  HelpCircle,
  X,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Play
} from 'lucide-react';

export default function ToolGuide({ guide, isOpen, onClose }) {
  const [currentStep, setCurrentStep] = React.useState(0);

  if (!guide) return null;

  const currentStepData = guide.steps?.[currentStep];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-600" />
            {guide.title}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)]">
          <div className="space-y-4 pr-4">
            {/* Overview */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h3 className="font-semibold text-sm mb-2">Purpose</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">{guide.purpose}</p>
            </div>

            {/* Use Cases */}
            {guide.useCases && (
              <div>
                <h3 className="font-semibold text-sm mb-2">Common Use Cases</h3>
                <ul className="space-y-2">
                  {guide.useCases.map((useCase, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">{useCase}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Step-by-Step Guide */}
            {guide.steps && guide.steps.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Step-by-Step Guide</h3>
                  <Badge variant="outline">
                    Step {currentStep + 1} of {guide.steps.length}
                  </Badge>
                </div>

                <Card className="border-2 border-blue-200 dark:border-blue-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{currentStepData.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {currentStepData.description}
                    </p>

                    {/* Visual Aid */}
                    {currentStepData.imageUrl && (
                      <div className="rounded-lg overflow-hidden border">
                        <img 
                          src={currentStepData.imageUrl} 
                          alt={currentStepData.title}
                          className="w-full"
                        />
                      </div>
                    )}

                    {/* Tips */}
                    {currentStepData.tips && (
                      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-1">
                              Pro Tip
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                              {currentStepData.tips}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Common Mistakes */}
                    {currentStepData.commonMistakes && (
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-red-800 dark:text-red-200 mb-1">
                              Common Mistake to Avoid
                            </p>
                            <p className="text-xs text-red-700 dark:text-red-300">
                              {currentStepData.commonMistakes}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                    disabled={currentStep === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentStep(Math.min(guide.steps.length - 1, currentStep + 1))}
                    disabled={currentStep === guide.steps.length - 1}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Example Scenario */}
            {guide.exampleScenario && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Play className="w-4 h-4 text-purple-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-sm mb-2 text-purple-900 dark:text-purple-200">
                      Example Scenario
                    </h3>
                    <p className="text-sm text-purple-800 dark:text-purple-300 mb-2">
                      {guide.exampleScenario.description}
                    </p>
                    {guide.exampleScenario.inputs && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                          Sample Inputs:
                        </p>
                        {Object.entries(guide.exampleScenario.inputs).map(([key, value]) => (
                          <div key={key} className="text-xs text-purple-700 dark:text-purple-300 ml-2">
                            • {key}: <span className="font-mono font-semibold">{value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Field Reference */}
            {guide.fieldReference && (
              <div>
                <h3 className="font-semibold text-sm mb-2">Field Reference</h3>
                <div className="space-y-2">
                  {guide.fieldReference.map((field, idx) => (
                    <div key={idx} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{field.name}</span>
                        {field.required && (
                          <Badge variant="destructive" className="text-xs">Required</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        {field.description}
                      </p>
                      {field.example && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          Example: <span className="font-mono">{field.example}</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>Got it!</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper component for inline help tooltips
export function FieldHelp({ content }) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
      >
        <HelpCircle className="w-3 h-3 text-blue-600 dark:text-blue-400" />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 left-0 bottom-full mb-2 w-64 p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg text-xs"
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}