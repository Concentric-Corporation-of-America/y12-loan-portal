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
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const mockLoans = [
  {
    id: '1',
    type: 'Auto Loan',
    loanNumber: 'AL-2024-001',
    balance: 18500,
    originalAmount: 25000,
    monthlyPayment: 485.50,
    nextPaymentDate: '2025-12-15',
    interestRate: 5.49,
    status: 'active',
  },
  {
    id: '2',
    type: 'Personal Loan',
    loanNumber: 'PL-2024-002',
    balance: 8200,
    originalAmount: 10000,
    monthlyPayment: 312.75,
    nextPaymentDate: '2025-12-01',
    interestRate: 9.99,
    status: 'active',
  },
];

const mockApplications = [
  {
    id: '1',
    type: 'Home Loan',
    amount: 250000,
    status: 'under_review',
    submittedDate: '2025-11-20',
  },
];

const notifications = [
  { id: '1', message: 'Your payment of $485.50 is due in 5 days', type: 'reminder' },
  { id: '2', message: 'Your loan application is being reviewed', type: 'info' },
];

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

export function MemberDashboard() {
  const { user } = useAuth();
  const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Member';

  const totalBalance = mockLoans.reduce((sum, loan) => sum + loan.balance, 0);
  const totalMonthlyPayment = mockLoans.reduce((sum, loan) => sum + loan.monthlyPayment, 0);

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
              Across {mockLoans.length} active loans
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
              Next payment: Dec 1, 2025
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
            <div className="text-2xl font-bold">{mockLoans.length}</div>
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
            <div className="text-2xl font-bold">{mockApplications.length}</div>
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
            {mockLoans.map((loan) => {
              const progress = ((loan.originalAmount - loan.balance) / loan.originalAmount) * 100;
              return (
                <div key={loan.id} className="p-4 rounded-lg border">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{loan.type}</h4>
                      <p className="text-sm text-muted-foreground">{loan.loanNumber}</p>
                    </div>
                    <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
                      {loan.interestRate}% APR
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Balance</span>
                      <span className="font-medium">{formatCurrency(loan.balance)}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{progress.toFixed(0)}% paid</span>
                      <span>of {formatCurrency(loan.originalAmount)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Next payment: </span>
                      <span className="font-medium">{formatDate(loan.nextPaymentDate)}</span>
                    </div>
                    <span className="font-semibold text-primary">
                      {formatCurrency(loan.monthlyPayment)}
                    </span>
                  </div>
                </div>
              );
            })}
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
              {mockApplications.length > 0 ? (
                <div className="space-y-4">
                  {mockApplications.map((app) => (
                    <div key={app.id} className="p-4 rounded-lg border">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{app.type}</h4>
                          <p className="text-sm text-muted-foreground">
                            Submitted {formatDate(app.submittedDate)}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
                        >
                          Under Review
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
