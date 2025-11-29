import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, DollarSign, Percent, Calendar, TrendingUp, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const loanTypes = [
  { value: 'personal', label: 'Personal Loan', minRate: 8.99, maxRate: 17.99 },
  { value: 'auto', label: 'Auto Loan', minRate: 5.49, maxRate: 12.99 },
  { value: 'home', label: 'Home Loan', minRate: 6.25, maxRate: 8.50 },
  { value: 'business', label: 'Business Loan', minRate: 7.99, maxRate: 15.99 },
];

const termOptions = {
  personal: [12, 24, 36, 48, 60],
  auto: [24, 36, 48, 60, 72, 84],
  home: [180, 240, 300, 360],
  business: [12, 24, 36, 48, 60, 84, 120],
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function calculateMonthlyPayment(principal: number, annualRate: number, termMonths: number): number {
  if (principal <= 0 || termMonths <= 0) return 0;
  if (annualRate <= 0) return principal / termMonths;
  
  const monthlyRate = annualRate / 100 / 12;
  const payment = (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                  (Math.pow(1 + monthlyRate, termMonths) - 1);
  return payment;
}

function generateAmortizationSchedule(principal: number, annualRate: number, termMonths: number) {
  const schedule = [];
  let balance = principal;
  const monthlyRate = annualRate / 100 / 12;
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, termMonths);

  for (let month = 1; month <= termMonths; month++) {
    const interestPayment = balance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    balance = Math.max(0, balance - principalPayment);

    schedule.push({
      month,
      payment: monthlyPayment,
      principal: principalPayment,
      interest: interestPayment,
      balance,
    });
  }

  return schedule;
}

export function CalculatorPage() {
  const [loanType, setLoanType] = useState('personal');
  const [amount, setAmount] = useState(25000);
  const [rate, setRate] = useState(8.99);
  const [term, setTerm] = useState(36);

  const selectedLoanType = loanTypes.find((t) => t.value === loanType) || loanTypes[0];
  const availableTerms = termOptions[loanType as keyof typeof termOptions] || termOptions.personal;

  const monthlyPayment = useMemo(() => {
    return calculateMonthlyPayment(amount, rate, term);
  }, [amount, rate, term]);

  const totalPayment = monthlyPayment * term;
  const totalInterest = totalPayment - amount;

  const amortizationSchedule = useMemo(() => {
    return generateAmortizationSchedule(amount, rate, term);
  }, [amount, rate, term]);

  const handleAmountChange = (value: string) => {
    const numValue = parseFloat(value.replace(/[^0-9.]/g, ''));
    if (!isNaN(numValue)) {
      setAmount(numValue);
    }
  };

  return (
    <div className="container py-12">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
            <Calculator className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Loan Calculator</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Estimate your monthly payments and see how different loan terms affect your total cost.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Calculator Inputs */}
          <Card>
            <CardHeader>
              <CardTitle>Loan Details</CardTitle>
              <CardDescription>Adjust the values to see your estimated payment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Loan Type</Label>
                <Select value={loanType} onValueChange={(value) => {
                  setLoanType(value);
                  const newType = loanTypes.find((t) => t.value === value);
                  if (newType) {
                    setRate(newType.minRate);
                  }
                  const newTerms = termOptions[value as keyof typeof termOptions];
                  if (newTerms && !newTerms.includes(term)) {
                    setTerm(newTerms[Math.floor(newTerms.length / 2)]);
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {loanTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Loan Amount</Label>
                  <span className="text-sm font-medium">{formatCurrency(amount)}</span>
                </div>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={formatNumber(amount)}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Slider
                  value={[amount]}
                  onValueChange={([value]) => setAmount(value)}
                  min={1000}
                  max={loanType === 'home' ? 1000000 : 100000}
                  step={loanType === 'home' ? 5000 : 500}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatCurrency(1000)}</span>
                  <span>{formatCurrency(loanType === 'home' ? 1000000 : 100000)}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Interest Rate (APR)</Label>
                  <span className="text-sm font-medium">{rate.toFixed(2)}%</span>
                </div>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={rate}
                    onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                    step={0.01}
                    min={selectedLoanType.minRate}
                    max={selectedLoanType.maxRate}
                    className="pl-9"
                  />
                </div>
                <Slider
                  value={[rate]}
                  onValueChange={([value]) => setRate(value)}
                  min={selectedLoanType.minRate}
                  max={selectedLoanType.maxRate}
                  step={0.01}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{selectedLoanType.minRate}%</span>
                  <span>{selectedLoanType.maxRate}%</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Loan Term</Label>
                  <span className="text-sm font-medium">
                    {term >= 12 ? `${Math.floor(term / 12)} year${Math.floor(term / 12) !== 1 ? 's' : ''}` : ''} 
                    {term % 12 > 0 ? ` ${term % 12} month${term % 12 !== 1 ? 's' : ''}` : ''}
                  </span>
                </div>
                <Select value={term.toString()} onValueChange={(value) => setTerm(parseInt(value))}>
                  <SelectTrigger>
                    <Calendar className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTerms.map((t) => (
                      <SelectItem key={t} value={t.toString()}>
                        {t >= 12 ? `${Math.floor(t / 12)} year${Math.floor(t / 12) !== 1 ? 's' : ''}` : `${t} months`}
                        {t % 12 > 0 && t >= 12 ? ` ${t % 12} months` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="space-y-6">
            <Card className="bg-primary text-primary-foreground">
              <CardHeader>
                <CardTitle className="text-primary-foreground/80">Estimated Monthly Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-bold mb-4">
                  {formatCurrency(monthlyPayment)}
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-primary-foreground/20">
                  <div>
                    <div className="text-sm text-primary-foreground/70">Total Payment</div>
                    <div className="text-xl font-semibold">{formatCurrency(totalPayment)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-primary-foreground/70">Total Interest</div>
                    <div className="text-xl font-semibold">{formatCurrency(totalInterest)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Payment Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Principal</span>
                    <span className="font-medium">{formatCurrency(amount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Interest</span>
                    <span className="font-medium">{formatCurrency(totalInterest)}</span>
                  </div>
                  <div className="h-4 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${(amount / totalPayment) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Principal: {((amount / totalPayment) * 100).toFixed(1)}%</span>
                    <span>Interest: {((totalInterest / totalPayment) * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Link to="/member/applications/new">
              <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" size="lg">
                Apply for This Loan
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Amortization Schedule */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Amortization Schedule</CardTitle>
            <CardDescription>See how your payments are applied over time</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="summary">
              <TabsList>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="yearly">Yearly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>
              <TabsContent value="summary" className="mt-4">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center p-4 rounded-lg bg-muted">
                    <div className="text-sm text-muted-foreground mb-1">First Year Interest</div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(
                        amortizationSchedule.slice(0, 12).reduce((sum, p) => sum + p.interest, 0)
                      )}
                    </div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted">
                    <div className="text-sm text-muted-foreground mb-1">First Year Principal</div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(
                        amortizationSchedule.slice(0, 12).reduce((sum, p) => sum + p.principal, 0)
                      )}
                    </div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted">
                    <div className="text-sm text-muted-foreground mb-1">Balance After 1 Year</div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(amortizationSchedule[Math.min(11, amortizationSchedule.length - 1)]?.balance || 0)}
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="yearly" className="mt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Year</th>
                        <th className="text-right py-2">Principal</th>
                        <th className="text-right py-2">Interest</th>
                        <th className="text-right py-2">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: Math.ceil(term / 12) }, (_, yearIndex) => {
                        const yearPayments = amortizationSchedule.slice(yearIndex * 12, (yearIndex + 1) * 12);
                        const yearPrincipal = yearPayments.reduce((sum, p) => sum + p.principal, 0);
                        const yearInterest = yearPayments.reduce((sum, p) => sum + p.interest, 0);
                        const endBalance = yearPayments[yearPayments.length - 1]?.balance || 0;
                        return (
                          <tr key={yearIndex} className="border-b">
                            <td className="py-2">Year {yearIndex + 1}</td>
                            <td className="text-right py-2">{formatCurrency(yearPrincipal)}</td>
                            <td className="text-right py-2">{formatCurrency(yearInterest)}</td>
                            <td className="text-right py-2">{formatCurrency(endBalance)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
              <TabsContent value="monthly" className="mt-4">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background">
                      <tr className="border-b">
                        <th className="text-left py-2">Month</th>
                        <th className="text-right py-2">Payment</th>
                        <th className="text-right py-2">Principal</th>
                        <th className="text-right py-2">Interest</th>
                        <th className="text-right py-2">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {amortizationSchedule.map((payment) => (
                        <tr key={payment.month} className="border-b">
                          <td className="py-2">{payment.month}</td>
                          <td className="text-right py-2">{formatCurrency(payment.payment)}</td>
                          <td className="text-right py-2">{formatCurrency(payment.principal)}</td>
                          <td className="text-right py-2">{formatCurrency(payment.interest)}</td>
                          <td className="text-right py-2">{formatCurrency(payment.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-6">
          * This calculator provides estimates only. Actual rates and terms may vary based on creditworthiness and other factors.
          Contact us for a personalized quote.
        </p>
      </div>
    </div>
  );
}
