import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Job Tracker
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Extract, organize, and track job applications with AI-powered matching. 
            Never lose track of an opportunity again.
          </p>
          <div className="space-x-4">
            <Button asChild size="lg">
              <Link href="/register">Get Started</Link>
            </Button>
            <Button variant="outline" asChild size="lg">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="text-2xl mr-2">🔍</span>
                Extract Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Use our Chrome extension to extract job information from any website with a single click.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="text-2xl mr-2">🎯</span>
                AI Matching
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Upload your resume and get AI-powered match scores to see which jobs fit your profile best.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="text-2xl mr-2">📊</span>
                Track Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Organize applications with ratings, notes, and status tracking in your personal dashboard.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold mb-8">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h3 className="font-semibold mb-2">Install Extension</h3>
              <p className="text-gray-600">Add our Chrome extension to your browser</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <h3 className="font-semibold mb-2">Extract Jobs</h3>
              <p className="text-gray-600">Click extract on any job posting page</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 font-bold">3</span>
              </div>
              <h3 className="font-semibold mb-2">Manage & Track</h3>
              <p className="text-gray-600">Organize and track in your dashboard</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
