import { InfoPage } from "@/components/marketing/InfoPage";

const plans = [
  { name: "Starter", description: "For small stores organizing daily work", features: ["Core order workspace", "Product and inventory basics", "Essential reporting"] },
  { name: "Growth", description: "For teams connecting more workflows", features: ["Expanded operations tools", "Team roles and workflows", "Advanced insights"] },
  { name: "Business", description: "For established operations", features: ["Advanced controls", "Integration-ready workflows", "Priority support options"] },
  { name: "Enterprise", description: "For complex and multi-store operations", features: ["Configurable access and limits", "Custom integration planning", "Dedicated onboarding options"] },
] as const;

export default function Pricing() {
  return (
    <InfoPage eyebrow="PRICING & PLANS" title="A plan for the way you grow." lead="Choose the level of operations support that fits your business. Plan prices, billing cycles and usage limits will be configurable by the Ecom-Flash platform team.">
      <div className="simple-card-grid">
        {plans.map((plan) => (
          <article className="simple-card" key={plan.name}>
            <span className="eyebrow">{plan.name}</span>
            <h3>{plan.description}</h3>
            <ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
            <p>Pricing displayed in Bangladeshi Taka (৳ BDT) when plans are activated.</p>
          </article>
        ))}
      </div>
      <h2>Transparent billing, in BDT</h2>
      <p>Bangladesh is the initial currency configuration. Subscription prices, invoices, usage and payment history will use ৳ BDT consistently. No live price or payment is being collected in this development preview.</p>
    </InfoPage>
  );
}
