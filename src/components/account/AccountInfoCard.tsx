"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from '@/components/ui/badge'

type DatabaseProfile = {
    full_name: string | null
    email: string | null
    mobile_number: string | null
    address: string | null
    contract_type: string | null
    has_changed_name?: boolean | null
    profile_completed?: boolean | null
    sponsorid?: string | null
    upline_id?: string | null
}

interface AccountInfo {
    fullName: string
    email: string
    mobileNumber: string
    address: string
    uplineName: string | null
    contractType: string
    isVerified: boolean
    hasChangedName: boolean
    profileCompleted: boolean
    walletBalances?: {
        direct: number
        downline: number
        total: number
    }
}

export function AccountInfoCard() {
    const supabase = createClient()
    const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchAccountInfo() {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { setLoading(false); return; }

            // Fetch profile core fields (avoid inner joins that hide rows)
            const { data: profile, error: profileErr } = await supabase
                .from('profiles')
                .select('full_name, email, mobile_number, address, contract_type, has_changed_name, profile_completed, sponsorid, upline_id')
                .eq('id', session.user.id)
                .single();

            let uplineName: string | null = 'Direct';
            const uplineSource = profile?.upline_id || profile?.sponsorid;
            if (uplineSource) {
                const { data: upline } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', uplineSource)
                    .single();
                uplineName = upline?.full_name || 'Direct';
            }

            // Wallet balances
            let walletBalances: AccountInfo['walletBalances'] | undefined = undefined;
            const { data: wallet } = await supabase
                .from('wallets')
                .select('direct_sale_balance, downline_sale_balance, total_balance')
                .eq('owner_id', session.user.id)
                .single();
            if (wallet) {
                walletBalances = {
                    direct: wallet.direct_sale_balance ?? 0,
                    downline: wallet.downline_sale_balance ?? 0,
                    total: wallet.total_balance ?? ((wallet.direct_sale_balance ?? 0) + (wallet.downline_sale_balance ?? 0))
                };
            }

            if (profile) {
                setAccountInfo({
                    fullName: profile.full_name || 'N/A',
                    email: profile.email || session.user.email || 'N/A',
                    mobileNumber: profile.mobile_number || 'N/A',
                    address: profile.address || 'N/A',
                    uplineName,
                    contractType: profile.contract_type || 'Standard',
                    isVerified: false, // could be extended later with separate verifications query
                    hasChangedName: !!profile.has_changed_name,
                    profileCompleted: !!profile.profile_completed,
                    walletBalances
                });
            }

            setLoading(false);
        }
        fetchAccountInfo();
    }, [supabase]);

    if (loading) {
        return <div>Loading account info...</div>
    }

    if (!accountInfo) {
        return null
    }

    return (
        <Card>
            <CardHeader className="pb-4">
                <CardTitle className="font-headline flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                        <AvatarFallback>{accountInfo.fullName[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h3 className="text-xl font-semibold flex items-center gap-2">
                            {accountInfo.fullName}
                            {accountInfo.hasChangedName && (
                                <Badge variant="outline" className="text-[10px]">Name Locked</Badge>
                            )}
                        </h3>
                        <p className="text-sm text-muted-foreground break-all">{accountInfo.email}</p>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                        <p className="text-muted-foreground">Upline</p>
                        <p className="font-medium">{accountInfo.uplineName}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Contract Type</p>
                        <p className="font-medium">{accountInfo.contractType}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Mobile</p>
                        <p className="font-medium">{accountInfo.mobileNumber}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Profile Status</p>
                        <p className="font-medium">{accountInfo.profileCompleted ? 'Complete' : 'Incomplete'}</p>
                    </div>
                    <div className="col-span-2">
                        <p className="text-muted-foreground">Address</p>
                        <p className="font-medium">{accountInfo.address}</p>
                    </div>
                </div>
                {accountInfo.walletBalances && (
                    <div className="grid grid-cols-3 gap-4 text-xs">
                        <div className="p-3 rounded-md border bg-muted/40">
                            <p className="text-muted-foreground">Direct Balance</p>
                            <p className="font-semibold">₹ {accountInfo.walletBalances.direct.toFixed(2)}</p>
                        </div>
                        <div className="p-3 rounded-md border bg-muted/40">
                            <p className="text-muted-foreground">Downline Balance</p>
                            <p className="font-semibold">₹ {accountInfo.walletBalances.downline.toFixed(2)}</p>
                        </div>
                        <div className="p-3 rounded-md border bg-muted/40">
                            <p className="text-muted-foreground">Total Balance</p>
                            <p className="font-semibold">₹ {accountInfo.walletBalances.total.toFixed(2)}</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}