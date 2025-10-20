'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { submitBrokerReferral, getBrokerReferrals } from '@/lib/actions'
import { BrokerReferralRecord } from '@/lib/types'
import { Users, UserPlus, Clock, CheckCircle, XCircle, Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const referralSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').regex(/^[+]?[\d\s\-()]+$/, 'Please enter a valid phone number'),
  notes: z.string().max(500, 'Note cannot exceed 500 characters').optional(),
})

type ReferralFormData = z.infer<typeof referralSchema>

export default function BrokerReferralPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [referrals, setReferrals] = useState<BrokerReferralRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ReferralFormData>({
    resolver: zodResolver(referralSchema)
  })

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session) {
        router.push('/login')
        return
      }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (!profile || profile.role !== 'broker') {
        await supabase.auth.signOut()
        router.push('/login?message=Unauthorized')
        return
      }

      setUser(session.user)
    }

    checkUser()
  }, [router, supabase])

  useEffect(() => {
    if (user) {
      loadReferrals()
    }
  }, [user])

  const loadReferrals = async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      const data = await getBrokerReferrals(user.id)
      // Map the data to ensure it matches BrokerReferralRecord interface
      const mappedData: BrokerReferralRecord[] = data.map((item: any) => ({
        id: item.id,
        referrerId: item.referrerId || '',
        referrerName: item.referrerName || '',
        referrerEmail: item.referrerEmail || '',
        referredName: item.fullName || item.referredName || '',
        referredEmail: item.email || item.referredEmail || '',
        referredPhone: item.phone || item.referredPhone || '',
        note: item.notes || item.note || null,
        status: item.status || 'pending',
        createdAt: item.createdAt || item.submittedAt || '',
        processedAt: item.processedAt || null,
        processedBy: item.processedBy || null,
        rejectionReason: item.rejectionReason || null,
        newBrokerId: item.newBrokerId || null,
      }))
      setReferrals(mappedData)
    } catch (error) {
      console.error('Error loading referrals:', error)
      toast({
        title: 'Error',
        description: 'Failed to load referrals',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: ReferralFormData) => {
    setIsSubmitting(true)
    try {
      // Map form data to expected API format
      const submissionData = {
        referredName: data.fullName,
        referredEmail: data.email,
        referredPhone: data.phone,
        note: data.notes
      }
      
      const result = await submitBrokerReferral(submissionData)
      
      if (result.success) {
        toast({
          title: 'Success',
          description: result.message
        })
        reset()
        loadReferrals() // Reload the referrals table
      }
    } catch (error) {
      console.error('Error submitting referral:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit referral',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-600"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-2">
            <UserPlus className="h-6 w-6" />
            <h1 className="text-lg font-bold">Referrals</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
        
        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="border-t bg-white p-4 space-y-2">
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => {
                setShowMobileMenu(false)
                document.getElementById('referral-form')?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              New Referral
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => {
                setShowMobileMenu(false)
                document.getElementById('referral-stats')?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              <Users className="h-4 w-4 mr-2" />
              Statistics
            </Button>
          </div>
        )}
      </div>

      <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Desktop Header */}
        <div className="hidden lg:flex items-center space-x-2 mb-6">
          <UserPlus className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Broker Referral System</h1>
        </div>
        
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Referral Form */}
          <Card id="referral-form">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Refer a New Broker</span>
              </CardTitle>
              <CardDescription>
                Refer someone to join Unique Investor as a new broker. They will become part of your downline when approved.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    placeholder="Enter the person's full name"
                    {...register('fullName')}
                  />
                  {errors.fullName && (
                    <p className="text-sm text-red-600">{errors.fullName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    placeholder="+1 (555) 123-4567"
                    {...register('phone')}
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-600">{errors.phone.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Note (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional information about this referral..."
                    className="min-h-[80px]"
                    {...register('notes')}
                  />
                  {errors.notes && (
                    <p className="text-sm text-red-600">{errors.notes.message}</p>
                  )}
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? 'Submitting...' : 'Submit Referral'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Referral Statistics */}
          <Card id="referral-stats">
            <CardHeader>
              <CardTitle>Your Referral Statistics</CardTitle>
              <CardDescription>
                Overview of all your referral submissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {referrals.filter(r => r.status === 'pending').length}
                  </div>
                  <div className="text-sm text-gray-600">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {referrals.filter(r => r.status === 'approved').length}
                  </div>
                  <div className="text-sm text-gray-600">Approved</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {referrals.filter(r => r.status === 'rejected').length}
                  </div>
                  <div className="text-sm text-gray-600">Rejected</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Referrals Table */}
        <Card>
          <CardHeader>
            <CardTitle>Your Referrals</CardTitle>
            <CardDescription>
              Track the status of all your referral submissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="text-gray-500">Loading referrals...</div>
              </div>
            ) : referrals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No referrals submitted yet</p>
                <p className="text-sm">Submit your first referral using the form above</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Referred Person</TableHead>
                      <TableHead className="hidden sm:table-cell">Email</TableHead>
                      <TableHead className="hidden md:table-cell">Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Submitted</TableHead>
                      <TableHead className="hidden xl:table-cell">Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referrals.map((referral) => (
                      <TableRow key={referral.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{referral.referredName}</div>
                            <div className="sm:hidden text-xs text-gray-500">
                              {referral.referredEmail}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{referral.referredEmail}</TableCell>
                        <TableCell className="hidden md:table-cell">{referral.referredPhone}</TableCell>
                        <TableCell>{getStatusBadge(referral.status)}</TableCell>
                        <TableCell className="hidden lg:table-cell">{formatDate(referral.createdAt)}</TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {referral.note ? (
                            <span className="text-sm text-gray-600 truncate max-w-[200px] block">
                              {referral.note}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">No note</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}