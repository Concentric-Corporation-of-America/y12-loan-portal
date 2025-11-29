import { useAuth } from '@/contexts/AuthContext';
import { FredChat } from '@/components/fred/FredChat';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Shield, 
  Zap, 
  Database,
  Lock,
  BookOpen,
  TrendingUp,
  Users,
  FileText,
  Calculator
} from 'lucide-react';

export function FredPage() {
  const { user } = useAuth();
  
  // Get user email for personalization
  const userEmail = user?.email || '';
  const userName = (user as { user_metadata?: { first_name?: string; last_name?: string } })?.user_metadata?.first_name 
    ? `${(user as { user_metadata?: { first_name?: string } })?.user_metadata?.first_name} ${(user as { user_metadata?: { last_name?: string } })?.user_metadata?.last_name || ''}`
    : user?.email?.split('@')[0] || 'Executive';

  const features = [
    {
      icon: Brain,
      title: 'H200 GPU + GPT-OSS-120B',
      description: 'Enterprise-grade AI with 120 billion parameters for deep financial analysis'
    },
    {
      icon: Shield,
      title: 'NCUA Compliant',
      description: 'Built-in regulatory knowledge for credit union compliance'
    },
    {
      icon: Database,
      title: 'Real-Time Data',
      description: 'Connected to Y-12 FCU data warehouse for live insights'
    },
    {
      icon: Lock,
      title: 'Executive Security',
      description: 'Role-based access with personalized insights for each executive'
    }
  ];

  const knowledgeAreas = [
    { icon: BookOpen, label: 'GAAP & Accounting Standards' },
    { icon: Shield, label: 'NCUA Regulations' },
    { icon: FileText, label: 'SEC & Securities Law' },
    { icon: Calculator, label: 'Financial Analysis' },
    { icon: TrendingUp, label: 'Market Intelligence' },
    { icon: Users, label: 'Credit Union Industry' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img 
              src="/fred-avatar.svg" 
              alt="FRED" 
              className="w-20 h-20 rounded-full border-4 border-emerald-400 shadow-lg"
            />
            <div className="text-left">
              <h1 className="text-3xl font-bold text-[#1a365d]">
                Meet FRED
              </h1>
              <p className="text-gray-600">
                Financial Research & Executive Decision Assistant
              </p>
            </div>
          </div>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Your AI-powered assistant for financial analysis, regulatory compliance, 
            and strategic decision support. Exclusively designed for Y-12 FCU executive leadership.
          </p>
        </div>

        {/* Main Chat Interface */}
        <div className="mb-8">
          <FredChat 
            executiveEmail={userEmail}
            executiveName={userName}
          />
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="w-10 h-10 rounded-lg bg-[#1a365d]/10 flex items-center justify-center mb-2">
                  <feature.icon className="w-5 h-5 text-[#1a365d]" />
                </div>
                <CardTitle className="text-sm font-semibold">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Knowledge Base */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-500" />
              FRED Knowledge Base
            </CardTitle>
            <CardDescription>
              Comprehensive expertise across financial, regulatory, and industry domains
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {knowledgeAreas.map((area, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="flex items-center gap-1 py-1.5 px-3"
                >
                  <area.icon className="w-3 h-3" />
                  {area.label}
                </Badge>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Regulatory Expertise Includes:</h4>
              <div className="grid md:grid-cols-3 gap-4 text-xs text-gray-600">
                <div>
                  <p className="font-medium text-gray-800">NCUA Regulations</p>
                  <ul className="mt-1 space-y-0.5">
                    <li>Part 702 - Capital Adequacy</li>
                    <li>Part 703 - Investments</li>
                    <li>Part 723 - Member Business Loans</li>
                    <li>Part 748 - Security Program</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-gray-800">CFPB Regulations</p>
                  <ul className="mt-1 space-y-0.5">
                    <li>Regulation B - Equal Credit</li>
                    <li>Regulation C - HMDA</li>
                    <li>Regulation Z - Truth in Lending</li>
                    <li>Regulation E - Electronic Funds</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-gray-800">Accounting Standards</p>
                  <ul className="mt-1 space-y-0.5">
                    <li>ASC 326 - CECL</li>
                    <li>ASC 842 - Leases</li>
                    <li>ASC 606 - Revenue</li>
                    <li>ASC 820 - Fair Value</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-gray-400">
          <p>
            FRED is powered by Concentric Corporation's H200 GPU infrastructure
          </p>
          <p className="mt-1">
            Exclusively designed for Y-12 Federal Credit Union Executive Leadership
          </p>
        </div>
      </div>
    </div>
  );
}

export default FredPage;
