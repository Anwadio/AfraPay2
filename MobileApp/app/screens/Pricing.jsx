import React, { useState } from "react";

const Pricing = () => {
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      name: "Starter",
      description: "Perfect for individuals and small businesses",
      monthlyPrice: 0,
      annualPrice: 0,
      features: [
        "Free money transfers up to $500/month",
        "Basic financial tracking",
        "Mobile app access",
        "Email support",
        "2 connected bank accounts",
      ],
      popular: false,
      cta: "Get Started Free",
    },
    {
      name: "Professional",
      description: "Ideal for growing businesses and entrepreneurs",
      monthlyPrice: 29,
      annualPrice: 290,
      features: [
        "Unlimited money transfers",
        "Advanced analytics dashboard",
        "Multi-currency support",
        "Priority customer support",
        "Up to 10 team members",
        "API access",
        "Custom integrations",
      ],
      popular: true,
      cta: "Start 14-Day Free Trial",
    },
    {
      name: "Enterprise",
      description: "For large organizations with complex needs",
      monthlyPrice: 99,
      annualPrice: 990,
      features: [
        "Everything in Professional",
        "Dedicated account manager",
        "Custom reporting",
        "Advanced security features",
        "Unlimited team members",
        "White-label solutions",
        "24/7 phone support",
        "SLA guarantees",
      ],
      popular: false,
      cta: "Contact Sales",
    },
  ];

  const faqs = [
    {
      question: "What payment methods do you accept?",
      answer:
        "We accept all major credit cards, bank transfers, and mobile money payments including M-Pesa, Airtel Money, and MTN Mobile Money.",
    },
    {
      question: "Can I switch plans anytime?",
      answer:
        "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately and we'll prorate any charges.",
    },
    {
      question: "Is there a free trial?",
      answer:
        "Yes, we offer a 14-day free trial for our Professional and Enterprise plans. No credit card required.",
    },
    {
      question: "What are the transaction limits?",
      answer:
        "Transaction limits vary by plan and verification level. Starter plan has a $500/month limit, while Professional and Enterprise have unlimited transfers.",
    },
    {
      question: "Do you charge foreign exchange fees?",
      answer:
        "We offer competitive exchange rates with transparent pricing. Professional and Enterprise plans get preferential rates.",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-500 to-primary-600 text-white py-16">
        <Container>
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-primary-100 mb-8">
              Choose the perfect plan for your financial needs. No hidden fees,
              no surprises.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center space-x-4 mb-8">
              <span
                className={`font-medium ${!isAnnual ? "text-white" : "text-primary-200"}`}
              >
                Monthly
              </span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary-400 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isAnnual ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span
                className={`font-medium ${isAnnual ? "text-white" : "text-primary-200"}`}
              >
                Annual
                <span className="ml-1 text-sm bg-primary-400 px-2 py-1 rounded-full">
                  Save 20%
                </span>
              </span>
            </div>
          </div>
        </Container>
      </section>

      {/* Pricing Plans */}
      <section className="py-16">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {plans.map((plan, index) => (
              <div
                key={plan.name}
                className={`relative bg-white rounded-2xl border-2 p-8 ${
                  plan.popular
                    ? "border-primary-500 shadow-xl scale-105"
                    : "border-neutral-200 shadow-lg"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-neutral-900 mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-neutral-600 mb-6">{plan.description}</p>

                  <div className="mb-6">
                    <span className="text-4xl font-bold text-neutral-900">
                      ${isAnnual ? plan.annualPrice : plan.monthlyPrice}
                    </span>
                    <span className="text-neutral-600">
                      /{isAnnual ? "year" : "month"}
                    </span>
                  </div>

                  <button
                    className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                      plan.popular
                        ? "bg-primary-500 text-white hover:bg-primary-600"
                        : "bg-neutral-100 text-neutral-900 hover:bg-neutral-200"
                    }`}
                  >
                    {plan.cta}
                  </button>
                </div>

                <ul className="space-y-4">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <svg
                        className="w-5 h-5 text-primary-500 mr-3 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-neutral-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Features Comparison */}
      <section className="py-16 bg-neutral-50">
        <Container>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-neutral-900 mb-4">
              Compare All Features
            </h2>
            <p className="text-xl text-neutral-600">
              See what's included in each plan
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="text-left py-4 px-6 font-semibold text-neutral-900">
                      Features
                    </th>
                    <th className="text-center py-4 px-6 font-semibold text-neutral-900">
                      Starter
                    </th>
                    <th className="text-center py-4 px-6 font-semibold text-neutral-900">
                      Professional
                    </th>
                    <th className="text-center py-4 px-6 font-semibold text-neutral-900">
                      Enterprise
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    [
                      "Monthly Transfer Limit",
                      "$500",
                      "Unlimited",
                      "Unlimited",
                    ],
                    ["Team Members", "1", "10", "Unlimited"],
                    ["API Access", "✗", "✓", "✓"],
                    ["Priority Support", "✗", "✓", "✓"],
                    ["Custom Integrations", "✗", "✓", "✓"],
                    ["Dedicated Manager", "✗", "✗", "✓"],
                    ["White-label", "✗", "✗", "✓"],
                  ].map((row, index) => (
                    <tr key={index} className="border-t border-neutral-200">
                      <td className="py-4 px-6 font-medium text-neutral-900">
                        {row[0]}
                      </td>
                      <td className="py-4 px-6 text-center text-neutral-600">
                        {row[1]}
                      </td>
                      <td className="py-4 px-6 text-center text-neutral-600">
                        {row[2]}
                      </td>
                      <td className="py-4 px-6 text-center text-neutral-600">
                        {row[3]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Container>
      </section>

      {/* FAQ Section */}
      <section className="py-16">
        <Container>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-neutral-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-neutral-600">
              Get answers to common questions about our pricing
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="mb-8 bg-white rounded-lg border border-neutral-200 p-6"
              >
                <h3 className="text-lg font-semibold text-neutral-900 mb-3">
                  {faq.question}
                </h3>
                <p className="text-neutral-600 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary-500 text-white">
        <Container>
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-xl text-primary-100 mb-8">
              Join thousands of users who trust AfraPay for their financial
              needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-primary-500 px-8 py-3 rounded-lg font-medium hover:bg-neutral-100 transition-colors">
                Start Free Trial
              </button>
              <button className="border border-primary-300 text-white px-8 py-3 rounded-lg font-medium hover:bg-primary-400 transition-colors">
                Contact Sales
              </button>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
};

export default Pricing;
