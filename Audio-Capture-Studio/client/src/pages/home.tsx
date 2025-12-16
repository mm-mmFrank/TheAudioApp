import { useState } from "react";
import { useLocation } from "wouter";
import { Radio, Users, Music2, Headphones, ArrowRight, Plus, LogIn } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ThemeToggle } from "@/components/theme-toggle";
import { createSessionSchema, joinSessionSchema, type CreateSessionInput, type JoinSessionInput } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const createForm = useForm<CreateSessionInput>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      sessionName: "",
      hostName: "",
    },
  });

  const joinForm = useForm<JoinSessionInput>({
    resolver: zodResolver(joinSessionSchema),
    defaultValues: {
      sessionId: "",
      guestName: "",
    },
  });

  const createSession = useMutation({
    mutationFn: async (data: CreateSessionInput) => {
      const response = await apiRequest("POST", "/api/sessions", data);
      return response.json();
    },
    onSuccess: (data) => {
      setLocation(`/studio/${data.id}?name=${encodeURIComponent(createForm.getValues("hostName"))}&host=true`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create session",
        variant: "destructive",
      });
    },
  });

  const joinSession = useMutation({
    mutationFn: async (data: JoinSessionInput) => {
      const response = await apiRequest("GET", `/api/sessions/${data.sessionId}`);
      if (!response.ok) throw new Error("Session not found");
      return response.json();
    },
    onSuccess: (_, variables) => {
      setLocation(`/studio/${variables.sessionId}?name=${encodeURIComponent(variables.guestName)}`);
    },
    onError: () => {
      toast({
        title: "Session not found",
        description: "Please check the session ID and try again",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center">
              <Radio className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-xl">PodcastStudio</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Record Professional Podcasts Together
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Bring remote guests into your studio, play music like a radio show, and record it all in high quality.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Remote Guests</CardTitle>
              <CardDescription>
                Invite guests with a simple link. They join instantly in their browser.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Music2 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Music Integration</CardTitle>
              <CardDescription>
                Play music from Spotify during your recording like a real radio show.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Headphones className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">High Quality Recording</CardTitle>
              <CardDescription>
                Record everyone in crystal clear audio with local recording backup.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="max-w-md mx-auto">
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create" data-testid="tab-create-session">
                <Plus className="h-4 w-4 mr-2" />
                Create Session
              </TabsTrigger>
              <TabsTrigger value="join" data-testid="tab-join-session">
                <LogIn className="h-4 w-4 mr-2" />
                Join Session
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create">
              <Card>
                <CardHeader>
                  <CardTitle>Start a New Recording Session</CardTitle>
                  <CardDescription>
                    Create a session and invite guests to join you
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...createForm}>
                    <form
                      onSubmit={createForm.handleSubmit((data) => createSession.mutate(data))}
                      className="space-y-4"
                    >
                      <FormField
                        control={createForm.control}
                        name="sessionName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Session Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="My Awesome Podcast"
                                {...field}
                                data-testid="input-session-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createForm.control}
                        name="hostName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Your Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="John Doe"
                                {...field}
                                data-testid="input-host-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full gap-2"
                        disabled={createSession.isPending}
                        data-testid="button-create-session"
                      >
                        {createSession.isPending ? (
                          "Creating..."
                        ) : (
                          <>
                            Create Session
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="join">
              <Card>
                <CardHeader>
                  <CardTitle>Join an Existing Session</CardTitle>
                  <CardDescription>
                    Enter the session ID shared by the host
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...joinForm}>
                    <form
                      onSubmit={joinForm.handleSubmit((data) => joinSession.mutate(data))}
                      className="space-y-4"
                    >
                      <FormField
                        control={joinForm.control}
                        name="sessionId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Session ID</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="abc123..."
                                {...field}
                                data-testid="input-session-id"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={joinForm.control}
                        name="guestName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Your Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Jane Doe"
                                {...field}
                                data-testid="input-guest-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full gap-2"
                        disabled={joinSession.isPending}
                        data-testid="button-join-session"
                      >
                        {joinSession.isPending ? (
                          "Joining..."
                        ) : (
                          <>
                            Join Session
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
