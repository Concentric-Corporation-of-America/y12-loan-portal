import { useState } from 'react';
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
} from 'lucide-react';

const mockPendingApplications = [
  {
    id: '1',
    memberName: 'John Smith',
    memberEmail: 'john.smith@email.com',
    type: 'Home Loan',
    amount: 250000,
    term: 360,
    status: 'under_review',
    submittedDate: '2025-11-20',
    creditScore: 720,
    annualIncome: 85000,
    dti: 32,
  },
  {
    id: '2',
    memberName: 'Sarah Johnson',
    memberEmail: 'sarah.j@email.com',
    type: 'Auto Loan',
    amount: 45000,
    term: 60,
    status: 'submitted',
    submittedDate: '2025-11-25',
    creditScore: 680,
    annualIncome: 62000,
    dti: 28,
  },
  {
    id: '3',
    memberName: 'Michael Brown',
    memberEmail: 'm.brown@email.com',
    type: 'Personal Loan',
    amount: 15000,
    term: 36,
    status: 'submitted',
    submittedDate: '2025-11-28',
    creditScore: 750,
    annualIncome: 95000,
    dti: 22,
  },
  {
    id: '4',
    memberName: 'Emily Davis',
    memberEmail: 'emily.d@email.com',
    type: 'Business Loan',
    amount: 100000,
    term: 84,
    status: 'under_review',
    submittedDate: '2025-11-18',
    creditScore: 695,
    annualIncome: 120000,
    dti: 35,
  },
];

const mockRecentDecisions = [
  {
    id: '5',
    memberName: 'Robert Wilson',
    type: 'Auto Loan',
    amount: 35000,
    status: 'approved',
    decisionDate: '2025-11-27',
    decidedBy: 'Admin User',
    approvedRate: 5.49,
  },
  {
    id: '6',
    memberName: 'Lisa Anderson',
    type: 'Personal Loan',
    amount: 8000,
    status: 'denied',
    decisionDate: '2025-11-26',
    decidedBy: 'Admin User',
    denialReason: 'High DTI ratio',
  },
];

const stats = {
  totalApplications: 156,
  pendingReview: 4,
  approvedThisMonth: 42,
  totalFunded: 2850000,
  averageProcessingTime: 2.3,
  approvalRate: 78,
};

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

function getRiskLevel(creditScore: number, dti: number) {
  if (creditScore >= 720 && dti <= 30) return { level: 'Low', color: 'text-green-600 bg-green-500/10' };
  if (creditScore >= 660 && dti <= 40) return { level: 'Medium', color: 'text-yellow-600 bg-yellow-500/10' };
  return { level: 'High', color: 'text-red-600 bg-red-500/10' };
}

export function AdminDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredApplications = mockPendingApplications.filter((app) => {
    const matchesSearch =
      app.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.memberEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const matchesType = typeFilter === 'all' || app.type.toLowerCase().includes(typeFilter.toLowerCase());
    return matchesSearch && matchesStatus && matchesType;
  });

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
            Pending Applications ({mockPendingApplications.length})
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
                      const risk = getRiskLevel(app.creditScore, app.dti);
                      return (
                        <tr key={app.id} className="border-b hover:bg-muted/30">
                          <td className="py-4 px-4">
                            <div>
                              <div className="font-medium">{app.memberName}</div>
                              <div className="text-sm text-muted-foreground">{app.memberEmail}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Submitted {formatDate(app.submittedDate)}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div>
                              <div className="font-medium">{app.type}</div>
                              <div className="text-lg font-bold text-primary">
                                {formatCurrency(app.amount)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {app.term} months
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="space-y-1">
                              <div className="text-sm">
                                <span className="text-muted-foreground">Score: </span>
                                <span className="font-medium">{app.creditScore}</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">Income: </span>
                                <span className="font-medium">{formatCurrency(app.annualIncome)}</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">DTI: </span>
                                <span className="font-medium">{app.dti}%</span>
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
            {mockRecentDecisions.map((decision) => (
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
                        <div className="font-medium">{decision.memberName}</div>
                        <div className="text-sm text-muted-foreground">
                          {decision.type} - {formatCurrency(decision.amount)}
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
                        {formatDate(decision.decisionDate)} by {decision.decidedBy}
                      </div>
                      {decision.status === 'approved' && decision.approvedRate && (
                        <div className="text-sm text-accent">at {decision.approvedRate}% APR</div>
                      )}
                      {decision.status === 'denied' && decision.denialReason && (
                        <div className="text-sm text-destructive">{decision.denialReason}</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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
