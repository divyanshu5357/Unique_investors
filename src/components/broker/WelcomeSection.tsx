import { Card, CardContent } from "@/components/ui/card";
import { Check, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface WelcomeSectionProps {
  profile: {
    full_name: string | null;
    verificationApproved: boolean;
    mobile_number: string | null;
    address: string | null;
    email: string | null;
    verifications?: Array<{
      status: 'pending' | 'approved' | 'rejected';
      processed_date: string | null;
    }>;
  } | null;
}

export function WelcomeSection({ profile }: WelcomeSectionProps) {
  const verificationStatus = profile?.verifications?.[0]?.status || 'pending';
  const steps = [
    {
      label: "Profile Details",
      completed: Boolean(profile?.full_name && profile?.email),
      icon: profile?.full_name && profile?.email ? Check : Clock,
      status: profile?.full_name && profile?.email ? "Completed" : "Pending"
    },
    {
      label: "Contact Information",
      completed: Boolean(profile?.mobile_number && profile?.address),
      icon: profile?.mobile_number && profile?.address ? Check : Clock,
      status: profile?.mobile_number && profile?.address ? "Completed" : "Pending"
    },
    {
      label: "Verification Status",
      completed: verificationStatus === 'approved',
      icon: verificationStatus === 'approved' ? Check : verificationStatus === 'rejected' ? XCircle : Clock,
      status: verificationStatus === 'approved' ? "Verified" : verificationStatus === 'rejected' ? "Not Approved" : "Pending"
    },
  ];

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <div 
              key={step.label}
              className={cn(
                "flex items-center gap-4 p-4 rounded-lg transition-colors",
                step.completed ? "bg-green-50 dark:bg-green-950/20" : "bg-muted/30"
              )}
            >
              <div className={cn(
                "p-2 rounded-full",
                step.completed ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : 
                step.icon === XCircle ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : 
                "bg-muted text-muted-foreground"
              )}>
                <step.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{step.label}</p>
                <p className="text-xs text-muted-foreground">
                  {step.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}