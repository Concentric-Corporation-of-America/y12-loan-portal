import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CreditCard,
  Car,
  Home,
  Briefcase,
  Calendar,
  DollarSign,
  TrendingDown,
  FileText,
  Plus,
} from 'lucide-react';

const mockLoans = [
  {
    id: '1',
    type: 'auto',
    typeName: 'Auto Loan',
    loanNumber: 'AL-2024-001',
    balance: 18500,
    originalAmount: 25000,
    monthlyPayment: 485.50,
    nextPaymentDate: '2025-12-15',
    interestRate: 5.49,
    status: 'active',
    startDate: '2024-06-15',
    maturityDate: '2029-06-15',
    paymentsMade: 18,
    totalPayments: 60,
  },
  {
    id: '2',
    type: 'personal',
    typeName: 'Personal Loan',
    loanNumber: 'PL-2024-002',
    balance: 8200,
    originalAmount: 10000,
    monthlyPayment: 312.75,
    nextPaymentDate: '2025-12-01',
    interestRate: 9.99,
    status: 'active',
    startDate: '2024-09-01',
    maturityDate: '2027-09-01',
    paymentsMade: 3,
    totalPayments: 36,
  },
];

const mockPaidOffLoans = [
  {
    id: '3',
    type: 'personal',
    typeName: 'Personal Loan',
    loanNumber: 'PL-2023-001',
    originalAmount: 5000,
    interestRate: 10.99,
    status: 'paid_off',
    startDate: '2023-01-15',
    paidOffDate: '2024-01-15',
  },
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

function getLoanIcon(type: string) {
  switch (type) {
    case 'auto': return Car;
    case 'home': return Home;
    case 'business': return Briefcase;
    default: return CreditCard;
  }
}

export function MemberLoansPage() {
  const totalBalance = mockLoans.reduce((sum, loan) => sum + loan.balance, 0);
  const totalMonthlyPayment = mockLoans.reduce((sum, loan) => sum + loan.monthlyPayment, 0);

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Loans</h1>
          <p className="text-muted-foreground">Manage and track your loan accounts</p>
        </div>
        <Link to="/member/applications/new">
          <Button className="mt-4 md:mt-0 bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="mr-2 h-4 w-4" />
            Apply for a Loan
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Balance
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBalance)}</div>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Loans
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockLoans.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active Loans ({mockLoans.length})</TabsTrigger>
          <TabsTrigger value="paid_off">Paid Off ({mockPaidOffLoans.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          <div className="space-y-6">
            {mockLoans.map((loan) => {
              const LoanIcon = getLoanIcon(loan.type);
              const progress = ((loan.originalAmount - loan.balance) / loan.originalAmount) * 100;
              
              return (
                <Card key={loan.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-lg bg-primary/10">
                          <LoanIcon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">{loan.typeName}</CardTitle>
                          <CardDescription>{loan.loanNumber}</CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
                        Active
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                      <div>
                        <span className="text-sm text-muted-foreground">Current Balance</span>
                        <p className="text-xl font-bold">{formatCurrency(loan.balance)}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Monthly Payment</span>
                        <p className="text-xl font-bold">{formatCurrency(loan.monthlyPayment)}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Interest Rate</span>
                        <p className="text-xl font-bold">{loan.interestRate}% APR</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Next Payment</span>
                        <p className="text-xl font-bold">{formatDate(loan.nextPaymentDate)}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Loan Progress</span>
                        <span className="font-medium">
                          {loan.paymentsMade} of {loan.totalPayments} payments
                        </span>
                      </div>
                      <Progress value={progress} className="h-3" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Started {formatDate(loan.startDate)}</span>
                        <span>{progress.toFixed(0)}% paid</span>
                        <span>Matures {formatDate(loan.maturityDate)}</span>
                      </div>
                    </div>

                    <div className="flex gap-4 mt-6 pt-6 border-t">
                      <Button variant="outline" className="flex-1">
                        <FileText className="mr-2 h-4 w-4" />
                        View Details
                      </Button>
                      <Button className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">
                        <DollarSign className="mr-2 h-4 w-4" />
                        Make Payment
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="paid_off" className="mt-6">
          <div className="space-y-6">
            {mockPaidOffLoans.map((loan) => {
              const LoanIcon = getLoanIcon(loan.type);
              
              return (
                <Card key={loan.id} className="opacity-75">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-lg bg-muted">
                          <LoanIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">{loan.typeName}</CardTitle>
                          <CardDescription>{loan.loanNumber}</CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                        Paid Off
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-6">
                      <div>
                        <span className="text-sm text-muted-foreground">Original Amount</span>
                        <p className="text-xl font-bold">{formatCurrency(loan.originalAmount)}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Interest Rate</span>
                        <p className="text-xl font-bold">{loan.interestRate}% APR</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Paid Off Date</span>
                        <p className="text-xl font-bold">{formatDate(loan.paidOffDate!)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
