/**
 * Results View Component
 * 
 * Displays answers with various visualizations
 */

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { Question, Answer } from '@/types/waku';
import { BarChart3, List, Cloud } from 'lucide-react';

interface ResultsViewProps {
  questions: Question[];
  answers: Answer[];
}

export function ResultsView({ questions, answers }: ResultsViewProps) {
  // Use state to track selected question
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);

  // Auto-select active question or first question on mount/change
  useEffect(() => {
    if (!selectedQuestionId || !questions.find(q => q.id === selectedQuestionId)) {
      const activeQuestion = questions.find(q => q.active);
      const defaultQuestion = activeQuestion || questions[0];
      if (defaultQuestion) {
        setSelectedQuestionId(defaultQuestion.id);
      }
    }
  }, [questions, selectedQuestionId]);

  const selectedQuestion = questions.find(q => q.id === selectedQuestionId);

  const questionAnswers = useMemo(() => {
    if (!selectedQuestion) return [];
    return answers.filter(a => a.questionId === selectedQuestion.id);
  }, [selectedQuestion, answers]);

  // Normalize answer text for grouping
  const normalizeAnswer = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[.,!?;:'"]+/g, '') // Remove punctuation
      .replace(/\s+/g, ' '); // Replace multiple spaces with single space
  };

  // Generate grouped answers with frequency for list view
  const groupedAnswers = useMemo(() => {
    const frequency = new Map<string, { text: string; count: number; firstTimestamp: number }>();
    
    questionAnswers.forEach(answer => {
      const normalized = normalizeAnswer(answer.text);
      const existing = frequency.get(normalized);
      
      if (existing) {
        existing.count += 1;
      } else {
        frequency.set(normalized, {
          text: answer.text, // Keep original for display
          count: 1,
          firstTimestamp: answer.timestamp
        });
      }
    });

    return Array.from(frequency.values())
      .sort((a, b) => b.count - a.count);
  }, [questionAnswers]);

  // Generate frequency data for pie chart
  const frequencyData = useMemo(() => {
    return groupedAnswers
      .map(({ text, count }) => ({ text: normalizeAnswer(text), count }))
      .slice(0, 10); // Top 10 answers
  }, [groupedAnswers]);

  // Colors for pie chart
  const COLORS = [
    'hsl(250, 70%, 58%)',
    'hsl(270, 65%, 65%)',
    'hsl(230, 70%, 55%)',
    'hsl(290, 65%, 60%)',
    'hsl(210, 70%, 60%)',
    'hsl(260, 65%, 58%)',
    'hsl(240, 70%, 62%)',
    'hsl(280, 65%, 63%)',
    'hsl(220, 70%, 57%)',
    'hsl(300, 65%, 65%)'
  ];

  // Word cloud data
  const wordCloudData = useMemo(() => {
    const words = new Map<string, number>();
    
    questionAnswers.forEach(answer => {
      // Split into words and count frequency
      answer.text.toLowerCase().split(/\s+/).forEach(word => {
        const cleaned = word.replace(/[^\w]/g, '');
        if (cleaned.length > 2) { // Skip very short words
          words.set(cleaned, (words.get(cleaned) || 0) + 1);
        }
      });
    });

    return Array.from(words.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }, [questionAnswers]);

  if (questions.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">No questions created yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Question Selector */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Select Question</CardTitle>
          <CardDescription>View results for specific questions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {questions.map((q) => {
              const count = answers.filter(a => a.questionId === q.id).length;
              return (
                <Badge
                  key={q.id}
                  variant={selectedQuestion?.id === q.id ? 'default' : 'outline'}
                  className="cursor-pointer py-2 px-4 hover:bg-primary/10 transition-colors"
                  onClick={() => setSelectedQuestionId(q.id)}
                >
                  {q.text.substring(0, 50)}... ({count})
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {selectedQuestion && (
        <Tabs defaultValue="list" className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="list">
              <List className="h-4 w-4 mr-2" />
              List
            </TabsTrigger>
            <TabsTrigger value="chart">
              <BarChart3 className="h-4 w-4 mr-2" />
              Chart
            </TabsTrigger>
            <TabsTrigger value="cloud">
              <Cloud className="h-4 w-4 mr-2" />
              Word Cloud
            </TabsTrigger>
          </TabsList>

          {/* List View */}
          <TabsContent value="list">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Grouped Answers</CardTitle>
                <CardDescription>
                  {questionAnswers.length} answer{questionAnswers.length !== 1 ? 's' : ''} received
                  {groupedAnswers.length !== questionAnswers.length && 
                    ` • ${groupedAnswers.length} unique`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {groupedAnswers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No answers yet.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {groupedAnswers.map((group, index) => (
                      <div
                        key={`${normalizeAnswer(group.text)}-${index}`}
                        className="p-3 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-medium flex-1">{group.text}</p>
                          <Badge variant="secondary" className="shrink-0">
                            {group.count}×
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          First received: {new Date(group.firstTimestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pie Chart View */}
          <TabsContent value="chart">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Answer Distribution</CardTitle>
                <CardDescription>Top 10 most common answers</CardDescription>
              </CardHeader>
              <CardContent>
                {frequencyData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No data to display.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={frequencyData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ text, count }) => `${text}: ${count}`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {frequencyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Word Cloud View */}
          <TabsContent value="cloud">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Word Frequency</CardTitle>
                <CardDescription>Most common words in answers</CardDescription>
              </CardHeader>
              <CardContent>
                {wordCloudData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No data to display.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-3 justify-center py-8">
                    {wordCloudData.map((item, index) => (
                      <span
                        key={item.word}
                        className="font-bold"
                        style={{
                          fontSize: `${Math.max(16, Math.min(48, item.count * 8))}px`,
                          color: COLORS[index % COLORS.length],
                          opacity: 0.8
                        }}
                      >
                        {item.word}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
