import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Stethoscope
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

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
    topics: ['OTDR Mastery', 'Ghost Events', 'Bidirectional Analysis', 'PON Diagnostics', 'Error Counters', 'Intermittent Faults', 'Splitter Failures', 'Documentation'],
    badge: { text: 'Expert', color: 'bg-purple-500' }
  },
];

export default function Education() {
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
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl">
            <GraduationCap className="h-10 w-10 text-white" />
          </div>
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
          {COURSES.map((course) => (
            <Link key={course.id} to={createPageUrl(course.page)}>
              <Card className="group h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer">
                {/* Header Gradient */}
                <div className={`bg-gradient-to-r ${course.color} p-6 text-white relative`}>
                  <Badge className={`absolute top-4 right-4 ${course.badge.color} text-white border-0`}>
                    {course.badge.text}
                  </Badge>
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

                  {/* CTA */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:underline">
                      Start Course
                    </span>
                    <ChevronRight className="h-5 w-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
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