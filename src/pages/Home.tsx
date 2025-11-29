import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Calculator,
  CreditCard,
  Home as HomeIcon,
  Car,
  Briefcase,
  Shield,
  Users,
  TrendingUp,
  Award,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

const loanTypes = [
  {
    icon: CreditCard,
    title: 'Personal Loans',
    description: 'Flexible financing for life\'s unexpected moments',
    rate: '8.99%',
    href: '/loans/personal',
  },
  {
    icon: Car,
    title: 'Auto Loans',
    description: 'Competitive rates for new and used vehicles',
    rate: '5.49%',
    href: '/loans/auto',
  },
  {
    icon: HomeIcon,
    title: 'Home Loans',
    description: 'Make your dream home a reality',
    rate: '6.25%',
    href: '/loans/home',
  },
  {
    icon: Briefcase,
    title: 'Business Loans',
    description: 'Fuel your business growth',
    rate: '7.99%',
    href: '/loans/business',
  },
];

const stats = [
  { value: '$2.15B', label: 'Assets Under Management' },
  { value: '115K+', label: 'Members Served' },
  { value: '5-Star', label: 'Bauer Rating' },
  { value: '75+', label: 'Years of Service' },
];

const features = [
  {
    icon: Shield,
    title: 'NCUA Insured',
    description: 'Your deposits are federally insured up to $250,000',
  },
  {
    icon: Users,
    title: 'Member-Owned',
    description: 'As a member, you\'re an owner with a voice',
  },
  {
    icon: TrendingUp,
    title: 'Competitive Rates',
    description: 'Better rates than traditional banks',
  },
  {
    icon: Award,
    title: 'Award-Winning Service',
    description: 'Recognized for excellence in member service',
  },
];

export function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-primary text-primary-foreground py-20 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-[hsl(220,70%,15%)]" />
        <div className="container relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 text-accent mb-6">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">AI-Powered Banking Experience</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Banking That Works{' '}
              <span className="text-accent">Harder</span> For You
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/80 mb-8">
              Experience the future of credit union banking with Y-12 Federal Credit Union.
              Competitive rates, personalized service, and innovative technology.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/register">
                <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                  Become a Member
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/calculator">
                <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                  <Calculator className="mr-2 h-4 w-4" />
                  Loan Calculator
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-muted">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Loan Products Section */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Loan Products</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Find the perfect loan for your needs with our competitive rates and flexible terms.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {loanTypes.map((loan) => (
              <Card key={loan.title} className="group hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                    <loan.icon className="h-6 w-6 text-primary group-hover:text-accent transition-colors" />
                  </div>
                  <CardTitle className="text-xl">{loan.title}</CardTitle>
                  <CardDescription>{loan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-2xl font-bold text-accent">{loan.rate}</span>
                    <span className="text-sm text-muted-foreground">APR*</span>
                  </div>
                  <Link to={loan.href}>
                    <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      Learn More
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-6">
            *APR = Annual Percentage Rate. Rates shown are the lowest available and may vary based on creditworthiness.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 lg:py-24 bg-muted">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Y-12 FCU?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We're not just a financial institution - we're your partner in financial success.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto mb-8">
            Join over 115,000 members who trust Y-12 Federal Credit Union for their financial needs.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                Open an Account
              </Button>
            </Link>
            <Link to="/loans">
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                Apply for a Loan
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
