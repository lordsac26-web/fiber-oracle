import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  GraduationCap, 
  BookOpen, 
  Award,
  ChevronRight,
  Clock,
  Target,
  Zap,
  Wrench,
  Stethoscope,
  FileText,
  ClipboardCheck,
  Trophy,
  CheckCircle2,
  Play
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAllCourseProgress } from '@/components/education/useCourseProgress';

const COURSES = [
  {
    id: 'fiber101',
    title: 'Fiber 101',
    subtitle: 'Foundations of Fiber Optics',
    description: 'Perfect for beginners. Learn the essentials of fiber optic technology, from basic concepts to FTTH network architecture.',
    icon: BookOpen,
    color: 'from-green-500 to-emerald-600',
    page: 'Fiber101',
    duration: '20 min',
    level: 'Beginner',
    passingScore: 70,
    topics: ['Fiber Structure', 'SMF vs MMF', 'Color Codes', 'Connectors', 'PON Basics', 'FTTH Architecture', 'Power Levels', 'Safety'],
    badge: { text: 'Start Here', color: 'bg-green-500' }
  },
  {
    id: 'fiber102',
    title: 'Fiber 102',
    subtitle: 'Intermediate PON & FTTH',
    description: 'For technicians ready to deepen their knowledge. Advanced PON technologies, troubleshooting, and testing methodologies.',
    icon: Target,
    color: 'from-blue-500 to-indigo-600',
    page: 'Fiber102',
    duration: '30 min',
    level: 'Intermediate',
    passingScore: 75,
    topics: ['GPON Deep Dive', 'XGS-PON', 'Loss Budgets', 'OTDR Analysis', 'Troubleshooting Basics', 'Splitter Cascades', 'OLT/ONT Config'],
    badge: { text: 'Level Up', color: 'bg-blue-500' }
  },
  {
    id: 'fiber103',
    title: 'Fiber 103',
    subtitle: 'Advanced Troubleshooting',
    description: 'Expert-level diagnostics for complex issues. Master OTDR trace analysis, PON error counters, and systematic fault isolation.',
    icon: Wrench,
    color: 'from-purple-500 to-indigo-600',
    page: 'Fiber103',
    duration: '45 min',
    level: 'Advanced',
    passingScore: 80,
    topics: ['OTDR Mastery', 'Ghost Events', 'Bidirectional Analysis', 'PON Diagnostics', 'Error Counters', 'Intermittent Faults', 'Splitter Failures', 'Documentation'],
    badge: { text: 'Expert', color: 'bg-purple-500' }
  },
];

const TOTAL_SLIDES = {
  fiber101: 15,
  fiber102: 14,
  fiber103: 16,
};

export default function Education() {
  const { getProgressForCourse, isAuthenticated } = useAllCourseProgress();

  const getCourseStatus = (courseId) => {
    const progress = getProgressForCourse(courseId);
    if (!progress) return { status: 'not-started', percent: 0 };
    if (progress.completed) return { status: 'completed', percent: 100 };
    const percent = Math.round(((progress.current_slide + 1) / (progress.total_slides || TOTAL_SLIDES[courseId])) * 100);
    return { status: 'in-progress', percent };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Education Center</h1>
              <p className="text-xs text-gray-500">Master FTTH & PON Technologies</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6927bc307b96037b8506c608/1652e0384_oracle.jpg" 
            alt="Fiber Oracle" 
            className="w-24 h-24 rounded-2xl object-cover shadow-xl mx-auto"
          />
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Fiber Optic Training
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Comprehensive courses designed to build your expertise in FTTH and PON technologies. 
            From beginner fundamentals to advanced troubleshooting techniques.
          </p>
        </div>

        {/* Course Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {COURSES.map((course) => {
            const courseStatus = getCourseStatus(course.id);
            return (
            <Link key={course.id} to={createPageUrl(course.page)}>
              <Card className="group h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer">
                {/* Header Gradient */}
                <div className={`bg-gradient-to-r ${course.color} p-6 text-white relative`}>
                  {courseStatus.status === 'completed' ? (
                    <Badge className="absolute top-4 right-4 bg-white text-green-600 border-0">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  ) : courseStatus.status === 'in-progress' ? (
                    <Badge className="absolute top-4 right-4 bg-white/90 text-gray-800 border-0">
                      <Play className="h-3 w-3 mr-1" />
                      {courseStatus.percent}%
                    </Badge>
                  ) : (
                    <Badge className={`absolute top-4 right-4 ${course.badge.color} text-white border-0`}>
                      {course.badge.text}
                    </Badge>
                  )}
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <course.icon className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">{course.title}</h3>
                      <p className="text-white/80">{course.subtitle}</p>
                    </div>
                  </div>
                </div>

                <CardContent className="p-6 space-y-4">
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {course.description}
                  </p>

                  {/* Meta Info */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-gray-500">
                      <Clock className="h-4 w-4" />
                      {course.duration}
                    </div>
                    <Badge variant="outline">{course.level}</Badge>
                  </div>

                  {/* Topics Preview */}
                  <div className="flex flex-wrap gap-1.5">
                    {course.topics.slice(0, 5).map((topic, i) => (
                      <Badge key={i} variant="secondary" className="text-xs font-normal">
                        {topic}
                      </Badge>
                    ))}
                    {course.topics.length > 5 && (
                      <Badge variant="secondary" className="text-xs font-normal">
                        +{course.topics.length - 5} more
                      </Badge>
                    )}
                  </div>

                  {/* Certification Info */}
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg mb-3">
                    <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                      <Award className="h-4 w-4" />
                      <span>Certification available • {course.passingScore}% to pass</span>
                    </div>
                  </div>

                  {/* Progress Bar (if in progress) */}
                  {isAuthenticated && courseStatus.status === 'in-progress' && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{courseStatus.percent}%</span>
                      </div>
                      <Progress value={courseStatus.percent} className="h-2" />
                    </div>
                  )}

                  {/* CTA */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:underline">
                      {courseStatus.status === 'completed' ? 'Review Course' : 
                       courseStatus.status === 'in-progress' ? 'Continue' : 'Start Course'}
                    </span>
                    <ChevronRight className="h-5 w-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
          })}

          {/* Certification & Resources Card */}
          <Card className="md:col-span-2 border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                    <Award className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Certification Center</h3>
                    <p className="text-sm text-gray-500">Study guides, exams, and certificates</p>
                  </div>
                </div>
                <Link to={createPageUrl('Certifications')}>
                  <Button variant="outline" className="gap-2">
                    <Trophy className="h-4 w-4" />
                    My Certifications
                  </Button>
                </Link>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                {COURSES.map(course => (
                  <div key={`cert-${course.id}`} className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow">
                    <h4 className="font-semibold mb-2">{course.title}</h4>
                    <div className="space-y-2">
                      <Link to={createPageUrl(`StudyGuide?course=${course.id}`)}>
                        <Button variant="outline" size="sm" className="w-full justify-start">
                          <FileText className="h-4 w-4 mr-2" />
                          Study Guide
                        </Button>
                      </Link>
                      <Link to={createPageUrl(`CertificationExam?course=${course.id}`)}>
                        <Button size="sm" className="w-full justify-start bg-gradient-to-r from-indigo-500 to-purple-600">
                          <ClipboardCheck className="h-4 w-4 mr-2" />
                          Take Exam
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Learning Path */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              Recommended Learning Path
            </h3>
            <div className="flex items-center gap-4 overflow-x-auto pb-2">
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">1</div>
                <div>
                  <div className="font-medium text-sm">Fiber 101</div>
                  <div className="text-xs text-gray-500">Foundations</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">2</div>
                <div>
                  <div className="font-medium text-sm">Fiber 102</div>
                  <div className="text-xs text-gray-500">Intermediate</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">3</div>
                <div>
                  <div className="font-medium text-sm">Fiber 103</div>
                  <div className="text-xs text-gray-500">Advanced</div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
              <Link to={createPageUrl('FiberDoctor')} className="flex items-center gap-2 flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center text-white">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium text-sm">Fiber Doctor</div>
                  <div className="text-xs text-gray-500">Diagnostics</div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to={createPageUrl('Manual')}>
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="p-4 text-center">
                <BookOpen className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                <div className="font-medium text-sm">User Manual</div>
                <div className="text-xs text-gray-500">Full documentation</div>
              </CardContent>
            </Card>
          </Link>
          <Link to={createPageUrl('ReferenceTables')}>
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="p-4 text-center">
                <Zap className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                <div className="font-medium text-sm">Reference Tables</div>
                <div className="text-xs text-gray-500">Quick lookup</div>
              </CardContent>
            </Card>
          </Link>
          <Link to={createPageUrl('PONLevels')}>
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="p-4 text-center">
                <Target className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                <div className="font-medium text-sm">PON Levels</div>
                <div className="text-xs text-gray-500">Power specs</div>
              </CardContent>
            </Card>
          </Link>
          <Link to={createPageUrl('FiberDoctor')}>
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardContent className="p-4 text-center">
                <GraduationCap className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                <div className="font-medium text-sm">Fiber Doctor</div>
                <div className="text-xs text-gray-500">Troubleshooting</div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}