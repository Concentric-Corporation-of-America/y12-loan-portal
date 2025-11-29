import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CreditCard,
  DollarSign,
  FileText,
  TrendingUp,
  Calendar,
  ArrowRight,
  Plus,
  Bell,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';

interface Loan {
  id: string;
  loan_type: string;
  loan_number: string;
  current_balance: number;
  original_amount: number;
  monthly_payment: number;
  next_payment_date: string;
  interest_rate: number;
  status: string;
}

interface LoanApplication {
  id: string;
  loan_type: string;
  amount: number;
  status: string;
  created_at: string;
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

function getLoanTypeName(type: string): string {
  const typeNames: Record<string, string> = {
    personal: 'Personal Loan',
    auto: 'Auto Loan',
    home: 'Home Loan',
    business: 'Business Loan',
  };
  return typeNames[type] || type;
}

export function MemberDashboard() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<{ id: string; message: string; type: string }[]>([]);

  const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Member';

  useEffect(() => {
    async function fetchData() {
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
          // Fetch active loans
          const { data: loansData } = await supabase
            .from('loans')
            .select('*')
            .eq('member_id', memberData.id)
            .eq('status', 'active');

          if (loansData) {
            setLoans(loansData);
            
            // Generate notifications based on loans
            const newNotifications: { id: string; message: string; type: string }[] = [];
            loansData.forEach((loan) => {
              if (loan.next_payment_date) {
                const daysUntilPayment = Math.ceil(
                  (new Date(loan.next_payment_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                if (daysUntilPayment <= 7 && daysUntilPayment > 0) {
                  newNotifications.push({
                    id: `payment-${loan.id}`,
                    message: `Your payment of ${formatCurrency(loan.monthly_payment)} is due in ${daysUntilPayment} days`,
                    type: 'reminder',
                  });
                }
              }
            });
            setNotifications(newNotifications);
          }

          // Fetch pending applications
          const { data: applicationsData } = await supabase
            .from('loan_applications')
            .select('*')
            .eq('member_id', memberData.id)
            .in('status', ['submitted', 'under_review']);

          if (applicationsData) {
            setApplications(applicationsData);
            // Add notification for pending applications
            if (applicationsData.length > 0) {
              setNotifications((prev) => [
                ...prev,
                {
                  id: 'app-review',
                  message: `You have ${applicationsData.length} loan application(s) being reviewed`,
                  type: 'info',
                },
              ]);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [user?.id]);

  const totalBalance = loans.reduce((sum, loan) => sum + (loan.current_balance || 0), 0);
  const totalMonthlyPayment = loans.reduce((sum, loan) => sum + (loan.monthly_payment || 0), 0);

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
          <h1 className="text-3xl font-bold mb-2">Welcome back, {firstName}</h1>
          <p className="text-muted-foreground">Here's an overview of your accounts</p>
        </div>
        <Link to="/member/applications/new">
          <Button className="mt-4 md:mt-0 bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="mr-2 h-4 w-4" />
            Apply for a Loan
          </Button>
        </Link>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <Card className="mb-8 border-accent/50 bg-accent/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-accent mt-0.5" />
              <div className="space-y-1">
                {notifications.map((notification) => (
                  <p key={notification.id} className="text-sm">
                    {notification.message}
                  </p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Loan Balance
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBalance)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {loans.length} active loan{loans.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Payment
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalMonthlyPayment)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {loans.length > 0 && loans[0].next_payment_date 
                ? `Next payment: ${formatDate(loans[0].next_payment_date)}`
                : 'No upcoming payments'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Loans
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loans.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All in good standing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Applications
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{applications.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Under review
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Active Loans */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Active Loans</CardTitle>
              <CardDescription>Your current loan accounts</CardDescription>
            </div>
            <Link to="/member/loans">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {loans.length > 0 ? (
              loans.map((loan) => {
                const progress = loan.original_amount > 0 
                  ? ((loan.original_amount - loan.current_balance) / loan.original_amount) * 100 
                  : 0;
                return (
                  <div key={loan.id} className="p-4 rounded-lg border">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{getLoanTypeName(loan.loan_type)}</h4>
                        <p className="text-sm text-muted-foreground">{loan.loan_number}</p>
                      </div>
                      <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
                        {loan.interest_rate}% APR
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Balance</span>
                        <span className="font-medium">{formatCurrency(loan.current_balance)}</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{progress.toFixed(0)}% paid</span>
                        <span>of {formatCurrency(loan.original_amount)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Next payment: </span>
                        <span className="font-medium">{loan.next_payment_date ? formatDate(loan.next_payment_date) : 'N/A'}</span>
                      </div>
                      <span className="font-semibold text-primary">
                        {formatCurrency(loan.monthly_payment)}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No active loans</p>
                <Link to="/member/applications/new">
                  <Button variant="outline">Apply for a Loan</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity & Applications */}
        <div className="space-y-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Loan Applications</CardTitle>
                <CardDescription>Track your application status</CardDescription>
              </div>
              <Link to="/member/applications">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {applications.length > 0 ? (
                <div className="space-y-4">
                  {applications.map((app) => (
                    <div key={app.id} className="p-4 rounded-lg border">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{getLoanTypeName(app.loan_type)}</h4>
                          <p className="text-sm text-muted-foreground">
                            Submitted {formatDate(app.created_at)}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            app.status === 'under_review'
                              ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30'
                              : 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                          }
                        >
                          {app.status === 'under_review' ? 'Under Review' : 'Submitted'}
                        </Badge>
                      </div>
                      <div className="text-lg font-semibold">
                        {formatCurrency(app.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No pending applications</p>
                  <Link to="/member/applications/new">
                    <Button variant="outline">Apply for a Loan</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Link to="/member/applications/new">
                <Button variant="outline" className="w-full h-auto py-4 flex-col">
                  <Plus className="h-5 w-5 mb-2" />
                  <span>New Application</span>
                </Button>
              </Link>
              <Link to="/calculator">
                <Button variant="outline" className="w-full h-auto py-4 flex-col">
                  <DollarSign className="h-5 w-5 mb-2" />
                  <span>Loan Calculator</span>
                </Button>
              </Link>
              <Link to="/member/loans">
                <Button variant="outline" className="w-full h-auto py-4 flex-col">
                  <CreditCard className="h-5 w-5 mb-2" />
                  <span>View Loans</span>
                </Button>
              </Link>
              <Link to="/member/profile">
                <Button variant="outline" className="w-full h-auto py-4 flex-col">
                  <FileText className="h-5 w-5 mb-2" />
                  <span>My Profile</span>
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
