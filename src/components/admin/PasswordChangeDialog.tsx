"use client"

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { updateBrokerPassword } from "@/lib/helpers/password";
import { CheckCircle2, XCircle } from "lucide-react";

interface ValidationRule {
    test: (value: string) => boolean;
    message: string;
}

const PASSWORD_RULES: ValidationRule[] = [
    {
        test: (value) => value.length >= 8,
        message: "At least 8 characters"
    },
    {
        test: (value) => /^[a-zA-Z0-9]+$/.test(value),
        message: "Only letters and numbers allowed"
    }
];

interface PasswordChangeDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (password: string) => Promise<void>;
    brokerName: string;
}

export function PasswordChangeDialog({
    isOpen,
    onClose,
    onSubmit,
    brokerName,
}: PasswordChangeDialogProps) {
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validationResults = PASSWORD_RULES.map(rule => ({
        isValid: rule.test(password),
        message: rule.message
    }));

    const isValid = validationResults.every(result => result.isValid);

    const handleSubmit = async () => {
        if (!isValid) return;
        
        setIsSubmitting(true);
        try {
            await onSubmit(password);
            setPassword("");
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                    <DialogDescription>
                        Set a new password for {brokerName}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-3">
                        <Input
                            type="password"
                            placeholder="Enter new password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full"
                        />
                        <div className="space-y-2">
                            {validationResults.map((result, index) => (
                                <div key={index} className="flex items-center gap-2 text-sm">
                                    {result.isValid ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <XCircle className="h-4 w-4 text-red-500" />
                                    )}
                                    <span className={result.isValid ? "text-green-500" : "text-red-500"}>
                                        {result.message}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!isValid || isSubmitting}
                        >
                            {isSubmitting ? "Updating..." : "Update Password"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}