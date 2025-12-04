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
    <Card className="border-0 shadow-md bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900/30 dark:to-slate-800/30">
      <CardContent className="pt-4 sm:pt-6">
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, index) => (
            <div 
              key={step.label}
              className={cn(
                "flex items-start sm:items-center gap-3 p-3 sm:p-4 rounded-lg transition-all hover:shadow-md",
                step.completed 
                  ? "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border border-green-200 dark:border-green-800" 
                  : step.icon === XCircle 
                  ? "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border border-red-200 dark:border-red-800"
                  : "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-200 dark:border-amber-800"
              )}
            >
              <div className={cn(
                "p-2 rounded-full shrink-0",
                step.completed 
                  ? "bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-400" 
                  : step.icon === XCircle 
                  ? "bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-400"
                  : "bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-400"
              )}>
                <step.icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">{step.label}</p>
                <p className={cn(
                  "text-xs font-medium mt-0.5",
                  step.completed 
                    ? "text-green-700 dark:text-green-400" 
                    : step.icon === XCircle 
                    ? "text-red-700 dark:text-red-400"
                    : "text-amber-700 dark:text-amber-400"
                )}>
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