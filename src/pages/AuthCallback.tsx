
import { useEffect } from "react";
import { useBedrockPassport } from "@bedrock_org/passport";
import { useNavigate } from "react-router-dom";

const AuthCallback = () => {
  const { loginCallback } = useBedrockPassport();
  const navigate = useNavigate();

  useEffect(() => {
    const handleLogin = async (token: string, refreshToken: string) => {
      const success = await loginCallback(token, refreshToken);
      if (success) {
        navigate("/");
      }
    };

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const refreshToken = params.get("refreshToken");

    if (token && refreshToken) {
      handleLogin(token, refreshToken);
    } else {
      navigate("/");
    }
  }, [loginCallback, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">Signing in...</h1>
        <div className="mt-4 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
