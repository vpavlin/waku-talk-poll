/**
 * Admin Dashboard
 * 
 * Allows admin to:
 * - Create questions
 * - Activate/deactivate questions
 * - View live results with visualizations
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QuestionManager } from '@/components/QuestionManager';
import { ResultsView } from '@/components/ResultsView';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { useWaku } from '@/hooks/useWaku';
import { MessageType, type Question, type Answer } from '@/types/waku';
import { Copy, Check, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { saveInstance, saveQuestions, saveAnswers, getQuestions, getAnswers, getInstance } from '@/lib/storage';
import { Version } from '@/components/Version';
import { DevConsole } from '@/components/DevConsole';
import QRCode from 'react-qr-code';

export default function Admin() {
  const { instanceId } = useParams<{ instanceId: string }>();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [copied, setCopied] = useState(false);
  const [instanceName, setInstanceName] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);
  
  const { isConnected, isInitializing, error, sendMessage, onMessage } = useWaku(instanceId || null);

  // Load persisted data on mount
  useEffect(() => {
    if (!instanceId) return;

    console.log('[Admin] Loading persisted data for instance:', instanceId);
    
    // Load instance info
    const instance = getInstance(instanceId);
    if (instance) {
      setInstanceName(instance.name);
      setQuestions(instance.questions);
    } else {
      // Load questions separately if instance doesn't exist
      const persistedQuestions = getQuestions(instanceId);
      setQuestions(persistedQuestions);
    }

    // Load answers
    const persistedAnswers = getAnswers(instanceId);
    setAnswers(persistedAnswers);

    console.log('[Admin] Loaded questions:', questions.length, 'answers:', answers.length);
  }, [instanceId]);

  // Auto-save questions whenever they change
  useEffect(() => {
    if (!instanceId || questions.length === 0) return;
    
    console.log('[Admin] Auto-saving questions:', questions.length);
    saveQuestions(instanceId, questions);
    
    // Update instance with latest questions
    saveInstance({
      id: instanceId,
      name: instanceName || `Instance ${instanceId}`,
      questions,
      createdAt: Date.now()
    });
  }, [instanceId, questions, instanceName]);

  // Auto-save answers whenever they change
  useEffect(() => {
    if (!instanceId || answers.length === 0) return;
    
    console.log('[Admin] Auto-saving answers:', answers.length);
    saveAnswers(instanceId, answers);
  }, [instanceId, answers]);

  // Listen for incoming answers
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = onMessage((message) => {
      if (message.type === MessageType.ANSWER_SUBMITTED) {
        setAnswers(prev => [...prev, message.payload.answer]);
        toast.success('New answer received!');
      }
    });

    return unsubscribe;
  }, [isConnected, onMessage]);

  const handleAddQuestion = async (questionText: string) => {
    const question: Question = {
      id: `q_${Date.now()}`,
      text: questionText,
      active: false,
      createdAt: Date.now()
    };

    setQuestions(prev => [...prev, question]);

    // Broadcast to all attendees
    await sendMessage({
      type: MessageType.QUESTION_ADDED,
      timestamp: Date.now(),
      senderId: '',
      payload: { question }
    });

    toast.success('Question added successfully');
  };

  const handleToggleActive = async (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return;

    const newActiveState = !question.active;
    
    setQuestions(prev =>
      prev.map(q => q.id === questionId ? { ...q, active: newActiveState } : q)
    );

    // Broadcast state change
    await sendMessage({
      type: newActiveState ? MessageType.QUESTION_ACTIVATED : MessageType.QUESTION_DEACTIVATED,
      timestamp: Date.now(),
      senderId: '',
      payload: { questionId }
    });

    toast.success(newActiveState ? 'Question activated' : 'Question deactivated');
  };

  const handleNextQuestion = async () => {
    // Find all active questions
    const activeQuestions = questions.filter(q => q.active);
    
    // Check if the last question is the only active one
    const lastQuestion = questions[questions.length - 1];
    const isLastQuestionOnlyActive = 
      activeQuestions.length === 1 && 
      activeQuestions[0].id === lastQuestion?.id;
    
    // If last question is the only active one, just deactivate everything
    if (isLastQuestionOnlyActive) {
      setQuestions(prev =>
        prev.map(q => ({ ...q, active: false }))
      );

      await sendMessage({
        type: MessageType.QUESTION_DEACTIVATED,
        timestamp: Date.now(),
        senderId: '',
        payload: { questionId: lastQuestion.id }
      });

      toast.success('Session reset - all questions deactivated');
      return;
    }
    
    // Find the next inactive question
    const firstInactiveIndex = questions.findIndex(q => !q.active);
    
    if (firstInactiveIndex === -1) {
      toast.info('All questions have been activated');
      return;
    }

    const nextQuestion = questions[firstInactiveIndex];

    // Deactivate all currently active questions
    for (const activeQ of activeQuestions) {
      setQuestions(prev =>
        prev.map(q => q.id === activeQ.id ? { ...q, active: false } : q)
      );

      await sendMessage({
        type: MessageType.QUESTION_DEACTIVATED,
        timestamp: Date.now(),
        senderId: '',
        payload: { questionId: activeQ.id }
      });
    }

    // Activate the next question
    setQuestions(prev =>
      prev.map(q => q.id === nextQuestion.id ? { ...q, active: true } : q)
    );

    await sendMessage({
      type: MessageType.QUESTION_ACTIVATED,
      timestamp: Date.now(),
      senderId: '',
      payload: { questionId: nextQuestion.id }
    });

    toast.success(`Question ${firstInactiveIndex + 1} activated`);
  };

  const handleCopyInstanceId = () => {
    if (instanceId) {
      navigator.clipboard.writeText(instanceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Instance ID copied to clipboard');
    }
  };

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
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">Manage your Q&A instance</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Version />
              <ConnectionStatus isConnected={isConnected} isInitializing={isInitializing} />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Instance ID Card */}
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle>Instance ID</CardTitle>
            <CardDescription>Share this ID with attendees or scan the QR code</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-6">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <code className="flex-1 px-4 py-3 bg-muted rounded-lg text-lg font-mono font-bold">
                    {instanceId}
                  </code>
                  <Button
                    onClick={handleCopyInstanceId}
                    variant="outline"
                    size="icon"
                    className="h-12 w-12"
                  >
                    {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Attendees can join at: <code className="text-xs bg-muted px-2 py-1 rounded">{window.location.origin}/attendee/{instanceId}</code>
                </p>
              </div>
              <button
                onClick={() => setShowQRModal(true)}
                className="flex-shrink-0 p-4 bg-white rounded-lg hover:ring-2 hover:ring-primary transition-all cursor-pointer"
                aria-label="View larger QR code"
              >
                <QRCode
                  value={`${window.location.origin}/attendee/${instanceId}`}
                  size={128}
                  level="M"
                />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* QR Code Modal */}
        <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Attendee QR Code</DialogTitle>
              <DialogDescription>
                Scan this code to join the session
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="p-6 bg-white rounded-lg">
                <QRCode
                  value={`${window.location.origin}/attendee/${instanceId}`}
                  size={256}
                  level="H"
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {window.location.origin}/attendee/{instanceId}
              </p>
            </div>
          </DialogContent>
        </Dialog>

        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <Tabs defaultValue="questions" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="questions">
              Questions
              <Badge variant="secondary" className="ml-2">
                {questions.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="results">
              Results
              <Badge variant="secondary" className="ml-2">
                {answers.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="questions" className="space-y-4">
            <QuestionManager
              questions={questions}
              onAddQuestion={handleAddQuestion}
              onToggleActive={handleToggleActive}
              onNextQuestion={handleNextQuestion}
              disabled={!isConnected}
            />
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            <ResultsView questions={questions} answers={answers} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Developer Console for SDS event monitoring */}
      <DevConsole />
    </div>
  );
}
