/**
 * Attendee View
 * 
 * Allows attendees to:
 * - Join an instance by ID
 * - View active questions
 * - Submit answers
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { QuestionCard } from '@/components/QuestionCard';
import { useWaku } from '@/hooks/useWaku';
import { MessageType, type Question, type Answer } from '@/types/waku';
import { ArrowLeft, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function Attendee() {
  const { instanceId } = useParams<{ instanceId: string }>();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submittedAnswers, setSubmittedAnswers] = useState<Set<string>>(new Set());
  
  const { isConnected, isInitializing, isReady, error, sendMessage, onMessage, senderId } = useWaku(instanceId || null);

  // Listen for question updates - only after Waku is ready
  useEffect(() => {
    if (!isReady) {
      console.log('[Attendee] Waiting for Waku to be ready...');
      return;
    }

    console.log('[Attendee] Setting up message listener');
    const unsubscribe = onMessage((message) => {
      console.log('[Attendee] Processing message:', message.type, message.payload);
      
      switch (message.type) {
        case MessageType.QUESTION_ADDED:
          setQuestions(prev => {
            // Avoid duplicates
            if (prev.some(q => q.id === message.payload.question.id)) {
              console.log('[Attendee] Question already exists:', message.payload.question.id);
              return prev;
            }
            console.log('[Attendee] Adding question:', message.payload.question);
            return [...prev, message.payload.question];
          });
          break;
        
        case MessageType.QUESTION_ACTIVATED:
          setQuestions(prev => {
            const updated = prev.map(q =>
              q.id === message.payload.questionId ? { ...q, active: true } : q
            );
            console.log('[Attendee] Question activated:', message.payload.questionId);
            console.log('[Attendee] Updated questions:', updated);
            return updated;
          });
          toast.info('New question activated!');
          break;
        
        case MessageType.QUESTION_DEACTIVATED:
          setQuestions(prev =>
            prev.map(q =>
              q.id === message.payload.questionId ? { ...q, active: false } : q
            )
          );
          console.log('[Attendee] Question deactivated:', message.payload.questionId);
          break;
      }
    });

    return unsubscribe;
  }, [isReady, onMessage]);

  // Debug log for questions
  useEffect(() => {
    console.log('[Attendee] All questions:', questions);
    console.log('[Attendee] Active questions:', questions.filter(q => q.active));
  }, [questions]);

  const handleSubmitAnswer = async (questionId: string, answerText: string) => {
    const answer: Answer = {
      id: `a_${Date.now()}`,
      questionId,
      text: answerText,
      senderId,
      timestamp: Date.now()
    };

    // Send answer via Waku
    await sendMessage({
      type: MessageType.ANSWER_SUBMITTED,
      timestamp: Date.now(),
      senderId,
      payload: { answer }
    });

    // Mark as submitted locally
    setSubmittedAnswers(prev => new Set([...prev, questionId]));
    toast.success('Answer submitted successfully!');
  };

  const activeQuestions = questions.filter(q => q.active);

  if (!instanceId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Instance</CardTitle>
            <CardDescription>No instance ID provided</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full">
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                <h1 className="text-2xl font-bold">Attendee View</h1>
                <p className="text-sm text-muted-foreground">
                  Instance: <code className="font-mono font-bold">{instanceId}</code>
                </p>
              </div>
            </div>
            <ConnectionStatus isConnected={isConnected} isInitializing={isInitializing} />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Active Questions */}
        {activeQuestions.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Waiting for questions</h3>
                <p className="text-muted-foreground">
                  The presenter will activate questions soon.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Active Questions</h2>
              <Badge variant="secondary">
                {activeQuestions.length} question{activeQuestions.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            
            {activeQuestions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                onSubmit={handleSubmitAnswer}
                disabled={!isConnected || submittedAnswers.has(question.id)}
                submitted={submittedAnswers.has(question.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
