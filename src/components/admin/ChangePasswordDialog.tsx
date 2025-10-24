import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { validatePassword } from "@/lib/utils/password-validation";


export function ChangePasswordDialog({
  isOpen,
  onClose,
  brokerId,
  brokerName,
}: {
  isOpen: boolean;
  onClose: () => void;
  brokerId: string | null;
  brokerName: string;
}) {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState("");
  const { toast } = useToast();

  const resetDialog = () => {
    setPassword("");
    setValidationError("");
    setIsLoading(false);
  };

  const handleClose = () => {
    resetDialog();
    onClose();
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    
    // Validate password as user types
    const validationResult = validatePassword(newPassword);
    if (!validationResult.isValid) {
      setValidationError(validationResult.errors[0]);
    } else {
      setValidationError("");
    }
  };

  const handleSave = async () => {
    if (!brokerId) {
      toast({
        title: "Error",
        description: "No broker selected",
        variant: "destructive",
      });
      return;
    }

    const validationResult = validatePassword(password);
    if (!validationResult.isValid) {
      setValidationError(validationResult.errors[0]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/admin-update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: brokerId, newPassword: password }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to update password");
      }
      toast({
        title: "Password Updated",
        description: `Successfully updated password for ${brokerName}`,
      });
      handleClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update password. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Password for {brokerName}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-4">
            <Input
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={handlePasswordChange}
            />
            {validationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!!validationError || !password || isLoading}
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}