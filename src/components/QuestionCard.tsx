/**
 * Question Card Component
 * 
 * Displays an active question to attendees with answer input
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Question } from '@/types/waku';
import { Send, Check } from 'lucide-react';

interface QuestionCardProps {
  question: Question;
  onSubmit: (questionId: string, answerText: string) => void;
  disabled?: boolean;
  submitted?: boolean;
}

export function QuestionCard({
  question,
  onSubmit,
  disabled = false,
  submitted = false
}: QuestionCardProps) {
  const [answerText, setAnswerText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answerText.trim() && !disabled && !submitted) {
      onSubmit(question.id, answerText.trim());
      setAnswerText('');
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg">{question.text}</CardTitle>
      </CardHeader>
      <CardContent>
        {submitted ? (
          <div className="flex items-center gap-2 text-success">
            <Check className="h-5 w-5" />
            <span className="font-medium">Answer submitted successfully!</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Input
              placeholder="Type your answer here..."
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              disabled={disabled}
              className="flex-1"
            />
            <Button type="submit" disabled={!answerText.trim() || disabled}>
              <Send className="h-4 w-4 mr-2" />
              Submit
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
