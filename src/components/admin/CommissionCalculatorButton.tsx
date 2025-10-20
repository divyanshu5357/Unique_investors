'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { calculateCommissionForSoldPlots } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Calculator, Loader2 } from 'lucide-react';

export default function CommissionCalculatorButton() {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleCalculateCommissions = async () => {
        setIsLoading(true);
        try {
            const result = await calculateCommissionForSoldPlots();
            
            if (result.success) {
                toast({
                    title: "Commission Calculation Complete!",
                    description: result.message,
                    variant: "default"
                });
            } else {
                toast({
                    title: "Commission Calculation Failed",
                    description: result.message,
                    variant: "destructive"
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to calculate commissions. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button 
            onClick={handleCalculateCommissions}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 text-white"
        >
            {isLoading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Calculating...
                </>
            ) : (
                <>
                    <Calculator className="mr-2 h-4 w-4" />
                    Calculate Commissions for Sold Plots
                </>
            )}
        </Button>
    );
}