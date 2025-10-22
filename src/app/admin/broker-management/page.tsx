"use client"

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from '@/hooks/use-toast';

interface Broker {
  id: string;
  email: string;
  full_name: string;
}

export default function BrokerManagement() {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPasswords, setNewPasswords] = useState<{ [key: string]: string }>({});
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    const fetchBrokers = async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('role', 'broker');

      if (profiles) {
        setBrokers(profiles);
      }
      setLoading(false);
    };

    fetchBrokers();
  }, []);

  const handlePasswordChange = async (brokerId: string) => {
    const newPassword = newPasswords[brokerId];
    if (!newPassword) {
      toast({
        title: "Error",
        description: "Please enter a new password",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update password using admin API
      const { error } = await supabase.auth.admin.updateUserById(
        brokerId,
        { password: newPassword }
      );

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password updated successfully",
      });

      // Clear the password field
      setNewPasswords(prev => ({
        ...prev,
        [brokerId]: ''
      }));

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Broker Management</h1>
      <div className="grid gap-6">
        {brokers.map((broker) => (
          <Card key={broker.id}>
            <CardHeader>
              <CardTitle>{broker.full_name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="flex-grow">
                  <p className="text-sm text-muted-foreground">Email: {broker.email}</p>
                  <div className="mt-4">
                    <Input
                      type="password"
                      placeholder="New password"
                      value={newPasswords[broker.id] || ''}
                      onChange={(e) => setNewPasswords(prev => ({
                        ...prev,
                        [broker.id]: e.target.value
                      }))}
                    />
                  </div>
                </div>
                <Button
                  onClick={() => handlePasswordChange(broker.id)}
                  disabled={!newPasswords[broker.id]}
                >
                  Update Password
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}