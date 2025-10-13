/**
 * Question Manager Component
 * 
 * Admin interface for creating and managing questions
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { Question } from '@/types/waku';
import { Plus, Radio } from 'lucide-react';

interface QuestionManagerProps {
  questions: Question[];
  onAddQuestion: (text: string) => void;
  onToggleActive: (questionId: string) => void;
  disabled?: boolean;
}

export function QuestionManager({
  questions,
  onAddQuestion,
  onToggleActive,
  disabled = false
}: QuestionManagerProps) {
  const [newQuestionText, setNewQuestionText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newQuestionText.trim() && !disabled) {
      onAddQuestion(newQuestionText.trim());
      setNewQuestionText('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Add New Question */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Add New Question</CardTitle>
          <CardDescription>
            Create questions for attendees to answer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Input
              placeholder="e.g., Which programming language do you use most?"
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              disabled={disabled}
              className="flex-1"
            />
            <Button type="submit" disabled={!newQuestionText.trim() || disabled}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Questions List */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>All Questions</CardTitle>
          <CardDescription>
            Toggle questions to make them visible to attendees
          </CardDescription>
        </CardHeader>
        <CardContent>
          {questions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No questions yet. Create your first question above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((question) => (
                <div
                  key={question.id}
                  className="flex items-start gap-4 p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start gap-2">
                      {question.active && (
                        <Radio className="h-4 w-4 mt-1 text-primary animate-pulse" />
                      )}
                      <p className="font-medium">{question.text}</p>
                    </div>
                    <Badge variant={question.active ? 'default' : 'secondary'}>
                      {question.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`toggle-${question.id}`} className="text-sm">
                      {question.active ? 'Active' : 'Activate'}
                    </Label>
                    <Switch
                      id={`toggle-${question.id}`}
                      checked={question.active}
                      onCheckedChange={() => onToggleActive(question.id)}
                      disabled={disabled}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
