import { InfoPage } from "@/components/marketing/InfoPage";
import { AuthForm } from "@/components/auth/AuthForm";

export default function Login() {
  return <InfoPage eyebrow="MERCHANT ACCESS" title="Your workspace starts here." lead="Sign in securely to manage your commerce operations."><AuthForm mode="login" /></InfoPage>;
}
