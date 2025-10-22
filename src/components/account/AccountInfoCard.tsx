"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

type DatabaseProfile = {
    full_name: string | null
    email: string | null
    mobile_number: string | null
    address: string | null
    contract_type: string | null
    upline: {
        full_name: string | null
    }[]
    verifications: {
        status: string
    }[]
}

interface AccountInfo {
    fullName: string
    email: string
    mobileNumber: string
    address: string
    uplineName: string | null
    contractType: string
    isVerified: boolean
}

export function AccountInfoCard() {
    const supabase = createClient()
    const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchAccountInfo() {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            // Fetch profile data with upline info
            const { data, error } = await supabase
                .from('profiles')
                .select(`
                    full_name,
                    email,
                    mobile_number,
                    address,
                    contract_type,
                    upline:upline_id!inner (full_name),
                    verifications!inner (status)
                `)
                .eq('id', session.user.id)
                .single()

            if (data) {
                const profileData = data as DatabaseProfile;
                setAccountInfo({
                    fullName: profileData.full_name || 'N/A',
                    email: profileData.email || session.user.email || 'N/A',
                    mobileNumber: profileData.mobile_number || 'N/A',
                    address: profileData.address || 'N/A',
                    uplineName: profileData.upline?.[0]?.full_name || 'Direct',
                    contractType: profileData.contract_type || 'Standard',
                    isVerified: profileData.verifications?.[0]?.status === 'approved'
                })
            }
            setLoading(false)
        }

        fetchAccountInfo()
    }, [supabase])

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
                        <h3 className="text-xl font-semibold">{accountInfo.fullName}</h3>
                        <p className="text-sm text-muted-foreground">{accountInfo.email}</p>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                        <p className="text-muted-foreground">Verification</p>
                        <p className="font-medium">{accountInfo.isVerified ? 'Verified' : 'Pending'}</p>
                    </div>
                    <div className="col-span-2">
                        <p className="text-muted-foreground">Address</p>
                        <p className="font-medium">{accountInfo.address}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}