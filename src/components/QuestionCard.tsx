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
import { Send, Check, Loader2, CheckCheck } from 'lucide-react';

type MessageStatus = 'idle' | 'sending' | 'sent' | 'acknowledged';

interface QuestionCardProps {
  question: Question;
  onSubmit: (questionId: string, answerText: string) => void;
  disabled?: boolean;
  submitted?: boolean;
  messageStatus?: MessageStatus;
}

export function QuestionCard({
  question,
  onSubmit,
  disabled = false,
  submitted = false,
  messageStatus = 'idle'
}: QuestionCardProps) {
  const [answerText, setAnswerText] = useState('');

  const getStatusDisplay = () => {
    switch (messageStatus) {
      case 'sending':
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Sending...</span>
          </div>
        );
      case 'sent':
        return (
          <div className="flex items-center gap-2 text-primary">
            <Check className="h-4 w-4" />
            <span className="text-sm font-medium">Sent</span>
          </div>
        );
      case 'acknowledged':
        return (
          <div className="flex items-center gap-2 text-success">
            <CheckCheck className="h-4 w-4" />
            <span className="text-sm font-medium">Delivered</span>
          </div>
        );
      default:
        return null;
    }
  };

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
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-success">
              <Check className="h-5 w-5" />
              <span className="font-medium">Answer submitted successfully!</span>
            </div>
            {getStatusDisplay()}
          </div>
        ) : (
          <div className="space-y-3">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <Input
                placeholder="Type your answer here..."
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                disabled={disabled || messageStatus === 'sending'}
                className="flex-1"
              />
              <Button type="submit" disabled={!answerText.trim() || disabled || messageStatus === 'sending'}>
                {messageStatus === 'sending' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit
                  </>
                )}
              </Button>
            </form>
            {messageStatus !== 'idle' && getStatusDisplay()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
