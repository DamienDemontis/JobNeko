'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  SaveIcon,
  XIcon,
  DollarSignIcon,
  BriefcaseIcon,
  MapPinIcon,
  BuildingIcon,
  LinkIcon,
  FileTextIcon,
  TagIcon,
  GiftIcon
} from 'lucide-react';

interface JobEditFormProps {
  job: any;
  onSave?: (updatedJob: any) => void;
  onCancel?: () => void;
}

const contractTypes = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'internship', label: 'Internship' },
  { value: 'temporary', label: 'Temporary' },
];

const workModes = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
];

const priorityLevels = [
  { value: 'low', label: 'Low Priority', color: 'bg-green-100 text-green-800' },
  { value: 'medium', label: 'Medium Priority', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High Priority', color: 'bg-red-100 text-red-800' },
];

const applicationStatuses = [
  { value: 'not_applied', label: 'Not Applied' },
  { value: 'applied', label: 'Applied' },
  { value: 'phone_screening', label: 'Phone Screening' },
  { value: 'phone_screening_completed', label: 'Phone Screening Completed' },
  { value: 'technical_assessment', label: 'Technical Assessment' },
  { value: 'first_interview', label: 'First Interview' },
  { value: 'second_interview', label: 'Second Interview' },
  { value: 'final_interview', label: 'Final Interview' },
  { value: 'reference_check', label: 'Reference Check' },
  { value: 'offer_extended', label: 'Offer Extended' },
  { value: 'offer_accepted', label: 'Offer Accepted' },
  { value: 'offer_rejected', label: 'Offer Rejected' },
  { value: 'application_rejected', label: 'Application Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

export default function JobEditForm({ job, onSave, onCancel }: JobEditFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    salary: '',
    salaryMin: '',
    salaryMax: '',
    contractType: '',
    workMode: '',
    description: '',
    requirements: '',
    skills: '',
    perks: '',
    url: '',
    applicationStatus: '',
    priority: '',
    notes: '',
    privateNotes: '',
  });
  
  const [loading, setSaving] = useState(false);

  useEffect(() => {
    if (job) {
      setFormData({
        title: job.title || '',
        company: job.company || '',
        location: job.location || '',
        salary: job.salary || '',
        salaryMin: job.salaryMin?.toString() || '',
        salaryMax: job.salaryMax?.toString() || '',
        contractType: job.contractType || '',
        workMode: job.workMode || '',
        description: job.description || '',
        requirements: job.requirements || '',
        skills: job.skills || '',
        perks: job.perks || '',
        url: job.url || '',
        applicationStatus: job.applicationStatus || '',
        priority: job.priority || '',
        notes: job.notes || '',
        privateNotes: job.privateNotes || '',
      });
    }
  }, [job]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      // Prepare the data for API
      const updateData = {
        ...formData,
        salaryMin: formData.salaryMin ? parseFloat(formData.salaryMin) : undefined,
        salaryMax: formData.salaryMax ? parseFloat(formData.salaryMax) : undefined,
      };

      // Remove empty strings
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof typeof updateData] === '') {
          delete updateData[key as keyof typeof updateData];
        }
      });

      const response = await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update job');
      }

      const { job: updatedJob } = await response.json();
      toast.success('Job updated successfully!');
      
      if (onSave) {
        onSave(updatedJob);
      }
    } catch (error) {
      console.error('Error updating job:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update job');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BriefcaseIcon className="w-5 h-5" />
            Edit Job: {job?.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Job Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Senior Software Engineer"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="company">Company *</Label>
              <div className="relative">
                <BuildingIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  placeholder="Acme Corporation"
                  className="pl-10 mt-1"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location">Location</Label>
              <div className="relative">
                <MapPinIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="San Francisco, CA"
                  className="pl-10 mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="url">Job URL</Label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => handleInputChange('url', e.target.value)}
                  placeholder="https://company.com/jobs/123"
                  className="pl-10 mt-1"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Salary Information */}
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <DollarSignIcon className="w-5 h-5" />
              Salary Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="salary">Salary Range (Text)</Label>
                <Input
                  id="salary"
                  value={formData.salary}
                  onChange={(e) => handleInputChange('salary', e.target.value)}
                  placeholder="$80,000 - $120,000"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Original salary text from job posting
                </p>
              </div>
              <div>
                <Label htmlFor="salaryMin">Min Salary ($)</Label>
                <Input
                  id="salaryMin"
                  type="number"
                  value={formData.salaryMin}
                  onChange={(e) => handleInputChange('salaryMin', e.target.value)}
                  placeholder="80000"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="salaryMax">Max Salary ($)</Label>
                <Input
                  id="salaryMax"
                  type="number"
                  value={formData.salaryMax}
                  onChange={(e) => handleInputChange('salaryMax', e.target.value)}
                  placeholder="120000"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Job Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contractType">Contract Type</Label>
              <Select value={formData.contractType} onValueChange={(value) => handleInputChange('contractType', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select contract type" />
                </SelectTrigger>
                <SelectContent>
                  {contractTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="workMode">Work Mode</Label>
              <Select value={formData.workMode} onValueChange={(value) => handleInputChange('workMode', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select work mode" />
                </SelectTrigger>
                <SelectContent>
                  {workModes.map(mode => (
                    <SelectItem key={mode.value} value={mode.value}>{mode.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="skills">Required Skills</Label>
            <div className="relative">
              <TagIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="skills"
                value={formData.skills}
                onChange={(e) => handleInputChange('skills', e.target.value)}
                placeholder="React, TypeScript, Node.js, PostgreSQL"
                className="pl-10 mt-1"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Comma-separated list of required skills
            </p>
          </div>

          <Separator />

          {/* Application Status */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Application Tracking</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="applicationStatus">Application Status</Label>
                <Select value={formData.applicationStatus} onValueChange={(value) => handleInputChange('applicationStatus', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {applicationStatuses.map(status => (
                      <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityLevels.map(priority => (
                      <SelectItem key={priority.value} value={priority.value}>{priority.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Detailed Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="description">Job Description</Label>
              <div className="relative">
                <FileTextIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Detailed job description..."
                  className="min-h-[120px] pl-10 mt-1"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="requirements">Requirements</Label>
              <Textarea
                id="requirements"
                value={formData.requirements}
                onChange={(e) => handleInputChange('requirements', e.target.value)}
                placeholder="Required qualifications and experience..."
                className="min-h-[100px] mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="perks">Benefits & Perks</Label>
              <div className="relative">
                <GiftIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Textarea
                  id="perks"
                  value={formData.perks}
                  onChange={(e) => handleInputChange('perks', e.target.value)}
                  placeholder="Health insurance, 401k, flexible hours..."
                  className="min-h-[80px] pl-10 mt-1"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">Public Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="General notes about this opportunity..."
                className="min-h-[80px] mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="privateNotes">Private Notes</Label>
              <Textarea
                id="privateNotes"
                value={formData.privateNotes}
                onChange={(e) => handleInputChange('privateNotes', e.target.value)}
                placeholder="Private notes (salary expectations, concerns, etc.)"
                className="min-h-[80px] mt-1"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              <XIcon className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || !formData.title || !formData.company}
            >
              <SaveIcon className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}