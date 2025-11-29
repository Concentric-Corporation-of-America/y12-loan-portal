import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileText,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';

interface LoanApplication {
  id: string;
  loan_type: string;
  amount: number;
  term_months: number;
  status: string;
  created_at: string;
  decision_date?: string;
  purpose?: string;
  approved_rate?: number;
  denial_reason?: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'draft':
      return (
        <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/30">
          <FileText className="mr-1 h-3 w-3" />
          Draft
        </Badge>
      );
    case 'submitted':
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
          <Clock className="mr-1 h-3 w-3" />
          Submitted
        </Badge>
      );
    case 'under_review':
      return (
        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
          <Clock className="mr-1 h-3 w-3" />
          Under Review
        </Badge>
      );
    case 'approved':
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
          <CheckCircle className="mr-1 h-3 w-3" />
          Approved
        </Badge>
      );
    case 'denied':
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
          <XCircle className="mr-1 h-3 w-3" />
          Denied
        </Badge>
      );
    case 'funded':
      return (
        <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
          <CheckCircle className="mr-1 h-3 w-3" />
          Funded
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getLoanTypeName(type: string): string {
  const typeNames: Record<string, string> = {
    personal: 'Personal Loan',
    auto: 'Auto Loan',
    home: 'Home Loan',
    business: 'Business Loan',
  };
  return typeNames[type] || type;
}

export function MemberApplicationsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const showSuccessMessage = location.state?.success;
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchApplications() {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch member data first
        const { data: memberData } = await supabase
          .from('members')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (memberData) {
          // Fetch all applications
          const { data: applicationsData } = await supabase
            .from('loan_applications')
            .select('*')
            .eq('member_id', memberData.id)
            .order('created_at', { ascending: false });

          if (applicationsData) {
            setApplications(applicationsData);
          }
        }
      } catch (error) {
        console.error('Error fetching applications:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchApplications();
  }, [user?.id]);

  const pendingApplications = applications.filter(
    (app) => ['draft', 'submitted', 'under_review'].includes(app.status)
  );
  const completedApplications = applications.filter(
    (app) => ['approved', 'denied', 'funded'].includes(app.status)
  );

  if (isLoading) {
    return (
      <div className="container py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Loan Applications</h1>
          <p className="text-muted-foreground">Track and manage your loan applications</p>
        </div>
        <Link to="/member/applications/new">
          <Button className="mt-4 md:mt-0 bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="mr-2 h-4 w-4" />
            New Application
          </Button>
        </Link>
      </div>

      {showSuccessMessage && (
        <Alert className="mb-8 border-accent/50 bg-accent/5">
          <CheckCircle className="h-4 w-4 text-accent" />
          <AlertDescription>
            Your loan application has been submitted successfully! We'll review it and get back to you within 2-3 business days.
          </AlertDescription>
        </Alert>
      )}

      {/* Pending Applications */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Pending Applications</h2>
        {pendingApplications.length > 0 ? (
          <div className="space-y-4">
            {pendingApplications.map((app) => (
              <Card key={app.id}>
                <CardContent className="py-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{getLoanTypeName(app.loan_type)}</h3>
                        <p className="text-sm text-muted-foreground">{app.purpose || 'Loan application'}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Submitted {formatDate(app.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col md:items-end gap-2">
                      {getStatusBadge(app.status)}
                      <div className="text-xl font-bold">{formatCurrency(app.amount)}</div>
                      <div className="text-sm text-muted-foreground">{app.term_months} months</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No pending applications</p>
              <Link to="/member/applications/new">
                <Button variant="outline">Start a New Application</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Completed Applications */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Application History</h2>
        {completedApplications.length > 0 ? (
          <div className="space-y-4">
            {completedApplications.map((app) => (
              <Card key={app.id} className={app.status === 'denied' ? 'opacity-75' : ''}>
                <CardContent className="py-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${app.status === 'approved' || app.status === 'funded' ? 'bg-accent/10' : 'bg-muted'}`}>
                        <FileText className={`h-6 w-6 ${app.status === 'approved' || app.status === 'funded' ? 'text-accent' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{getLoanTypeName(app.loan_type)}</h3>
                        <p className="text-sm text-muted-foreground">{app.purpose || 'Loan application'}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Decision: {formatDate(app.decision_date || app.created_at)}
                        </p>
                        {app.status === 'approved' && app.approved_rate && (
                          <p className="text-sm text-accent mt-1">
                            Approved at {app.approved_rate}% APR
                          </p>
                        )}
                        {app.status === 'denied' && app.denial_reason && (
                          <p className="text-sm text-destructive mt-1">
                            Reason: {app.denial_reason}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col md:items-end gap-2">
                      {getStatusBadge(app.status)}
                      <div className="text-xl font-bold">{formatCurrency(app.amount)}</div>
                      <Button variant="ghost" size="sm">
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No application history</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
