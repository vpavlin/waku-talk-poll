/**
 * Instance Manager
 * 
 * View and manage all created instances
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getInstances, deleteInstance, getQuestions, getAnswers } from '@/lib/storage';
import type { Instance } from '@/types/waku';
import { ArrowLeft, Trash2, ExternalLink, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function InstanceManager() {
  const navigate = useNavigate();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [instanceToDelete, setInstanceToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadInstances();
  }, []);

  const loadInstances = () => {
    const loaded = getInstances();
    // Sort by most recent first
    loaded.sort((a, b) => b.createdAt - a.createdAt);
    setInstances(loaded);
  };

  const handleDelete = (instanceId: string) => {
    setInstanceToDelete(instanceId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (instanceToDelete) {
      deleteInstance(instanceToDelete);
      loadInstances();
      toast.success('Instance deleted');
      setInstanceToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const filteredInstances = instances.filter(instance =>
    instance.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    instance.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Instance Manager</h1>
                <p className="text-sm text-muted-foreground">Manage your Q&A instances</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Search */}
        <Card className="mb-6 shadow-lg">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search instances by ID or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Instances List */}
        {filteredInstances.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? 'No instances found matching your search' : 'No instances created yet'}
                </p>
                <Button onClick={() => navigate('/')}>
                  Create Your First Instance
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredInstances.map((instance) => {
              const questionCount = instance.questions.length;
              const activeCount = instance.questions.filter(q => q.active).length;
              const answerCount = getAnswers(instance.id).length;

              return (
                <Card key={instance.id} className="shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-3">
                          <code className="text-xl font-mono">{instance.id}</code>
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Created {new Date(instance.createdAt).toLocaleDateString()} at{' '}
                          {new Date(instance.createdAt).toLocaleTimeString()}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(instance.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => navigate(`/admin/${instance.id}`)}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        {questionCount} question{questionCount !== 1 ? 's' : ''}
                      </Badge>
                      {activeCount > 0 && (
                        <Badge variant="default">
                          {activeCount} active
                        </Badge>
                      )}
                      <Badge variant="outline">
                        {answerCount} answer{answerCount !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    
                    {instance.questions.length > 0 && (
                      <div className="mt-4 space-y-1">
                        <p className="text-sm font-medium">Questions:</p>
                        {instance.questions.slice(0, 3).map((q) => (
                          <p key={q.id} className="text-sm text-muted-foreground pl-4">
                            • {q.text}
                          </p>
                        ))}
                        {instance.questions.length > 3 && (
                          <p className="text-sm text-muted-foreground pl-4">
                            + {instance.questions.length - 3} more...
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Instance?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the instance, all questions, and all answers.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
