
import { ProfileForm } from "@/components/account/ProfileForm";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function BrokerAccountPage() {
    return (
        <div>
            <h1 className="text-3xl font-bold font-headline mb-8">Account Settings</h1>
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
