import { createRoot } from 'react-dom/client';
import { BedrockPassportProvider } from "@bedrock_org/passport";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from './App.tsx';
import './index.css';
import "@bedrock_org/passport/dist/style.css";

// Create a client
const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <BedrockPassportProvider
      baseUrl="https://api.bedrockpassport.com"
      authCallbackUrl={`${window.location.origin}/auth/callback`}
      tenantId="orange-auwsre55nr" // Project ID
    >
      <App />
    </BedrockPassportProvider>
  </QueryClientProvider>
);
