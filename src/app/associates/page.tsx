"use client"

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Eye, FileText, UserCircle, Wallet, Trash, Lock } from 'lucide-react';

interface Associate {
  id: string;
  full_name: string;
  email: string;
  plots_sold: number;
  direct_balance: number;
  downline_balance: number;
  total_balance: number;
}

export default function AssociatesPage() {
  const [associates, setAssociates] = useState<Associate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssociate, setSelectedAssociate] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    fetchAssociates();
  }, []);

  const fetchAssociates = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: associates, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'broker');

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch associates",
        variant: "destructive",
      });
    } else if (associates) {
      setAssociates(associates);
    }
    setLoading(false);
  };

  const handlePasswordChange = async () => {
    if (!selectedAssociate || !newPassword) {
      toast({
        title: "Error",
        description: "Please enter a new password",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.auth.admin.updateUserById(
        selectedAssociate,
        { password: newPassword }
      );

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password updated successfully",
      });

      setNewPassword('');
      setSelectedAssociate(null);
      setIsPasswordDialogOpen(false);

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredAssociates = associates.filter(associate =>
    associate.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    associate.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Associates Management</h1>
        <Button variant="default" className="bg-green-600 hover:bg-green-700">
          + Add New Associate
        </Button>
      </div>

      <div className="flex items-center mb-6">
        <Input
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Plots Sold</TableHead>
              <TableHead className="text-right">Direct Balance</TableHead>
              <TableHead className="text-right">Downline Balance</TableHead>
              <TableHead className="text-right">Total Balance</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAssociates.map((associate) => (
              <TableRow key={associate.id}>
                <TableCell>{associate.full_name}</TableCell>
                <TableCell>{associate.email}</TableCell>
                <TableCell className="text-right">{associate.plots_sold || 0}</TableCell>
                <TableCell className="text-right">₹{associate.direct_balance || 0}</TableCell>
                <TableCell className="text-right">₹{associate.downline_balance || 0}</TableCell>
                <TableCell className="text-right">₹{associate.total_balance || 0}</TableCell>
                <TableCell>
                  <div className="flex justify-center space-x-2">
                    <Button variant="ghost" size="icon" title="View Details">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="View Documents">
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="View Profile">
                      <UserCircle className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="View Wallet">
                      <Wallet className="h-4 w-4" />
                    </Button>
                    <Dialog open={isPasswordDialogOpen && selectedAssociate === associate.id} 
                           onOpenChange={(open) => {
                             if (!open) {
                               setNewPassword('');
                               setSelectedAssociate(null);
                             }
                             setIsPasswordDialogOpen(open);
                           }}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Change Password"
                          onClick={() => setSelectedAssociate(associate.id)}
                        >
                          <Lock className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Change Password</DialogTitle>
                          <DialogDescription>
                            Set a new password for {associate.full_name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <Input
                            type="password"
                            placeholder="Enter new password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />
                          <Button 
                            onClick={handlePasswordChange}
                            disabled={!newPassword}
                            className="w-full"
                          >
                            Update Password
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button variant="ghost" size="icon" title="Delete Associate">
                      <Trash className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}