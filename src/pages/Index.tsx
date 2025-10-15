/**
 * Landing Page
 * 
 * Allows users to select their role (Admin or Attendee) and create/join instances
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { generateInstanceId } from '@/lib/waku';
import { getInstances, saveInstance } from '@/lib/storage';
import { UserCog, Users, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Version } from '@/components/Version';
import { PulseCheckLogo } from '@/components/PulseCheckLogo';

const Index = () => {
  const navigate = useNavigate();
  const [instanceId, setInstanceId] = useState('');
  const [recentInstances, setRecentInstances] = useState<any[]>([]);

  useEffect(() => {
    // Load recent instances
    const instances = getInstances();
    setRecentInstances(instances.slice(0, 3)); // Show 3 most recent
  }, []);

  const handleCreateInstance = () => {
    const newInstanceId = generateInstanceId();
    
    // Save the new instance
    saveInstance({
      id: newInstanceId,
      name: `Instance ${newInstanceId}`,
      questions: [],
      createdAt: Date.now()
    });
    
    toast.success('Instance created!');
    navigate(`/admin/${newInstanceId}`);
  };

  const handleJoinInstance = (e: React.FormEvent) => {
    e.preventDefault();
    if (instanceId.trim()) {
      navigate(`/attendee/${instanceId.trim().toUpperCase()}`);
    } else {
      toast.error('Please enter an instance ID');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PulseCheckLogo className="text-primary" size={32} />
              <div>
                <h1 className="text-2xl font-bold">PulseCheck</h1>
                <p className="text-sm text-muted-foreground">
                  Real-Time Audience Engagement
                </p>
              </div>
            </div>
            <Version />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Get the Pulse of Your Audience
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Real-time Q&A engagement powered by decentralized p2p communication.
              No servers, no databases, just peer-to-peer magic.
            </p>
          </div>

          {/* Recent Instances & Quick Actions */}
          {recentInstances.length > 0 && (
            <Card className="mb-8 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Instances</CardTitle>
                    <CardDescription>Continue where you left off</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/instances')}
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentInstances.map((instance) => (
                    <div
                      key={instance.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/5 transition-colors"
                    >
                      <div>
                        <code className="font-mono font-bold">{instance.id}</code>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {instance.questions.length} questions
                          </Badge>
                        </div>
                      </div>
                      <Button
                        onClick={() => navigate(`/admin/${instance.id}`)}
                        variant="outline"
                        size="sm"
                      >
                        Open
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Role Selection Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Admin Card */}
            <Card className="shadow-xl hover:shadow-2xl transition-shadow">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCog className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Admin / Presenter</CardTitle>
                <CardDescription className="text-base">
                  Create a new Q&A instance, manage questions, and view live results
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Create and manage questions</p>
                  <p>• Activate questions in real-time</p>
                  <p>• View answers with visualizations</p>
                  <p>• Share instance ID with attendees</p>
                </div>
                <Button
                  onClick={handleCreateInstance}
                  className="w-full"
                  size="lg"
                >
                  Create New Instance
                </Button>
              </CardContent>
            </Card>

            {/* Attendee Card */}
            <Card className="shadow-xl hover:shadow-2xl transition-shadow">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
                  <Users className="h-8 w-8 text-accent" />
                </div>
                <CardTitle className="text-2xl">Attendee</CardTitle>
                <CardDescription className="text-base">
                  Join an existing instance using the ID provided by your presenter
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Join with instance ID</p>
                  <p>• See questions as they activate</p>
                  <p>• Submit answers instantly</p>
                  <p>• No registration required</p>
                </div>
                <form onSubmit={handleJoinInstance} className="space-y-3">
                  <div>
                    <Label htmlFor="instanceId">Instance ID</Label>
                    <Input
                      id="instanceId"
                      placeholder="e.g., ABC123"
                      value={instanceId}
                      onChange={(e) => setInstanceId(e.target.value.toUpperCase())}
                      className="mt-1 text-center font-mono font-bold text-lg"
                      maxLength={6}
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="secondary"
                    className="w-full"
                    size="lg"
                  >
                    Join Instance
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Info Section */}
          <Card className="mt-12 shadow-lg bg-gradient-to-r from-primary/5 to-accent/5 border-none">
            <CardHeader>
              <CardTitle>About This Demo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Educational Purpose:</strong> This app demonstrates Waku Reliable Channels,
                a decentralized messaging protocol for p2p communication.
              </p>
              <p>
                <strong className="text-foreground">How It Works:</strong> Messages are sent directly between peers using Waku's
                light node protocol, with built-in reliability guarantees and message acknowledgments.
              </p>
              <p>
                <strong className="text-foreground">Use Cases:</strong> Perfect for workshops, presentations, classroom polls,
                and any scenario requiring real-time audience engagement without centralized servers.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
