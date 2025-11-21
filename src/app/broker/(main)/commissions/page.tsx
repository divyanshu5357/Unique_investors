
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { getBrokerCommissions } from '@/lib/actions'
import { CommissionRecord } from '@/lib/types'
import { TrendingUp, DollarSign, Users, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function BrokerCommissionsPage() {
  const [user, setUser] = useState<any>(null)
  const [commissions, setCommissions] = useState<CommissionRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function getUser() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUser(session.user)
      }
    }
    getUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadCommissions()
    }
  }, [user])

  const loadCommissions = async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      const data = await getBrokerCommissions(user.id)
      setCommissions(data as CommissionRecord[])
    } catch (error) {
      console.error('Error loading commissions:', error)
      toast({
        title: 'Error',
        description: 'Failed to load commissions',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getLevelBadge = (level: number) => {
    const colors = {
      1: 'bg-green-100 text-green-800 border-green-200',
      2: 'bg-blue-100 text-blue-800 border-blue-200',
      3: 'bg-purple-100 text-purple-800 border-purple-200'
    }
    
    return (
      <Badge variant="outline" className={colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        Level {level}
      </Badge>
    )
  }

  // Calculate statistics
  const totalEarnings = commissions.reduce((sum, c) => sum + c.amount, 0)
  const level1Commissions = commissions.filter(c => c.level === 1)
  const level2Commissions = commissions.filter(c => c.level === 2)
  const level3Commissions = commissions.filter(c => c.level === 3)
  
  const level1Total = level1Commissions.reduce((sum, c) => sum + c.amount, 0)
  const level2Total = level2Commissions.reduce((sum, c) => sum + c.amount, 0)
  const level3Total = level3Commissions.reduce((sum, c) => sum + c.amount, 0)

  // Group commissions by month for trend analysis
  const monthlyData = commissions.reduce((acc, commission) => {
    const month = new Date(commission.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
    if (!acc[month]) {
      acc[month] = 0
    }
    acc[month] += commission.amount
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <TrendingUp className="h-6 w-6" />
        <h1 className="text-2xl font-bold">My Commissions</h1>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalEarnings)}</p>
                <p className="text-sm text-gray-600">Total Earnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{commissions.length}</p>
                <p className="text-sm text-gray-600">Total Commissions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {commissions.length > 0 ? formatCurrency(totalEarnings / commissions.length) : '$0.00'}
                </p>
                <p className="text-sm text-gray-600">Avg Commission</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-orange-600">{Object.keys(monthlyData).length}</p>
                <p className="text-sm text-gray-600">Active Months</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Level Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Level 1 (6%)</span>
            </CardTitle>
            <CardDescription>Direct downline commissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{formatCurrency(level1Total)}</div>
              <div className="text-sm text-gray-600">{level1Commissions.length} commissions</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Level 2 (2%)</span>
            </CardTitle>
            <CardDescription>Second level downline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(level2Total)}</div>
              <div className="text-sm text-gray-600">{level2Commissions.length} commissions</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span>Level 3 (0.5%)</span>
            </CardTitle>
            <CardDescription>Third level downline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{formatCurrency(level3Total)}</div>
              <div className="text-sm text-gray-600">{level3Commissions.length} commissions</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Commission History</CardTitle>
          <CardDescription>
            All commissions earned from your downline sales
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="text-gray-500">Loading commissions...</div>
            </div>
          ) : commissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No commissions earned yet</p>
              <p className="text-sm">Commissions will appear when your downline makes sales</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Sale ID</TableHead>
                    <TableHead>From Broker</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Sale Amount</TableHead>
                    <TableHead>Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell>{formatDate(commission.createdAt)}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {commission.saleId.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{commission.sellerName}</div>
                      </TableCell>
                      <TableCell>
                        {commission.projectName ? (
                          <div>
                            <div className="font-medium">{commission.projectName}</div>
                            {commission.plotId && (
                              <div className="text-sm text-gray-500">Plot #{commission.plotId}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getLevelBadge(commission.level)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{commission.percentage}%</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(commission.saleAmount)}
                      </TableCell>
                      <TableCell className="font-bold text-green-600">
                        {formatCurrency(commission.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Breakdown */}
      {Object.keys(monthlyData).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Earnings</CardTitle>
            <CardDescription>
              Commission earnings breakdown by month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(monthlyData)
                .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                .map(([month, amount]) => (
                  <div key={month} className="text-center p-3 border rounded-lg">
                    <div className="font-medium text-sm text-gray-600">{month}</div>
                    <div className="text-lg font-bold text-green-600">{formatCurrency(amount)}</div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
