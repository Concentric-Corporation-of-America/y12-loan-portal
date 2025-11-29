import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Eye,
  UserCheck,
  AlertTriangle,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/services/supabase';

interface PendingApplication {
  id: string;
  member_id: string;
  member_name: string;
  member_email: string;
  loan_type: string;
  amount: number;
  term_months: number;
  status: string;
  created_at: string;
  credit_score?: number;
  annual_income?: number;
  debt_to_income_ratio?: number;
}

interface RecentDecision {
  id: string;
  member_name: string;
  loan_type: string;
  amount: number;
  status: string;
  decision_date: string;
  decided_by: string;
  approved_rate?: number;
  denial_reason?: string;
}

interface Stats {
  totalApplications: number;
  pendingReview: number;
  approvedThisMonth: number;
  totalFunded: number;
  averageProcessingTime: number;
  approvalRate: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getRiskLevel(creditScore: number | undefined, dti: number | undefined) {
  const score = creditScore || 650;
  const ratio = dti || 35;
  if (score >= 720 && ratio <= 30) return { level: 'Low', color: 'text-green-600 bg-green-500/10' };
  if (score >= 660 && ratio <= 40) return { level: 'Medium', color: 'text-yellow-600 bg-yellow-500/10' };
  return { level: 'High', color: 'text-red-600 bg-red-500/10' };
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

export function AdminDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [pendingApplications, setPendingApplications] = useState<PendingApplication[]>([]);
  const [recentDecisions, setRecentDecisions] = useState<RecentDecision[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalApplications: 0,
    pendingReview: 0,
    approvedThisMonth: 0,
    totalFunded: 0,
    averageProcessingTime: 2.3,
    approvalRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch pending applications with member info
        const { data: pendingData } = await supabase
          .from('loan_applications')
          .select(`
            id,
            member_id,
            loan_type,
            amount,
            term_months,
            status,
            created_at,
            credit_score,
            annual_income,
            debt_to_income_ratio,
            members (
              first_name,
              last_name,
              email
            )
          `)
          .in('status', ['submitted', 'under_review'])
          .order('created_at', { ascending: false });

        if (pendingData) {
          const formattedPending = pendingData.map((app: Record<string, unknown>) => {
            const member = app.members as { first_name?: string; last_name?: string; email?: string } | null;
            return {
              id: app.id as string,
              member_id: app.member_id as string,
              member_name: member ? `${member.first_name || ''} ${member.last_name || ''}`.trim() : 'Unknown',
              member_email: member?.email || 'N/A',
              loan_type: app.loan_type as string,
              amount: app.amount as number,
              term_months: app.term_months as number,
              status: app.status as string,
              created_at: app.created_at as string,
              credit_score: app.credit_score as number | undefined,
              annual_income: app.annual_income as number | undefined,
              debt_to_income_ratio: app.debt_to_income_ratio as number | undefined,
            };
          });
          setPendingApplications(formattedPending);
        }

        // Fetch recent decisions (approved or denied)
        const { data: decisionsData } = await supabase
          .from('loan_applications')
          .select(`
            id,
            loan_type,
            amount,
            status,
            decision_date,
            approved_rate,
            denial_reason,
            members (
              first_name,
              last_name
            )
          `)
          .in('status', ['approved', 'denied'])
          .order('decision_date', { ascending: false })
          .limit(10);

        if (decisionsData) {
          const formattedDecisions = decisionsData.map((dec: Record<string, unknown>) => {
            const member = dec.members as { first_name?: string; last_name?: string } | null;
            return {
              id: dec.id as string,
              member_name: member ? `${member.first_name || ''} ${member.last_name || ''}`.trim() : 'Unknown',
              loan_type: dec.loan_type as string,
              amount: dec.amount as number,
              status: dec.status as string,
              decision_date: (dec.decision_date || dec.created_at) as string,
              decided_by: 'Admin',
              approved_rate: dec.approved_rate as number | undefined,
              denial_reason: dec.denial_reason as string | undefined,
            };
          });
          setRecentDecisions(formattedDecisions);
        }

        // Calculate stats
        const { count: totalCount } = await supabase
          .from('loan_applications')
          .select('*', { count: 'exact', head: true });

        const { count: pendingCount } = await supabase
          .from('loan_applications')
          .select('*', { count: 'exact', head: true })
          .in('status', ['submitted', 'under_review']);

        // Get approved this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { count: approvedCount } = await supabase
          .from('loan_applications')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'approved')
          .gte('decision_date', startOfMonth.toISOString());

        // Get total funded this month
        const { data: fundedData } = await supabase
          .from('loans')
          .select('original_amount')
          .gte('created_at', startOfMonth.toISOString());

        const totalFunded = fundedData?.reduce((sum, loan) => sum + (loan.original_amount || 0), 0) || 0;

        // Calculate approval rate
        const { count: totalDecided } = await supabase
          .from('loan_applications')
          .select('*', { count: 'exact', head: true })
          .in('status', ['approved', 'denied']);

        const approvalRate = totalDecided && approvedCount ? Math.round((approvedCount / totalDecided) * 100) : 0;

        setStats({
          totalApplications: totalCount || 0,
          pendingReview: pendingCount || 0,
          approvedThisMonth: approvedCount || 0,
          totalFunded,
          averageProcessingTime: 2.3,
          approvalRate,
        });
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const filteredApplications = pendingApplications.filter((app) => {
    const matchesSearch =
      app.member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.member_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const matchesType = typeFilter === 'all' || app.loan_type.toLowerCase().includes(typeFilter.toLowerCase());
    return matchesSearch && matchesStatus && matchesType;
  });

  if (isLoading) {
    return (
      <div className="container py-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage loan applications and member accounts</p>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Review
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingReview}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requires attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approved This Month
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approvedThisMonth}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.approvalRate}% approval rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Funded
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalFunded)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Processing Time
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageProcessingTime} days</div>
            <p className="text-xs text-muted-foreground mt-1">
              Target: 3 days
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending Applications ({pendingApplications.length})
          </TabsTrigger>
          <TabsTrigger value="recent" className="gap-2">
            <FileText className="h-4 w-4" />
            Recent Decisions
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Loan Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="home">Home</SelectItem>
                <SelectItem value="business">Business</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Applications Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-3 px-4 font-medium">Applicant</th>
                      <th className="text-left py-3 px-4 font-medium">Loan Details</th>
                      <th className="text-left py-3 px-4 font-medium">Credit Info</th>
                      <th className="text-left py-3 px-4 font-medium">Risk</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-right py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplications.map((app) => {
                      const risk = getRiskLevel(app.credit_score, app.debt_to_income_ratio);
                      return (
                        <tr key={app.id} className="border-b hover:bg-muted/30">
                          <td className="py-4 px-4">
                            <div>
                              <div className="font-medium">{app.member_name}</div>
                              <div className="text-sm text-muted-foreground">{app.member_email}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Submitted {formatDate(app.created_at)}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div>
                              <div className="font-medium">{getLoanTypeName(app.loan_type)}</div>
                              <div className="text-lg font-bold text-primary">
                                {formatCurrency(app.amount)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {app.term_months} months
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="space-y-1">
                              <div className="text-sm">
                                <span className="text-muted-foreground">Score: </span>
                                <span className="font-medium">{app.credit_score || 'N/A'}</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">Income: </span>
                                <span className="font-medium">{app.annual_income ? formatCurrency(app.annual_income) : 'N/A'}</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">DTI: </span>
                                <span className="font-medium">{app.debt_to_income_ratio ? `${app.debt_to_income_ratio}%` : 'N/A'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge variant="outline" className={risk.color}>
                              {risk.level === 'High' && <AlertTriangle className="mr-1 h-3 w-3" />}
                              {risk.level} Risk
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
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
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm">
                                <Eye className="mr-1 h-4 w-4" />
                                Review
                              </Button>
                              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                                <UserCheck className="mr-1 h-4 w-4" />
                                Decide
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="mt-6">
          <div className="space-y-4">
            {recentDecisions.length > 0 ? (
              recentDecisions.map((decision) => (
                <Card key={decision.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-2 rounded-full ${
                            decision.status === 'approved' ? 'bg-green-500/10' : 'bg-red-500/10'
                          }`}
                        >
                          {decision.status === 'approved' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{decision.member_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {getLoanTypeName(decision.loan_type)} - {formatCurrency(decision.amount)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant="outline"
                          className={
                            decision.status === 'approved'
                              ? 'bg-green-500/10 text-green-600 border-green-500/30'
                              : 'bg-red-500/10 text-red-600 border-red-500/30'
                          }
                        >
                          {decision.status === 'approved' ? 'Approved' : 'Denied'}
                        </Badge>
                        <div className="text-sm text-muted-foreground mt-1">
                          {formatDate(decision.decision_date)} by {decision.decided_by}
                        </div>
                        {decision.status === 'approved' && decision.approved_rate && (
                          <div className="text-sm text-accent">at {decision.approved_rate}% APR</div>
                        )}
                        {decision.status === 'denied' && decision.denial_reason && (
                          <div className="text-sm text-destructive">{decision.denial_reason}</div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No recent decisions</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Application Volume</CardTitle>
                <CardDescription>Monthly application trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Chart placeholder - integrate with Recharts
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Approval Rate</CardTitle>
                <CardDescription>By loan type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Personal Loans</span>
                      <span className="font-medium">82%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-accent" style={{ width: '82%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Auto Loans</span>
                      <span className="font-medium">85%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-accent" style={{ width: '85%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Home Loans</span>
                      <span className="font-medium">72%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-accent" style={{ width: '72%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Business Loans</span>
                      <span className="font-medium">68%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-accent" style={{ width: '68%' }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
