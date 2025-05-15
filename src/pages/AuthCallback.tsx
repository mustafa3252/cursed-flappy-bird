import { useEffect, useState } from "react";
import { useBedrockPassport } from "@bedrock_org/passport";
import { useNavigate } from "react-router-dom";

const AuthCallback = () => {
  const { loginCallback } = useBedrockPassport();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleLogin = async (token: string, refreshToken: string) => {
      try {
        const success = await loginCallback(token, refreshToken);
        if (success) {
          navigate("/");
        } else {
          setError("Login failed. Please try again.");
          console.error("Bedrock Passport loginCallback returned false.");
        }
      } catch (err) {
        setError("An error occurred during login.");
        console.error("Error in loginCallback:", err);
      }
    };

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const refreshToken = params.get("refreshToken");

    if (token && refreshToken) {
      handleLogin(token, refreshToken);
    } else {
      setError("Missing authentication tokens in callback URL.");
      console.error("Missing token or refreshToken in callback URL.", { token, refreshToken });
    }
  }, [loginCallback, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">
          {error ? "Sign in Error" : "Signing in..."}
        </h1>
        {error ? (
          <div className="mt-4 text-red-500 text-center">{error}</div>
        ) : (
          <div className="mt-4 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
