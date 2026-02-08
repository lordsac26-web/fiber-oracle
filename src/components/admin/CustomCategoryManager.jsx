import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Tag, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';

const PRESET_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', 
  '#06b6d4', '#6366f1', '#ef4444', '#84cc16', '#f97316'
];

export default function CustomCategoryManager() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: PRESET_COLORS[0],
    keywords: ''
  });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['customCategories'],
    queryFn: () => base44.entities.CustomCategory.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CustomCategory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['customCategories']);
      setIsDialogOpen(false);
      setFormData({ name: '', description: '', color: PRESET_COLORS[0], keywords: '' });
      toast.success('Category created successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create category');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CustomCategory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['customCategories']);
      toast.success('Category deleted');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete category');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const keywords = formData.keywords
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);

    createMutation.mutate({
      name: formData.name,
      description: formData.description,
      color: formData.color,
      keywords,
      document_count: 0,
      is_active: true
    });
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading categories...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Custom Categories</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              New Category
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white dark:bg-gray-800">
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-white">Create Custom Category</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                  Category Name
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Fiber Optic Testing"
                  required
                  className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                  Description
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of what documents belong in this category"
                  className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 h-20"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                  Keywords (comma-separated)
                </label>
                <Input
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  placeholder="OTDR, testing, fiber, diagnostics"
                  className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                  Color
                </label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formData.color === color ? 'border-gray-900 dark:border-white scale-110' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Category'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <Card key={category.id} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <CardTitle className="text-base text-gray-900 dark:text-white">{category.name}</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(category.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {category.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{category.description}</p>
              )}
              
              {category.keywords?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {category.keywords.map((keyword, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="text-xs border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                    >
                      {keyword}
                    </Badge>
                  ))}
                </div>
              )}
              
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 pt-2">
                <FileText className="w-3 h-3" />
                <span>{category.document_count || 0} documents</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {categories.length === 0 && (
        <Card className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <CardContent className="text-center py-8">
            <Tag className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No custom categories yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Create categories to better organize your documents
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}