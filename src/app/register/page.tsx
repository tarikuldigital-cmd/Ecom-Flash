import { InfoPage } from "@/components/marketing/InfoPage";
import { AuthForm } from "@/components/auth/AuthForm";

export default function Register() {
  return <InfoPage eyebrow="CREATE YOUR WORKSPACE" title="Make room for better operations." lead="Create your account and set up your business workspace."><AuthForm mode="register" /></InfoPage>;
}
