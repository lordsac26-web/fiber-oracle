import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useCourseProgress(courseId, totalSlides) {
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check auth status
  useEffect(() => {
    base44.auth.isAuthenticated().then(setIsAuthenticated).catch(() => setIsAuthenticated(false));
  }, []);

  // Fetch progress for this course
  const { data: progress, isLoading } = useQuery({
    queryKey: ['courseProgress', courseId],
    queryFn: async () => {
      if (!isAuthenticated) return null;
      const records = await base44.entities.CourseProgress.filter({ course_id: courseId });
      return records.length > 0 ? records[0] : null;
    },
    enabled: isAuthenticated,
  });

  // Save progress mutation
  const saveProgressMutation = useMutation({
    mutationFn: async ({ currentSlide, completed }) => {
      if (!isAuthenticated) return null;
      
      const data = {
        course_id: courseId,
        current_slide: currentSlide,
        total_slides: totalSlides,
        completed: completed || false,
        last_accessed: new Date().toISOString(),
      };
      
      if (completed) {
        data.completion_date = new Date().toISOString().split('T')[0];
      }

      if (progress?.id) {
        return base44.entities.CourseProgress.update(progress.id, data);
      } else {
        return base44.entities.CourseProgress.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courseProgress', courseId] });
      queryClient.invalidateQueries({ queryKey: ['allCourseProgress'] });
    },
  });

  const saveProgress = useCallback((currentSlide, completed = false) => {
    if (isAuthenticated) {
      saveProgressMutation.mutate({ currentSlide, completed });
    }
  }, [isAuthenticated, saveProgressMutation]);

  const initialSlide = progress?.current_slide || 0;
  const isCompleted = progress?.completed || false;
  const progressPercent = progress ? Math.round(((progress.current_slide + 1) / totalSlides) * 100) : 0;

  return {
    progress,
    isLoading,
    isAuthenticated,
    initialSlide,
    isCompleted,
    progressPercent,
    saveProgress,
  };
}

export function useAllCourseProgress() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then(setIsAuthenticated).catch(() => setIsAuthenticated(false));
  }, []);

  const { data: allProgress = [], isLoading } = useQuery({
    queryKey: ['allCourseProgress'],
    queryFn: async () => {
      if (!isAuthenticated) return [];
      return base44.entities.CourseProgress.list();
    },
    enabled: isAuthenticated,
  });

  const getProgressForCourse = (courseId) => {
    return allProgress.find(p => p.course_id === courseId) || null;
  };

  return {
    allProgress,
    isLoading,
    isAuthenticated,
    getProgressForCourse,
  };
}