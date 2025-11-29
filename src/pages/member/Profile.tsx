import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  Bell,
  Save,
  Loader2,
  CheckCircle,
} from 'lucide-react';

export function MemberProfilePage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [profile, setProfile] = useState({
    firstName: user?.user_metadata?.first_name || '',
    lastName: user?.user_metadata?.last_name || '',
    email: user?.email || '',
    phone: user?.user_metadata?.phone || '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
  });

  const handleChange = (field: string, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    setSuccess(false);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    setIsLoading(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="container py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Profile</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      {success && (
        <Alert className="mb-6 border-accent/50 bg-accent/5">
          <CheckCircle className="h-4 w-4 text-accent" />
          <AlertDescription>Your profile has been updated successfully.</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="personal">
        <TabsList className="mb-6">
          <TabsTrigger value="personal" className="gap-2">
            <User className="h-4 w-4" />
            Personal Info
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="firstName"
                      value={profile.firstName}
                      onChange={(e) => handleChange('firstName', e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profile.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="pl-9"
                      disabled
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Contact support to change your email</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="address"
                    value={profile.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={profile.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={profile.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    maxLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    value={profile.zipCode}
                    onChange={(e) => handleChange('zipCode', e.target.value)}
                    maxLength={5}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Password</h4>
                    <p className="text-sm text-muted-foreground">Last changed 30 days ago</p>
                  </div>
                  <Button variant="outline">Change Password</Button>
                </div>
              </div>

              <div className="p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Two-Factor Authentication</h4>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                  </div>
                  <Button variant="outline">Enable 2FA</Button>
                </div>
              </div>

              <div className="p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Active Sessions</h4>
                    <p className="text-sm text-muted-foreground">Manage your active sessions</p>
                  </div>
                  <Button variant="outline">View Sessions</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to be notified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <h4 className="font-medium">Payment Reminders</h4>
                    <p className="text-sm text-muted-foreground">Get notified before payments are due</p>
                  </div>
                  <Button variant="outline" size="sm">Email & SMS</Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <h4 className="font-medium">Application Updates</h4>
                    <p className="text-sm text-muted-foreground">Status updates on your loan applications</p>
                  </div>
                  <Button variant="outline" size="sm">Email Only</Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <h4 className="font-medium">Marketing Communications</h4>
                    <p className="text-sm text-muted-foreground">Special offers and promotions</p>
                  </div>
                  <Button variant="outline" size="sm">Disabled</Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <h4 className="font-medium">Security Alerts</h4>
                    <p className="text-sm text-muted-foreground">Important security notifications</p>
                  </div>
                  <Button variant="outline" size="sm">Email & SMS</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
