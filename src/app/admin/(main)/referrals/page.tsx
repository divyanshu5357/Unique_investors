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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { toast } from '@/hooks/use-toast'
import { getBrokerReferrals, processReferralRequest } from '@/lib/actions'
import { BrokerReferralRecord } from '@/lib/types'
import { Users, UserPlus, Clock, CheckCircle, XCircle, Eye, UserCheck, UserX } from 'lucide-react'

const newBrokerSchema = z.object({
  referredName: z.string().min(2, 'Referred person name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.literal('broker').default('broker'),
})

const rejectionSchema = z.object({
  rejectionReason: z.string().min(5, 'Rejection reason must be at least 5 characters'),
})

type NewBrokerFormData = z.infer<typeof newBrokerSchema>
type RejectionFormData = z.infer<typeof rejectionSchema>

export default function AdminReferralsPage() {
  const [referrals, setReferrals] = useState<BrokerReferralRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [selectedReferral, setSelectedReferral] = useState<BrokerReferralRecord | null>(null)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [showRejectionDialog, setShowRejectionDialog] = useState(false)

  const approvalForm = useForm<NewBrokerFormData>({
    resolver: zodResolver(newBrokerSchema),
    defaultValues: {
      referredName: selectedReferral?.referredName || '',
      role: 'broker',
    }
  })

  const rejectionForm = useForm<RejectionFormData>({
    resolver: zodResolver(rejectionSchema)
  })

  useEffect(() => {
    loadReferrals()
  }, [])

  const loadReferrals = async () => {
    setIsLoading(true)
    try {
      const data = await getBrokerReferrals() // Admin sees all referrals
      // Data is already properly mapped from the backend
      setReferrals(data as BrokerReferralRecord[])
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

  const handleApproval = async (data: NewBrokerFormData) => {
    if (!selectedReferral) return

    setProcessingId(selectedReferral.id)
    try {
      const result = await processReferralRequest({
        referralId: selectedReferral.id,
        action: 'approve',
        username: data.username,
        password: data.password,
        role: data.role,
        referredName: data.referredName, // Use the value from the form
        referredEmail: selectedReferral?.referredEmail,
        referredPhone: selectedReferral?.referredPhone,
        referrerId: selectedReferral?.referrerId,
        referrerName: selectedReferral?.referrerName,
      })

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message
        })
        setShowApprovalDialog(false)
        approvalForm.reset()
        loadReferrals()
      }
    } catch (error) {
      console.error('Error approving referral:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to approve referral',
        variant: 'destructive'
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejection = async (data: RejectionFormData) => {
    if (!selectedReferral) return

    setProcessingId(selectedReferral.id)
    try {
      const result = await processReferralRequest({
        referralId: selectedReferral.id,
        action: 'reject',
        rejectionReason: data.rejectionReason,
      })

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message
        })
        setShowRejectionDialog(false)
        rejectionForm.reset()
        loadReferrals()
      }
    } catch (error) {
      console.error('Error rejecting referral:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reject referral',
        variant: 'destructive'
      })
    } finally {
      setProcessingId(null)
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

  const pendingReferrals = referrals.filter(r => r.status === 'pending')
  const processedReferrals = referrals.filter(r => r.status !== 'pending')

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Users className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Broker Referral Management</h1>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{referrals.length}</div>
              <div className="text-sm text-gray-600">Total Referrals</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{pendingReferrals.length}</div>
              <div className="text-sm text-gray-600">Pending Review</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {referrals.filter(r => r.status === 'approved').length}
              </div>
              <div className="text-sm text-gray-600">Approved</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {referrals.filter(r => r.status === 'rejected').length}
              </div>
              <div className="text-sm text-gray-600">Rejected</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Referrals - Priority */}
      {pendingReferrals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <span>Pending Referrals ({pendingReferrals.length})</span>
            </CardTitle>
            <CardDescription>
              These referrals require your immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referrer</TableHead>
                    <TableHead>Referred Person</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingReferrals.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{referral.referrerName}</div>
                          <div className="text-sm text-gray-500">{referral.referrerEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{referral.referredName}</TableCell>
                      <TableCell>{referral.referredEmail}</TableCell>
                      <TableCell>{referral.referredPhone}</TableCell>
                      <TableCell>{formatDate(referral.createdAt)}</TableCell>
                      <TableCell>
                        {referral.note ? (
                          <span className="text-sm text-gray-600 truncate max-w-[150px] block">
                            {referral.note}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">No note</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-600 hover:bg-green-50"
                            onClick={() => {
                              setSelectedReferral(referral)
                              setShowApprovalDialog(true)
                            }}
                            disabled={processingId === referral.id}
                          >
                            <UserCheck className="w-3 h-3 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => {
                              setSelectedReferral(referral)
                              setShowRejectionDialog(true)
                            }}
                            disabled={processingId === referral.id}
                          >
                            <UserX className="w-3 h-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Referrals Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Referrals</CardTitle>
          <CardDescription>
            Complete history of broker referral requests
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
              <p>No referrals found</p>
              <p className="text-sm">Referrals will appear here when brokers submit them</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referrer</TableHead>
                    <TableHead>Referred Person</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Processed</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referrals.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{referral.referrerName}</div>
                          <div className="text-sm text-gray-500">{referral.referrerEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{referral.referredName}</TableCell>
                      <TableCell>{referral.referredEmail}</TableCell>
                      <TableCell>{referral.referredPhone}</TableCell>
                      <TableCell>{getStatusBadge(referral.status)}</TableCell>
                      <TableCell>{formatDate(referral.createdAt)}</TableCell>
                      <TableCell>
                        {referral.processedAt ? formatDate(referral.processedAt) : '-'}
                      </TableCell>
                      <TableCell>
                        {referral.note ? (
                          <span className="text-sm text-gray-600 truncate max-w-[150px] block">
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

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Referral</DialogTitle>
            <DialogDescription>
              Create a new broker account for {selectedReferral?.referredName}. This will establish them as a downline of {selectedReferral?.referrerName}.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={approvalForm.handleSubmit(handleApproval)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="referredName">Referred Person Name *</Label>
              <Input
                id="referredName"
                placeholder="Enter referred person's full name"
                {...approvalForm.register('referredName')}
              />
              {approvalForm.formState.errors.referredName && (
                <p className="text-sm text-red-600">{approvalForm.formState.errors.referredName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                placeholder="Enter username for new broker"
                {...approvalForm.register('username')}
              />
              {approvalForm.formState.errors.username && (
                <p className="text-sm text-red-600">{approvalForm.formState.errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password for new broker"
                {...approvalForm.register('password')}
              />
              {approvalForm.formState.errors.password && (
                <p className="text-sm text-red-600">{approvalForm.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Account Details</Label>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Email:</strong> {selectedReferral?.referredEmail}</p>
                <p><strong>Phone:</strong> {selectedReferral?.referredPhone}</p>
                <p><strong>Role:</strong> Broker</p>
                <p><strong>Upline:</strong> {selectedReferral?.referrerName}</p>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={() => setShowApprovalDialog(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={processingId === selectedReferral?.id}
                className="bg-green-600 hover:bg-green-700"
              >
                {processingId === selectedReferral?.id ? 'Creating Account...' : 'Approve & Create Account'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Referral</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this referral for {selectedReferral?.referredName}.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={rejectionForm.handleSubmit(handleRejection)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">Rejection Reason *</Label>
              <Textarea
                id="rejectionReason"
                placeholder="Explain why this referral is being rejected..."
                className="min-h-[100px]"
                {...rejectionForm.register('rejectionReason')}
              />
              {rejectionForm.formState.errors.rejectionReason && (
                <p className="text-sm text-red-600">{rejectionForm.formState.errors.rejectionReason.message}</p>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={() => setShowRejectionDialog(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={processingId === selectedReferral?.id}
                variant="destructive"
              >
                {processingId === selectedReferral?.id ? 'Rejecting...' : 'Reject Referral'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}