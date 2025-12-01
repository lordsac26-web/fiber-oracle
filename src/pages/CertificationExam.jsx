import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  ArrowRight,
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  Award,
  Download,
  RotateCcw,
  BookOpen,
  Target,
  Trophy,
  FileText,
  ChevronRight,
  Timer,
  HelpCircle,
  Eye
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { EXAM_QUESTIONS } from '@/components/education/ExamQuestions';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';

// Shuffle array function
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function CertificationExam() {
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('course') || 'fiber101';
  const examData = EXAM_QUESTIONS[courseId];
  
  const [stage, setStage] = useState('intro'); // intro, exam, results
  const [learnerName, setLearnerName] = useState('');
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [examStartTime, setExamStartTime] = useState(null);
  const [showExplanation, setShowExplanation] = useState({});
  const [examResults, setExamResults] = useState(null);
  const timerRef = useRef(null);

  // Initialize exam
  useEffect(() => {
    if (examData) {
      // Shuffle questions and their options
      const shuffledQuestions = shuffleArray(examData.questions).map(q => {
        if (q.type === 'single' || q.type === 'scenario') {
          // Shuffle options and track new correct answer position
          const optionsWithIndex = q.options.map((opt, idx) => ({ opt, isCorrect: idx === q.correctAnswer }));
          const shuffledOptions = shuffleArray(optionsWithIndex);
          const newCorrectIndex = shuffledOptions.findIndex(o => o.isCorrect);
          return {
            ...q,
            options: shuffledOptions.map(o => o.opt),
            correctAnswer: newCorrectIndex,
            originalCorrectAnswer: q.correctAnswer
          };
        }
        return q;
      });
      setQuestions(shuffledQuestions);
      setTimeRemaining(examData.timeLimit * 60);
    }
  }, [courseId]);

  // Timer
  useEffect(() => {
    if (stage === 'exam' && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            submitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [stage]);

  const startExam = () => {
    if (!learnerName.trim()) {
      alert('Please enter your name to continue.');
      return;
    }
    setExamStartTime(new Date());
    setStage('exam');
  };

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const submitExam = () => {
    clearInterval(timerRef.current);
    
    let correct = 0;
    let incorrect = 0;
    const domainScores = {};
    
    questions.forEach(q => {
      const userAnswer = answers[q.id];
      let isCorrect = false;
      
      if (q.type === 'single' || q.type === 'scenario') {
        isCorrect = userAnswer === q.correctAnswer;
      } else if (q.type === 'truefalse') {
        isCorrect = userAnswer === q.correctAnswer;
      } else if (q.type === 'fillin') {
        isCorrect = q.correctAnswer.some(ca => 
          ca.toLowerCase().trim() === (userAnswer || '').toLowerCase().trim()
        );
      }
      
      if (isCorrect) correct++;
      else incorrect++;
      
      // Track domain scores
      if (!domainScores[q.domain]) {
        domainScores[q.domain] = { correct: 0, total: 0 };
      }
      domainScores[q.domain].total++;
      if (isCorrect) domainScores[q.domain].correct++;
    });
    
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= examData.passingScore;
    
    const results = {
      score,
      correct,
      incorrect,
      total: questions.length,
      passed,
      domainScores,
      completionDate: new Date().toLocaleDateString(),
      certificateId: `FO-${courseId.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
    };
    
    setExamResults(results);
    
    // Save to database
    base44.entities.Certification.create({
      course_id: courseId,
      course_title: examData.title.replace(' Certification Exam', ''),
      learner_name: learnerName,
      score,
      passed,
      certificate_id: results.certificateId,
      completion_date: new Date().toISOString().split('T')[0],
      domain_scores: domainScores
    });
    
    setStage('results');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const downloadCertificate = () => {
    const certWindow = window.open('', '_blank');
    certWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Certificate of Completion</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Open+Sans:wght@400;600&display=swap');
          
          body { 
            font-family: 'Open Sans', sans-serif; 
            margin: 0; 
            padding: 40px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: #f5f5f5;
          }
          
          .certificate {
            width: 900px;
            padding: 60px;
            background: white;
            border: 3px solid #1e3a8a;
            position: relative;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          }
          
          .certificate::before {
            content: '';
            position: absolute;
            top: 10px;
            left: 10px;
            right: 10px;
            bottom: 10px;
            border: 2px solid #3b82f6;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #1e3a8a;
            margin-bottom: 10px;
          }
          
          .title {
            font-family: 'Playfair Display', serif;
            font-size: 48px;
            color: #1e3a8a;
            margin: 20px 0;
          }
          
          .subtitle {
            font-size: 18px;
            color: #64748b;
            margin-bottom: 30px;
          }
          
          .recipient {
            font-family: 'Playfair Display', serif;
            font-size: 36px;
            color: #1e40af;
            margin: 30px 0;
            padding: 10px 0;
            border-bottom: 2px solid #3b82f6;
            display: inline-block;
          }
          
          .course-title {
            font-size: 24px;
            color: #1e3a8a;
            font-weight: 600;
            margin: 20px 0;
          }
          
          .details {
            font-size: 16px;
            color: #475569;
            line-height: 1.8;
            margin: 30px 0;
          }
          
          .score {
            font-size: 20px;
            color: #059669;
            font-weight: 600;
          }
          
          .footer {
            display: flex;
            justify-content: space-between;
            margin-top: 50px;
            padding-top: 30px;
            border-top: 1px solid #e2e8f0;
          }
          
          .signature {
            text-align: center;
          }
          
          .signature-line {
            width: 200px;
            border-bottom: 1px solid #1e3a8a;
            margin: 10px auto;
          }
          
          .cert-id {
            font-size: 12px;
            color: #94a3b8;
            margin-top: 20px;
          }
          
          .seal {
            width: 100px;
            height: 100px;
            border: 3px solid #f59e0b;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            text-align: center;
            color: #f59e0b;
            font-weight: bold;
          }
          
          @media print {
            body { background: white; padding: 0; }
            .certificate { box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="header">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6927bc307b96037b8506c608/1652e0384_oracle.jpg" alt="Fiber Oracle" style="width: 80px; height: 80px; border-radius: 16px; margin: 0 auto 10px;" />
            <div class="logo">FIBER ORACLE</div>
            <div class="subtitle">Education & Certification Center</div>
            <div class="title">Certificate of Completion</div>
          </div>
          
          <div style="text-align: center;">
            <p style="font-size: 16px; color: #64748b;">This is to certify that</p>
            <div class="recipient">${learnerName}</div>
            <p style="font-size: 16px; color: #64748b; margin-top: 20px;">has successfully completed</p>
            <div class="course-title">${examData.title.replace(' Certification Exam', '')}</div>
            <p style="font-size: 14px; color: #64748b;">${examData.subtitle}</p>
            
            <div class="details">
              <p>This certifies that the above-named individual has successfully demonstrated 
              knowledge and understanding of fiber optic technology, PON networks, and FTTH 
              installation and troubleshooting by achieving a passing score on the final assessment.</p>
              <p class="score">Final Score: ${examResults?.score}%</p>
            </div>
          </div>
          
          <div class="footer">
            <div class="signature">
              <div class="signature-line"></div>
              <p>Fiber Oracle</p>
              <p style="font-size: 12px; color: #64748b;">Certification Authority</p>
            </div>
            
            <div class="seal">
              CERTIFIED<br/>
              ${courseId.toUpperCase()}
            </div>
            
            <div class="signature">
              <div class="signature-line"></div>
              <p>${examResults?.completionDate}</p>
              <p style="font-size: 12px; color: #64748b;">Date of Completion</p>
            </div>
          </div>
          
          <div class="cert-id">
            Certificate ID: ${examResults?.certificateId} | Verify at fiberoracle.com/verify
          </div>
        </div>
        
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    certWindow.document.close();
  };

  const retakeExam = () => {
    setStage('intro');
    setAnswers({});
    setCurrentQuestion(0);
    setExamResults(null);
    setShowExplanation({});
    // Re-shuffle questions
    const shuffledQuestions = shuffleArray(examData.questions).map(q => {
      if (q.type === 'single' || q.type === 'scenario') {
        const optionsWithIndex = q.options.map((opt, idx) => ({ opt, isCorrect: idx === q.correctAnswer }));
        const shuffledOptions = shuffleArray(optionsWithIndex);
        const newCorrectIndex = shuffledOptions.findIndex(o => o.isCorrect);
        return { ...q, options: shuffledOptions.map(o => o.opt), correctAnswer: newCorrectIndex };
      }
      return q;
    });
    setQuestions(shuffledQuestions);
    setTimeRemaining(examData.timeLimit * 60);
  };

  if (!examData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold">Exam Not Found</h2>
          <p className="text-gray-500 mt-2">The requested certification exam does not exist.</p>
          <Link to={createPageUrl('Education')}>
            <Button className="mt-4">Return to Education Center</Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Intro Screen
  if (stage === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Education')}>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold">{examData.title}</h1>
                <p className="text-xs text-gray-500">Certification Exam</p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          <Card className="border-0 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-8 text-white text-center">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6927bc307b96037b8506c608/1652e0384_oracle.jpg" 
                alt="Fiber Oracle" 
                className="w-20 h-20 rounded-2xl object-cover shadow-xl mx-auto mb-4"
              />
              <h2 className="text-2xl font-bold">{examData.title}</h2>
              <p className="text-indigo-100 mt-2">{examData.subtitle}</p>
            </div>
            
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <FileText className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                  <div className="text-xl font-bold">{examData.totalQuestions}</div>
                  <div className="text-xs text-gray-500">Questions</div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <Clock className="h-6 w-6 mx-auto mb-2 text-amber-600" />
                  <div className="text-xl font-bold">{examData.timeLimit}</div>
                  <div className="text-xs text-gray-500">Minutes</div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <Target className="h-6 w-6 mx-auto mb-2 text-green-600" />
                  <div className="text-xl font-bold">{examData.passingScore}%</div>
                  <div className="text-xs text-gray-500">To Pass</div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <BookOpen className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-amber-800 dark:text-amber-200">Open Book Exam</h4>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        You may reference the study guide during this exam. 
                        <Link to={createPageUrl(`StudyGuide?course=${courseId}`)} className="underline ml-1">
                          Download it here
                        </Link>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Exam Format</h4>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Multiple choice (single and multiple correct)</li>
                    <li>• True/False questions</li>
                    <li>• Fill-in-the-blank</li>
                    <li>• Scenario-based questions</li>
                    <li>• Questions increase in difficulty</li>
                  </ul>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label htmlFor="name">Enter Your Full Name (as it will appear on certificate)</Label>
                <Input
                  id="name"
                  placeholder="John Smith"
                  value={learnerName}
                  onChange={(e) => setLearnerName(e.target.value)}
                  className="text-lg"
                />
              </div>

              <Button onClick={startExam} size="lg" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
                <Target className="h-5 w-5 mr-2" />
                Begin Certification Exam
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Exam Screen
  if (stage === 'exam') {
    const question = questions[currentQuestion];
    const progress = ((currentQuestion + 1) / questions.length) * 100;
    const answeredCount = Object.keys(answers).length;

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Exam Header */}
        <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant="outline">Question {currentQuestion + 1} of {questions.length}</Badge>
                <Badge className={question.difficulty === 'hard' ? 'bg-red-500' : question.difficulty === 'medium' ? 'bg-amber-500' : 'bg-green-500'}>
                  {question.difficulty}
                </Badge>
                <Badge variant="outline">{question.domain}</Badge>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${timeRemaining < 300 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                <Timer className="h-4 w-4" />
                <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
              </div>
            </div>
            <Progress value={progress} className="mt-3 h-2" />
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6 md:p-8">
                  {/* Scenario text if applicable */}
                  {question.scenario && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl mb-6">
                      <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Scenario:</h4>
                      <p className="text-blue-700 dark:text-blue-300">{question.scenario}</p>
                    </div>
                  )}

                  <h3 className="text-xl font-semibold mb-6">{question.question}</h3>

                  {/* Single Choice */}
                  {(question.type === 'single' || question.type === 'scenario') && (
                    <RadioGroup
                      value={answers[question.id]?.toString() || ''}
                      onValueChange={(value) => handleAnswer(question.id, parseInt(value))}
                      className="space-y-3"
                    >
                      {question.options.map((option, idx) => (
                        <div key={idx} className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer
                          ${answers[question.id] === idx ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                          onClick={() => handleAnswer(question.id, idx)}
                        >
                          <RadioGroupItem value={idx.toString()} id={`option-${idx}`} />
                          <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">{option}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {/* True/False */}
                  {question.type === 'truefalse' && (
                    <RadioGroup
                      value={answers[question.id]?.toString() || ''}
                      onValueChange={(value) => handleAnswer(question.id, value === 'true')}
                      className="space-y-3"
                    >
                      {[{ value: true, label: 'True' }, { value: false, label: 'False' }].map((option) => (
                        <div key={option.label} className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer
                          ${answers[question.id] === option.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                          onClick={() => handleAnswer(question.id, option.value)}
                        >
                          <RadioGroupItem value={option.value.toString()} id={`tf-${option.label}`} />
                          <Label htmlFor={`tf-${option.label}`} className="flex-1 cursor-pointer">{option.label}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {/* Fill in the Blank */}
                  {question.type === 'fillin' && (
                    <Input
                      placeholder="Type your answer..."
                      value={answers[question.id] || ''}
                      onChange={(e) => handleAnswer(question.id, e.target.value)}
                      className="text-lg p-4"
                    />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
              disabled={currentQuestion === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="text-sm text-gray-500">
              {answeredCount} of {questions.length} answered
            </div>

            {currentQuestion < questions.length - 1 ? (
              <Button onClick={() => setCurrentQuestion(prev => prev + 1)}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={submitExam}
                className="bg-green-600 hover:bg-green-700"
              >
                Submit Exam
                <CheckCircle2 className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>

          {/* Question Navigator */}
          <Card className="mt-6 border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm">Question Navigator</h4>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded" /> Answered</span>
                  <span className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-200 rounded" /> Unanswered</span>
                  <span className="flex items-center gap-1"><div className="w-3 h-3 border-2 border-blue-500 rounded" /> Current</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {questions.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestion(idx)}
                    className={`w-8 h-8 rounded text-sm font-medium transition-all
                      ${idx === currentQuestion ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                      ${answers[q.id] !== undefined ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}
                    `}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Results Screen
  if (stage === 'results' && examResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold">Exam Results</h1>
              <Link to={createPageUrl('Education')}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Education
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          {/* Results Hero */}
          <Card className={`border-0 shadow-xl overflow-hidden ${examResults.passed ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-amber-500 to-orange-600'}`}>
            <CardContent className="p-8 text-white text-center">
              {examResults.passed ? (
                <>
                  <Trophy className="h-20 w-20 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold mb-2">Congratulations, {learnerName}!</h2>
                  <p className="text-lg opacity-90">You passed the {examData.title}!</p>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-20 w-20 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold mb-2">Almost There!</h2>
                  <p className="text-lg opacity-90">Review the material and try again.</p>
                </>
              )}
              
              <div className="mt-6 inline-block">
                <div className="text-6xl font-bold">{examResults.score}%</div>
                <div className="text-sm opacity-80 mt-1">
                  {examResults.correct} correct out of {examResults.total} questions
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Score Breakdown */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Score by Domain</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(examResults.domainScores).map(([domain, scores]) => {
                const percentage = Math.round((scores.correct / scores.total) * 100);
                return (
                  <div key={domain} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{domain}</span>
                      <span className={percentage >= examData.passingScore ? 'text-green-600' : 'text-red-600'}>
                        {scores.correct}/{scores.total} ({percentage}%)
                      </span>
                    </div>
                    <Progress value={percentage} className={`h-2 ${percentage >= examData.passingScore ? '' : '[&>div]:bg-red-500'}`} />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="grid md:grid-cols-2 gap-4">
            {examResults.passed && (
              <Button onClick={downloadCertificate} size="lg" className="bg-gradient-to-r from-indigo-600 to-purple-600">
                <Download className="h-5 w-5 mr-2" />
                Download Certificate
              </Button>
            )}
            <Button onClick={retakeExam} variant={examResults.passed ? 'outline' : 'default'} size="lg">
              <RotateCcw className="h-5 w-5 mr-2" />
              {examResults.passed ? 'Retake Exam' : 'Try Again'}
            </Button>
          </div>

          {/* Review Questions */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Review Your Answers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {questions.map((q, idx) => {
                const userAnswer = answers[q.id];
                let isCorrect = false;
                let userAnswerText = '';
                let correctAnswerText = '';

                if (q.type === 'single' || q.type === 'scenario') {
                  isCorrect = userAnswer === q.correctAnswer;
                  userAnswerText = userAnswer !== undefined ? q.options[userAnswer] : 'Not answered';
                  correctAnswerText = q.options[q.correctAnswer];
                } else if (q.type === 'truefalse') {
                  isCorrect = userAnswer === q.correctAnswer;
                  userAnswerText = userAnswer !== undefined ? (userAnswer ? 'True' : 'False') : 'Not answered';
                  correctAnswerText = q.correctAnswer ? 'True' : 'False';
                } else if (q.type === 'fillin') {
                  isCorrect = q.correctAnswer.some(ca => ca.toLowerCase().trim() === (userAnswer || '').toLowerCase().trim());
                  userAnswerText = userAnswer || 'Not answered';
                  correctAnswerText = q.correctAnswer[0];
                }

                return (
                  <div key={q.id} className={`p-4 rounded-xl border-2 ${isCorrect ? 'border-green-200 bg-green-50 dark:bg-green-900/20' : 'border-red-200 bg-red-50 dark:bg-red-900/20'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Q{idx + 1}.</span>
                        {isCorrect ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <Badge variant="outline">{q.domain}</Badge>
                    </div>
                    
                    <p className="text-sm mb-2">{q.question}</p>
                    
                    <div className="text-sm space-y-1">
                      <div className={isCorrect ? 'text-green-700' : 'text-red-700'}>
                        <strong>Your answer:</strong> {userAnswerText}
                      </div>
                      {!isCorrect && (
                        <div className="text-green-700">
                          <strong>Correct answer:</strong> {correctAnswerText}
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => setShowExplanation(prev => ({ ...prev, [q.id]: !prev[q.id] }))}
                    >
                      <HelpCircle className="h-4 w-4 mr-1" />
                      {showExplanation[q.id] ? 'Hide' : 'Show'} Explanation
                    </Button>

                    {showExplanation[q.id] && (
                      <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                        {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return null;
}