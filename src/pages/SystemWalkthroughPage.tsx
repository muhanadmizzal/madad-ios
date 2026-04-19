import SystemWalkthrough from "@/components/onboarding/SystemWalkthrough";
import { useNavigate } from "react-router-dom";

export default function SystemWalkthroughPage() {
  const navigate = useNavigate();
  return <SystemWalkthrough onClose={() => navigate("/madad/tamkeen")} />;
}
