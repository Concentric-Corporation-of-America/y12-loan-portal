import { useState, useEffect } from 'react';
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
  start_date: string;
  maturity_date: string;
  payments_made: number;
  total_payments: number;
  paid_off_date?: string;
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

function getLoanIcon(type: string) {
  switch (type) {
    case 'auto': return Car;
    case 'home': return Home;
    case 'business': return Briefcase;
    default: return CreditCard;
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

export function MemberLoansPage() {
  const { user } = useAuth();
  const [activeLoans, setActiveLoans] = useState<Loan[]>([]);
  const [paidOffLoans, setPaidOffLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLoans() {
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
          const { data: activeData } = await supabase
            .from('loans')
            .select('*')
            .eq('member_id', memberData.id)
            .eq('status', 'active')
            .order('created_at', { ascending: false });

          if (activeData) {
            setActiveLoans(activeData);
          }

          // Fetch paid off loans
          const { data: paidOffData } = await supabase
            .from('loans')
            .select('*')
            .eq('member_id', memberData.id)
            .eq('status', 'paid_off')
            .order('paid_off_date', { ascending: false });

          if (paidOffData) {
            setPaidOffLoans(paidOffData);
          }
        }
      } catch (error) {
        console.error('Error fetching loans:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLoans();
  }, [user?.id]);

  const totalBalance = activeLoans.reduce((sum, loan) => sum + (loan.current_balance || 0), 0);
  const totalMonthlyPayment = activeLoans.reduce((sum, loan) => sum + (loan.monthly_payment || 0), 0);

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
            <div className="text-2xl font-bold">{activeLoans.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active Loans ({activeLoans.length})</TabsTrigger>
          <TabsTrigger value="paid_off">Paid Off ({paidOffLoans.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          {activeLoans.length > 0 ? (
            <div className="space-y-6">
              {activeLoans.map((loan) => {
                const LoanIcon = getLoanIcon(loan.loan_type);
                const progress = loan.original_amount > 0 
                  ? ((loan.original_amount - loan.current_balance) / loan.original_amount) * 100 
                  : 0;
                
                return (
                  <Card key={loan.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-lg bg-primary/10">
                            <LoanIcon className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-xl">{getLoanTypeName(loan.loan_type)}</CardTitle>
                            <CardDescription>{loan.loan_number}</CardDescription>
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
                          <p className="text-xl font-bold">{formatCurrency(loan.current_balance)}</p>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">Monthly Payment</span>
                          <p className="text-xl font-bold">{formatCurrency(loan.monthly_payment)}</p>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">Interest Rate</span>
                          <p className="text-xl font-bold">{loan.interest_rate}% APR</p>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">Next Payment</span>
                          <p className="text-xl font-bold">{loan.next_payment_date ? formatDate(loan.next_payment_date) : 'N/A'}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Loan Progress</span>
                          <span className="font-medium">
                            {loan.payments_made || 0} of {loan.total_payments || 0} payments
                          </span>
                        </div>
                        <Progress value={progress} className="h-3" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{loan.start_date ? `Started ${formatDate(loan.start_date)}` : ''}</span>
                          <span>{progress.toFixed(0)}% paid</span>
                          <span>{loan.maturity_date ? `Matures ${formatDate(loan.maturity_date)}` : ''}</span>
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
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No active loans</p>
                <Link to="/member/applications/new">
                  <Button variant="outline">Apply for a Loan</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="paid_off" className="mt-6">
          {paidOffLoans.length > 0 ? (
            <div className="space-y-6">
              {paidOffLoans.map((loan) => {
                const LoanIcon = getLoanIcon(loan.loan_type);
                
                return (
                  <Card key={loan.id} className="opacity-75">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-lg bg-muted">
                            <LoanIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div>
                            <CardTitle className="text-xl">{getLoanTypeName(loan.loan_type)}</CardTitle>
                            <CardDescription>{loan.loan_number}</CardDescription>
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
                          <p className="text-xl font-bold">{formatCurrency(loan.original_amount)}</p>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">Interest Rate</span>
                          <p className="text-xl font-bold">{loan.interest_rate}% APR</p>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">Paid Off Date</span>
                          <p className="text-xl font-bold">{loan.paid_off_date ? formatDate(loan.paid_off_date) : 'N/A'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No paid off loans</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
