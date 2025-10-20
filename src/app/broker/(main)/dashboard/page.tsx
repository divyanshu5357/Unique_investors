
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download, User, Phone, MapPin, Mail, Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { WalletCard } from "@/components/broker/WalletCard";
import { getBrokerWallets, getBrokerProfile } from "@/lib/actions";
import type { Wallet } from "@/lib/schema";
import { Logo } from "@/components/Logo";


interface ProfileData {
  id: string;
  full_name: string | null;
  email: string | null;
  joining_date: string | null;
  totalCommission: number;
  sponsorName: string | null;
  mobile_number: string | null;
  address: string | null;
  verificationApproved: boolean;
}

export default function BrokerDashboardPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const welcomeLetterRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const fetchProfileAndWallet = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        try {
          // Use server action to fetch profile data (bypasses RLS issues)
          const profileData = await getBrokerProfile();
          
          if (profileData) {
            setProfile({
              id: profileData.id,
              full_name: profileData.full_name,
              email: session.user.email || profileData.email || null,
              joining_date: session.user.created_at,
              totalCommission: profileData.totalCommission,
              sponsorName: profileData.sponsorName || 'N/A',
              mobile_number: profileData.mobile_number,
              address: profileData.address,
              verificationApproved: profileData.verificationApproved,
            });
          }

          // Fetch wallet data
          const walletData = await getBrokerWallets();
          setWallet(walletData);
        } catch (e) {
          console.error('Error fetching profile/wallet:', e);
        }
      }
      
      setLoading(false);
    };
    fetchProfileAndWallet();
  }, []);

  const handleDownloadPdf = async () => {
    const element = welcomeLetterRef.current;
    if (!element) return;

    // Temporarily make all text black for PDF
    const originalColors = new Map();
    element.querySelectorAll('*').forEach(el => {
        originalColors.set(el, (el as HTMLElement).style.color);
        (el as HTMLElement).style.color = 'black';
    });


    const canvas = await html2canvas(element, {
        scale: 2, 
        backgroundColor: '#ffffff',
        useCORS: true, 
    });

    // Restore original colors
     element.querySelectorAll('*').forEach(el => {
        (el as HTMLElement).style.color = originalColors.get(el);
    });

    const data = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;

    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = imgWidth / imgHeight;

    let finalImgWidth = pdfWidth - margin * 2;
    let finalImgHeight = finalImgWidth / ratio;

    if (finalImgHeight > pdfHeight - margin * 2) {
        finalImgHeight = pdfHeight - margin * 2;
        finalImgWidth = finalImgHeight * ratio;
    }

    const x = margin;
    const y = margin;

    pdf.addImage(data, 'PNG', x, y, finalImgWidth, finalImgHeight);
    pdf.save('Welcome_Letter.pdf');
};


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {profile?.full_name || 'Associate'}!</p>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin"/>
        </div>
      ) : (
        <>
          {/* Wallet Summary */}
          <WalletCard wallet={wallet} />

          {/* Welcome Letter Card */}
          <Card>
            <CardHeader>
                <CardTitle className="font-headline">Welcome Letter</CardTitle>
                <CardDescription>Your official welcome letter from Unique Investor</CardDescription>
            </CardHeader>
            <CardContent className="p-6 bg-muted/30">
                <div ref={welcomeLetterRef} className="bg-white p-6 md:p-8 rounded-md shadow-md text-foreground" id="welcome-letter">
                    <div className="text-center mb-2">
                        <div className="flex items-center justify-center gap-3 mb-1">
                            <div className="bg-black p-2 rounded">
                                <span className="text-yellow-500 font-bold text-xl">U</span>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-green-600">Unique Investor</h1>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">Where Dreams Come True</p>
                    </div>
                   
                    <hr className="my-4 border-dashed" />
                    
                    <div className="text-center mb-4">
                        <h2 className="text-xl font-bold font-headline">Welcome Letter</h2>
                        <p className="text-xs text-muted-foreground">
                            📅 Date: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>

                    <p className="text-sm text-center mb-4 leading-relaxed">
                        A warm welcome and lots of good wishes on becoming part of our growing team. Congratulations on being part of the team! The whole company welcomes you, and we look forward to a successful journey with you! Welcome aboard! We are all happy and excited about your inputs and contribution to our company.
                    </p>

                    <hr className="my-4 border-dashed" />
                    
                    <div className="bg-primary/5 p-4 rounded-md border border-primary/20">
                        <h3 className="text-sm font-bold font-headline mb-3 text-primary flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Sponsor Name: {profile?.sponsorName || 'N/A'}
                        </h3>
                        <div className="space-y-2 text-xs">
                            <div className="grid grid-cols-[100px_1fr] gap-2">
                                <span className="font-semibold">User ID:</span>
                                <span className="break-all">{profile?.email || 'N/A'}</span>
                            </div>
                            <div className="grid grid-cols-[100px_1fr] gap-2">
                                <span className="font-semibold">Name:</span>
                                <span>{profile?.full_name || 'N/A'}</span>
                            </div>
                            {profile?.verificationApproved ? (
                                <>
                                    <div className="grid grid-cols-[100px_1fr] gap-2">
                                        <span className="font-semibold">Email:</span>
                                        <span className="break-all">{profile?.email || 'N/A'}</span>
                                    </div>
                                    <div className="grid grid-cols-[100px_1fr] gap-2">
                                        <span className="font-semibold">Mobile No.:</span>
                                        <span>{profile?.mobile_number || 'N/A'}</span>
                                    </div>
                                    <div className="grid grid-cols-[100px_1fr] gap-2">
                                        <span className="font-semibold">Address:</span>
                                        <span>{profile?.address || 'N/A'}</span>
                                    </div>
                                </>
                            ) : (
                                <div className="col-span-2 text-center py-3 px-2 bg-yellow-50 dark:bg-yellow-950/20 rounded border border-yellow-200 dark:border-yellow-800">
                                    <p className="text-muted-foreground italic">
                                        📋 Complete details will be available after verification approval
                                    </p>
                                </div>
                            )}
                        </div>
                        <p className="text-xs italic mt-3 text-muted-foreground border-t pt-2">
                            🛈 This is the information you shall have to use for all your correspondence with the company.
                        </p>
                    </div>
                    
                    <p className="text-sm text-center my-4 leading-relaxed">
                        Assuring you of the best services always and wishing you continued success in your journey with UNIQUE INVESTOR. We look forward to a long-term association and prosperous future, together.
                    </p>
                    
                    <hr className="my-4 border-dashed" />

                    <div className="text-center">
                        <p className="font-semibold">Best Regards,</p>
                        <p className="font-bold font-headline text-primary">Unique Investor</p>
                    </div>
                    
                    <div className="text-xs mt-4 space-y-2 text-muted-foreground border-t pt-4">
                        <p className="flex items-start gap-2">
                            <MapPin className="h-3 w-3 shrink-0 mt-0.5" /> 
                            <span>Head Office: Shop no. 2, Shree Shahmal pahalwan Complex, near Brahmma mandir, opposite Gaur City 14th Avenue, greater Noida west 201301</span>
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <p className="flex items-center gap-2"><Phone className="h-3 w-3 shrink-0" /> Tel: 8810317477</p>
                            <p className="flex items-center gap-2"><Mail className="h-3 w-3 shrink-0" /> uniqueinvestor@yahoo.com</p>
                            <p className="flex items-center gap-2"><Globe className="h-3 w-3 shrink-0" /> www.uniqueinvestor.in</p>
                        </div>
                    </div>

                    <div className="mt-4 text-center text-xs text-muted-foreground/80 italic">
                      <p>This is a computer-generated document and it does not require a signature. This document shall not be invalidated solely on the ground that it is not signed.</p>
                    </div>
                </div>
                <div className="mt-6 flex justify-center">
                    <Button onClick={handleDownloadPdf} disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Download as PDF
                    </Button>
                </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
