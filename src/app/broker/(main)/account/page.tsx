
import { ProfileForm } from "@/components/account/ProfileForm";
import { AccountInfoCard } from "@/components/account/AccountInfoCard";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function BrokerAccountPage() {
    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                <div className="md:col-span-2">
                    <h1 className="text-3xl font-bold font-headline mb-8">Account Settings</h1>
                </div>
                <div className="md:col-span-1">
                    <AccountInfoCard />
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Associate Profile</CardTitle>
                    <CardDescription>Update your professional details and preferences.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ProfileForm />
                </CardContent>
            </Card>
        </div>
    )
}
