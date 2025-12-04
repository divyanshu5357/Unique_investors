
"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart } from "@/components/ui/charts";
import { Download, User, Phone, MapPin, Mail, Globe, TrendingUp, Award, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { WalletCard } from "@/components/broker/WalletCard";
import { WelcomeSection } from "@/components/broker/WelcomeSection";
import { getBrokerWallets, getBrokerProfile } from "@/lib/actions";
import type { Wallet } from "@/lib/schema";
import { Logo } from "@/components/Logo";


interface ProfileData {
  id: string;
  full_name: string | null;
  email: string | null;
  joining_date: string | null;
  totalcommission: number;
  sponsorName: string | null;
  mobile_number: string | null;
  address: string | null;
  verificationApproved: boolean;
  verifications?: Array<{
    status: 'pending' | 'approved' | 'rejected';
    processed_date: string | null;
  }>;
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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        try {
          // Use server action to fetch profile data (bypasses RLS issues)
          const profileData = await getBrokerProfile();
          
          if (profileData) {
            setProfile({
              id: profileData.id,
              full_name: profileData.full_name,
              email: user.email || profileData.email || null,
              joining_date: user.created_at,
              totalcommission: profileData.totalcommission,
              sponsorName: profileData.sponsorName || 'N/A',
              mobile_number: profileData.mobile_number,
              address: profileData.address,
              verificationApproved: profileData.verificationApproved,
              verifications: profileData.verifications,
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


  const [plotStats, setPlotStats] = useState<Array<{ month: string; count: number }>>([]);
  const [loadingPlots, setLoadingPlots] = useState(true);

  useEffect(() => {
    const fetchPlotData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('plots')
          .select('created_at')
          .eq('broker_id', user.id)
          .eq('status', 'sold');

        if (error) throw error;

        // Process data to count plots by month
        const plotsByMonth = data.reduce((acc: { [key: string]: number }, plot) => {
          const month = new Date(plot.created_at).toLocaleString('en-US', { month: 'short', year: 'numeric' });
          acc[month] = (acc[month] || 0) + 1;
          return acc;
        }, {});

        // Convert to array and sort by date
        const chartData = Object.entries(plotsByMonth)
          .map(([month, count]) => ({ month, count }))
          .sort((a, b) => {
            const dateA = new Date(a.month);
            const dateB = new Date(b.month);
            return dateA.getTime() - dateB.getTime();
          });

        setPlotStats(chartData);
      } catch (error) {
        console.error('Error fetching plot data:', error);
      } finally {
        setLoadingPlots(false);
      }
    };

    fetchPlotData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-950 dark:via-blue-950 dark:to-slate-900 space-y-4 sm:space-y-6 md:space-y-8 p-3 sm:p-4 md:p-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 dark:from-blue-700 dark:via-blue-600 dark:to-cyan-700 rounded-lg sm:rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 shadow-lg text-white">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1">Dashboard</h1>
        <p className="text-blue-100 text-sm sm:text-base">Welcome back, <span className="font-semibold">{profile?.full_name || 'Associate'}</span>! 👋</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[300px] sm:min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600"/>
        </div>
      ) : (
        <>
          {/* Account Setup Progress */}
          <WelcomeSection profile={profile} />

          {/* Quick Stats - Responsive Grid */}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {/* Total Commission */}
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-2">Total Commission</h3>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-emerald-900 dark:text-emerald-100">₹{profile?.totalcommission?.toLocaleString() || '0'}</p>
                  </div>
                  <div className="hidden sm:flex p-2 sm:p-3 bg-emerald-200 dark:bg-emerald-800 rounded-lg">
                    <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-700 dark:text-emerald-300" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Joining Date */}
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">Joining Date</h3>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-900 dark:text-blue-100">
                      {profile?.joining_date 
                        ? new Date(profile.joining_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div className="hidden sm:flex p-2 sm:p-3 bg-blue-200 dark:bg-blue-800 rounded-lg">
                    <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-blue-700 dark:text-blue-300" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sponsor */}
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 sm:col-span-2 lg:col-span-1">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xs sm:text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">Sponsor</h3>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-purple-900 dark:text-purple-100">{profile?.sponsorName || 'N/A'}</p>
                  </div>
                  <div className="hidden sm:flex p-2 sm:p-3 bg-purple-200 dark:bg-purple-800 rounded-lg">
                    <Award className="h-5 w-5 sm:h-6 sm:w-6 text-purple-700 dark:text-purple-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Wallet Summary */}
          <WalletCard wallet={wallet} />

          {/* Plot Performance Card */}
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-amber-500 dark:from-orange-600 dark:to-amber-600 text-white pb-3 sm:pb-4">
              <CardTitle className="font-headline text-lg sm:text-xl flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Plot Sales Performance
              </CardTitle>
              <CardDescription className="text-orange-100">Your plot sales history by month</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 sm:pt-6 bg-gradient-to-b from-orange-50/50 to-white dark:from-orange-950/10 dark:to-slate-900">
              {loadingPlots ? (
                <div className="flex justify-center items-center h-[250px] sm:h-[300px]">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500"/>
                </div>
              ) : plotStats.length > 0 ? (
                <div className="overflow-x-auto">
                  <BarChart
                    data={plotStats}
                    xField="month"
                    yField="count"
                    height={280}
                    tooltipTitle="Plots Sold"
                  />
                </div>
              ) : (
                <div className="flex flex-col justify-center items-center h-[250px] sm:h-[300px] text-muted-foreground">
                  <TrendingUp className="h-8 w-8 mb-2 opacity-50" />
                  <p>No plot sales data available yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Welcome Letter Card */}
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-indigo-500 to-blue-500 dark:from-indigo-600 dark:to-blue-600 text-white pb-3 sm:pb-4">
                <CardTitle className="font-headline text-lg sm:text-xl">Welcome Letter</CardTitle>
                <CardDescription className="text-indigo-100">Your official welcome letter from Unique Investor</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 bg-gradient-to-b from-indigo-50/50 to-white dark:from-indigo-950/10 dark:to-slate-900">
                <div ref={welcomeLetterRef} className="bg-white dark:bg-slate-900 p-4 sm:p-6 md:p-8 rounded-lg shadow-inner text-foreground border border-indigo-200 dark:border-indigo-800" id="welcome-letter">
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
                   
                    <hr className="my-4 border-dashed border-slate-300 dark:border-slate-700" />
                    
                    <div className="text-center mb-4">
                        <h2 className="text-xl font-bold font-headline text-indigo-900 dark:text-indigo-300">Welcome Letter</h2>
                        <p className="text-xs text-muted-foreground">
                            📅 Date: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>

                    <p className="text-sm text-center mb-4 leading-relaxed text-slate-700 dark:text-slate-300">
                        A warm welcome and lots of good wishes on becoming part of our growing team. Congratulations on being part of the team! The whole company welcomes you, and we look forward to a successful journey with you! Welcome aboard! We are all happy and excited about your inputs and contribution to our company.
                    </p>

                    <hr className="my-4 border-dashed border-slate-300 dark:border-slate-700" />
                    
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 p-3 sm:p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
                        <h3 className="text-sm font-bold font-headline mb-3 text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Sponsor Name: {profile?.sponsorName || 'N/A'}
                        </h3>
                        <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
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
                                <div className="col-span-2 text-center py-3 px-2 bg-yellow-100 dark:bg-yellow-950/40 rounded border border-yellow-300 dark:border-yellow-700">
                                    <p className="text-yellow-900 dark:text-yellow-200 italic text-xs sm:text-sm">
                                        📋 Complete details will be available after verification approval
                                    </p>
                                </div>
                            )}
                        </div>
                        <p className="text-xs italic mt-3 text-slate-600 dark:text-slate-400 border-t border-indigo-200 dark:border-indigo-800 pt-2">
                            🛈 This is the information you shall have to use for all your correspondence with the company.
                        </p>
                    </div>
                    
                    <p className="text-sm text-center my-4 leading-relaxed text-slate-700 dark:text-slate-300">
                        Assuring you of the best services always and wishing you continued success in your journey with UNIQUE INVESTOR. We look forward to a long-term association and prosperous future, together.
                    </p>
                    
                    <hr className="my-4 border-dashed border-slate-300 dark:border-slate-700" />

                    <div className="text-center">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">Best Regards,</p>
                        <p className="font-bold font-headline text-indigo-600 dark:text-indigo-400">Unique Investor</p>
                    </div>
                    
                    <div className="text-xs mt-4 space-y-2 text-slate-600 dark:text-slate-400 border-t border-slate-300 dark:border-slate-700 pt-4">
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

                    <div className="mt-4 text-center text-xs text-slate-500 dark:text-slate-500 italic">
                      <p>This is a computer-generated document and it does not require a signature. This document shall not be invalidated solely on the ground that it is not signed.</p>
                    </div>
                </div>
                <div className="mt-4 sm:mt-6 flex justify-center">
                    <Button onClick={handleDownloadPdf} disabled={loading} className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white">
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
