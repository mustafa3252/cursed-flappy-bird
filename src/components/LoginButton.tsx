
import { useBedrockPassport, LoginPanel } from "@bedrock_org/passport";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";

const LoginButton = () => {
  const { isLoggedIn, user, signOut } = useBedrockPassport();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
  };

  if (isLoggedIn) {
    return (
      <div className="flex items-center gap-2">
        <div className="text-sm">
          Hello, {user?.name || "User"}
        </div>
        <Button variant="outline" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Login with Orange ID</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-0 bg-transparent border-none">
        <LoginPanel
          title="Sign in to"
          logo="https://irp.cdn-website.com/e81c109a/dms3rep/multi/orange-web3-logo-v2a-20241018.svg"
          logoAlt="Orange Web3"
          walletButtonText="Connect Wallet"
          showConnectWallet={false}
          separatorText="OR"
          features={{
            enableWalletConnect: false,
            enableAppleLogin: true,
            enableGoogleLogin: true,
            enableEmailLogin: false,
          }}
          titleClass="text-xl font-bold"
          logoClass="ml-2 md:h-8 h-6"
          panelClass="container p-2 md:p-8 rounded-2xl max-w-[480px]"
          buttonClass="hover:border-orange-500"
          separatorTextClass="bg-orange-900 text-gray-500"
          separatorClass="bg-orange-900"
          linkRowClass="justify-center"
          headerClass="justify-center"
        />
      </DialogContent>
    </Dialog>
  );
};

export default LoginButton;
