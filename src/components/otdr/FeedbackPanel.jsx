import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare,
  CheckCircle2,
  Send,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

const IMPAIRMENT_TYPES = [
  'Dirty Connector',
  'Damaged Connector',
  'Poor Splice',
  'Macrobend',
  'Microbend',
  'Fiber Break',
  'Ghost/Artifact',
  'End of Fiber',
  'Splitter',
  'Other'
];

export default function FeedbackPanel({ eventAnalysis, onFeedbackSubmit }) {
  const [feedbackType, setFeedbackType] = useState(null); // 'correct', 'incorrect', 'partial'
  const [correctedType, setCorrectedType] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    const feedback = {
      event_number: eventAnalysis?.event_number,
      ai_diagnosis: eventAnalysis?.identified_type,
      ai_confidence: eventAnalysis?.confidence_score,
      feedback_type: feedbackType,
      corrected_type: feedbackType === 'incorrect' ? correctedType : null,
      technician_notes: notes,
      timestamp: new Date().toISOString()
    };

    if (onFeedbackSubmit) {
      onFeedbackSubmit(feedback);
    }

    setSubmitted(true);
    toast.success('Feedback submitted! This helps improve AI accuracy.');
  };

  if (submitted) {
    return (
      <Card className="border-2 border-green-200 bg-green-50 dark:bg-green-900/20">
        <CardContent className="p-4 text-center">
          <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <p className="font-medium text-green-700 dark:text-green-300">Thank you for your feedback!</p>
          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
            This helps improve our AI analysis for all technicians.
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3"
            onClick={() => {
              setSubmitted(false);
              setFeedbackType(null);
              setCorrectedType('');
              setNotes('');
            }}
          >
            Submit More Feedback
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!eventAnalysis) {
    return (
      <Card className="border-dashed border-2 border-gray-300">
        <CardContent className="p-4 text-center text-gray-500">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Select an event to provide feedback</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-purple-200 bg-purple-50 dark:bg-purple-900/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-purple-600" />
          Technician Feedback
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
          <div className="text-sm text-gray-500 mb-1">AI Diagnosis:</div>
          <div className="flex items-center justify-between">
            <span className="font-medium">{eventAnalysis.identified_type}</span>
            {eventAnalysis.confidence_score && (
              <Badge variant="outline">
                {eventAnalysis.confidence_score}% confidence
              </Badge>
            )}
          </div>
        </div>

        <div>
          <Label className="text-sm mb-2 block">Was this diagnosis correct?</Label>
          <div className="flex gap-2">
            <Button
              variant={feedbackType === 'correct' ? 'default' : 'outline'}
              size="sm"
              className={feedbackType === 'correct' ? 'bg-green-600 hover:bg-green-700' : ''}
              onClick={() => setFeedbackType('correct')}
            >
              <ThumbsUp className="h-4 w-4 mr-1" />
              Correct
            </Button>
            <Button
              variant={feedbackType === 'partial' ? 'default' : 'outline'}
              size="sm"
              className={feedbackType === 'partial' ? 'bg-amber-500 hover:bg-amber-600' : ''}
              onClick={() => setFeedbackType('partial')}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Partially
            </Button>
            <Button
              variant={feedbackType === 'incorrect' ? 'default' : 'outline'}
              size="sm"
              className={feedbackType === 'incorrect' ? 'bg-red-600 hover:bg-red-700' : ''}
              onClick={() => setFeedbackType('incorrect')}
            >
              <ThumbsDown className="h-4 w-4 mr-1" />
              Incorrect
            </Button>
          </div>
        </div>

        {feedbackType === 'incorrect' && (
          <div>
            <Label className="text-sm mb-2 block">What was the actual issue?</Label>
            <Select value={correctedType} onValueChange={setCorrectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Select correct impairment type" />
              </SelectTrigger>
              <SelectContent>
                {IMPAIRMENT_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label className="text-sm mb-2 block">Additional notes (optional)</Label>
          <Textarea
            placeholder="Any additional context or observations..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        <Button 
          className="w-full" 
          onClick={handleSubmit}
          disabled={!feedbackType || (feedbackType === 'incorrect' && !correctedType)}
        >
          <Send className="h-4 w-4 mr-2" />
          Submit Feedback
        </Button>
      </CardContent>
    </Card>
  );
}