import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  AlertCircle,
  CreditCard,
  Car,
  Home,
  Briefcase,
  Calculator,
} from 'lucide-react';

const loanTypes = [
  { value: 'personal', label: 'Personal Loan', icon: CreditCard, description: 'For personal expenses, debt consolidation, or unexpected costs' },
  { value: 'auto', label: 'Auto Loan', icon: Car, description: 'Finance a new or used vehicle purchase' },
  { value: 'home', label: 'Home Loan', icon: Home, description: 'Purchase or refinance your home' },
  { value: 'business', label: 'Business Loan', icon: Briefcase, description: 'Fund your business growth or operations' },
];

const employmentStatuses = [
  { value: 'employed', label: 'Employed Full-Time' },
  { value: 'part_time', label: 'Employed Part-Time' },
  { value: 'self_employed', label: 'Self-Employed' },
  { value: 'retired', label: 'Retired' },
  { value: 'student', label: 'Student' },
  { value: 'unemployed', label: 'Unemployed' },
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
  }).format(value);
}

function calculateMonthlyPayment(principal: number, annualRate: number, termMonths: number): number {
  if (principal <= 0 || termMonths <= 0) return 0;
  if (annualRate <= 0) return principal / termMonths;
  const monthlyRate = annualRate / 100 / 12;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
         (Math.pow(1 + monthlyRate, termMonths) - 1);
}

export function LoanApplicationPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    loanType: '',
    amount: '',
    term: '',
    purpose: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    ssn: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    employmentStatus: '',
    employer: '',
    jobTitle: '',
    annualIncome: '',
    monthlyExpenses: '',
    agreeToTerms: false,
    agreeToCredit: false,
  });

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const estimatedRate = useMemo(() => {
    const baseRates: Record<string, number> = {
      personal: 10.99,
      auto: 6.49,
      home: 6.75,
      business: 9.99,
    };
    return baseRates[formData.loanType] || 10.99;
  }, [formData.loanType]);

  const estimatedPayment = useMemo(() => {
    const amount = parseFloat(formData.amount) || 0;
    const term = parseInt(formData.term) || 36;
    return calculateMonthlyPayment(amount, estimatedRate, term);
  }, [formData.amount, formData.term, estimatedRate]);

  const isStep1Valid = formData.loanType && formData.amount && formData.term && formData.purpose;
  const isStep2Valid = formData.firstName && formData.lastName && formData.email && formData.dateOfBirth && formData.address && formData.city && formData.state && formData.zipCode;
  const isStep3Valid = formData.employmentStatus && formData.annualIncome;
  const isStep4Valid = formData.agreeToTerms && formData.agreeToCredit;

  const canProceed = () => {
    switch (step) {
      case 1: return isStep1Valid;
      case 2: return isStep2Valid;
      case 3: return isStep3Valid;
      case 4: return isStep4Valid;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      navigate('/member/applications', { state: { success: true } });
    } catch (err) {
      setError('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <Label className="text-base mb-4 block">Select Loan Type *</Label>
        <div className="grid md:grid-cols-2 gap-4">
          {loanTypes.map((type) => (
            <div
              key={type.value}
              onClick={() => handleChange('loanType', type.value)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                formData.loanType === type.value
                  ? 'border-accent bg-accent/5'
                  : 'border-border hover:border-accent/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${formData.loanType === type.value ? 'bg-accent text-accent-foreground' : 'bg-muted'}`}>
                  <type.icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-medium">{type.label}</h4>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="amount">Loan Amount *</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="amount"
              type="number"
              value={formData.amount}
              onChange={(e) => handleChange('amount', e.target.value)}
              className="pl-7"
              placeholder="25,000"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="term">Loan Term *</Label>
          <Select value={formData.term} onValueChange={(value) => handleChange('term', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select term" />
            </SelectTrigger>
            <SelectContent>
              {(termOptions[formData.loanType as keyof typeof termOptions] || termOptions.personal).map((t) => (
                <SelectItem key={t} value={t.toString()}>
                  {t >= 12 ? `${Math.floor(t / 12)} year${Math.floor(t / 12) !== 1 ? 's' : ''}` : `${t} months`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="purpose">Loan Purpose *</Label>
        <Textarea
          id="purpose"
          value={formData.purpose}
          onChange={(e) => handleChange('purpose', e.target.value)}
          placeholder="Describe how you plan to use this loan..."
          rows={3}
        />
      </div>

      {formData.amount && formData.term && (
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Estimated Payment</span>
            </div>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(estimatedPayment)}/month
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              at {estimatedRate}% APR* (actual rate may vary)
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => handleChange('firstName', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => handleChange('lastName', e.target.value)}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone (Optional)</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of Birth *</Label>
          <Input
            id="dateOfBirth"
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => handleChange('dateOfBirth', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ssn">Last 4 of SSN (Optional)</Label>
          <Input
            id="ssn"
            maxLength={4}
            value={formData.ssn}
            onChange={(e) => handleChange('ssn', e.target.value.replace(/\D/g, ''))}
            placeholder="XXXX"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Street Address *</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => handleChange('address', e.target.value)}
        />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => handleChange('city', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State *</Label>
          <Input
            id="state"
            value={formData.state}
            onChange={(e) => handleChange('state', e.target.value)}
            maxLength={2}
            placeholder="TN"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="zipCode">ZIP Code *</Label>
          <Input
            id="zipCode"
            value={formData.zipCode}
            onChange={(e) => handleChange('zipCode', e.target.value)}
            maxLength={5}
          />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="employmentStatus">Employment Status *</Label>
        <Select value={formData.employmentStatus} onValueChange={(value) => handleChange('employmentStatus', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {employmentStatuses.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {['employed', 'part_time', 'self_employed'].includes(formData.employmentStatus) && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="employer">Employer (Optional)</Label>
            <Input
              id="employer"
              value={formData.employer}
              onChange={(e) => handleChange('employer', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jobTitle">Job Title (Optional)</Label>
            <Input
              id="jobTitle"
              value={formData.jobTitle}
              onChange={(e) => handleChange('jobTitle', e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="annualIncome">Annual Income *</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="annualIncome"
              type="number"
              value={formData.annualIncome}
              onChange={(e) => handleChange('annualIncome', e.target.value)}
              className="pl-7"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="monthlyExpenses">Monthly Expenses (Optional)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="monthlyExpenses"
              type="number"
              value={formData.monthlyExpenses}
              onChange={(e) => handleChange('monthlyExpenses', e.target.value)}
              className="pl-7"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Application Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">Loan Type</span>
              <p className="font-medium">{loanTypes.find((t) => t.value === formData.loanType)?.label}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Amount</span>
              <p className="font-medium">{formatCurrency(parseFloat(formData.amount) || 0)}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Term</span>
              <p className="font-medium">{formData.term} months</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Estimated Payment</span>
              <p className="font-medium">{formatCurrency(estimatedPayment)}/month</p>
            </div>
          </div>
          <div className="pt-4 border-t">
            <span className="text-sm text-muted-foreground">Applicant</span>
            <p className="font-medium">{formData.firstName} {formData.lastName}</p>
            <p className="text-sm text-muted-foreground">{formData.email}</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="agreeToTerms"
            checked={formData.agreeToTerms}
            onCheckedChange={(checked) => handleChange('agreeToTerms', checked as boolean)}
          />
          <Label htmlFor="agreeToTerms" className="text-sm leading-tight">
            I certify that the information provided is true and accurate. I understand that providing false information may result in denial of my application. *
          </Label>
        </div>

        <div className="flex items-start space-x-3">
          <Checkbox
            id="agreeToCredit"
            checked={formData.agreeToCredit}
            onCheckedChange={(checked) => handleChange('agreeToCredit', checked as boolean)}
          />
          <Label htmlFor="agreeToCredit" className="text-sm leading-tight">
            I authorize Y-12 Federal Credit Union to obtain my credit report and verify the information provided in this application. *
          </Label>
        </div>
      </div>
    </div>
  );

  const steps = [
    { number: 1, title: 'Loan Details' },
    { number: 2, title: 'Personal Info' },
    { number: 3, title: 'Employment' },
    { number: 4, title: 'Review' },
  ];

  return (
    <div className="container py-8 max-w-3xl">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Loan Application</CardTitle>
          <CardDescription>Complete all steps to submit your application</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              {steps.map((s) => (
                <div
                  key={s.number}
                  className={`flex items-center gap-2 ${
                    step >= s.number ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step > s.number
                        ? 'bg-accent text-accent-foreground'
                        : step === s.number
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {step > s.number ? <Check className="h-4 w-4" /> : s.number}
                  </div>
                  <span className="hidden sm:inline text-sm">{s.title}</span>
                </div>
              ))}
            </div>
            <Progress value={(step / 4) * 100} className="h-2" />
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}

          <div className="flex justify-between mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => setStep((prev) => prev - 1)}
              disabled={step === 1}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            {step < 4 ? (
              <Button
                onClick={() => setStep((prev) => prev + 1)}
                disabled={!canProceed()}
                className={canProceed() ? 'bg-accent text-accent-foreground hover:bg-accent/90' : ''}
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
                className={canProceed() ? 'bg-accent text-accent-foreground hover:bg-accent/90' : ''}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Application
                    <Check className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
