import React from "react";
import { Container } from "../components/layout/Layout";
import SEOHead from "../components/seo/SEOHead";
import { SCHEMA_ABOUT } from "../components/seo/schemas";

const About = () => {
  const team = [
    {
      name: "Kwame Asante",
      role: "CEO & Co-founder",
      image: "/api/placeholder/150/150",
      bio: "Former Goldman Sachs VP with 12+ years in fintech. Passionate about financial inclusion across Africa.",
      linkedin: "#",
    },
    {
      name: "Amina Hassan",
      role: "CTO & Co-founder",
      image: "/api/placeholder/150/150",
      bio: "Ex-Google engineer specializing in secure payment systems. Led engineering teams at Stripe and Square.",
      linkedin: "#",
    },
    {
      name: "Joseph Mbeki",
      role: "Head of Product",
      image: "/api/placeholder/150/150",
      bio: "Product leader with deep expertise in African markets. Previously built payment solutions at Paystack.",
      linkedin: "#",
    },
    {
      name: "Fatima Al-Rashid",
      role: "Head of Operations",
      image: "/api/placeholder/150/150",
      bio: "Operations expert focused on regulatory compliance and partnerships across 15+ African countries.",
      linkedin: "#",
    },
  ];

  const values = [
    {
      icon: "🚀",
      title: "Innovation",
      description:
        "We leverage cutting-edge technology to create seamless financial experiences that work for everyone.",
    },
    {
      icon: "🤝",
      title: "Trust",
      description:
        "Security and transparency are at the core of everything we do. Your financial data is always protected.",
    },
    {
      icon: "🌍",
      title: "Inclusion",
      description:
        "We believe everyone deserves access to modern financial services, regardless of their location or background.",
    },
    {
      icon: "⚡",
      title: "Speed",
      description:
        "Fast, reliable transactions that help you move money when and where you need it most.",
    },
  ];

  const milestones = [
    {
      year: "2021",
      title: "Company Founded",
      description:
        "AfraPay was born from a vision to democratize financial services across Africa.",
    },
    {
      year: "2022",
      title: "Seed Funding",
      description:
        "Raised $5M in seed funding to build our core platform and expand our team.",
    },
    {
      year: "2023",
      title: "Launch in 5 Countries",
      description:
        "Officially launched in Nigeria, Kenya, Ghana, South Africa, and Uganda.",
    },
    {
      year: "2024",
      title: "1M+ Transactions",
      description:
        "Processed over 1 million transactions worth $100M+ for businesses and individuals.",
    },
    {
      year: "2025",
      title: "Series A & Expansion",
      description:
        "Secured $25M Series A funding and expanded to 10 additional African markets.",
    },
    {
      year: "2026",
      title: "The Future",
      description:
        "Building the next generation of financial infrastructure for Africa's digital economy.",
    },
  ];

  const stats = [
    { number: "15+", label: "Countries Served" },
    { number: "500K+", label: "Active Users" },
    { number: "$250M+", label: "Processed Volume" },
    { number: "99.9%", label: "Uptime" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <SEOHead
        title="About Us – Empowering Africa's Financial Future"
        description="Learn about AfraPay's mission to bring financial inclusion across Africa. Meet the team building secure, fast payment infrastructure for millions."
        keywords="AfraPay about, fintech Africa, financial inclusion, AfraPay team, payment infrastructure Africa"
        structuredData={SCHEMA_ABOUT}
      />
      {/* Hero Section */}
      <section
        className="relative text-white py-24 overflow-hidden"
        style={{
          backgroundImage: "url('/Carouselimages/Aboutimage.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/80 via-primary-800/75 to-secondary-800/80" />
        <div
          className="absolute top-0 right-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 left-0 w-72 h-72 bg-secondary-500/10 rounded-full blur-2xl"
          aria-hidden="true"
        />
        <Container className="relative">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Empowering Africa's Financial Future
            </h1>
            <p className="text-xl text-primary-100 mb-8">
              We're building the financial infrastructure that will power
              Africa's digital economy, making financial services accessible,
              secure, and affordable for everyone.
            </p>
          </div>
        </Container>
      </section>

      {/* Mission & Vision */}
      <section className="py-16">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-neutral-900 mb-6">
                Our Mission
              </h2>
              <p className="text-lg text-neutral-600 mb-8 leading-relaxed">
                To democratize financial services across Africa by providing
                secure, fast, and affordable payment solutions that empower
                individuals and businesses to participate fully in the digital
                economy.
              </p>

              <h3 className="text-2xl font-bold text-neutral-900 mb-4">
                Our Vision
              </h3>
              <p className="text-lg text-neutral-600 leading-relaxed">
                A financially inclusive Africa where geography, background, or
                economic status never limit anyone's ability to access modern
                financial services.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="text-center p-6 bg-gradient-to-br from-primary-50 to-secondary-50 rounded-2xl border border-primary-100"
                >
                  <div className="text-3xl font-bold text-primary-600 mb-2">
                    {stat.number}
                  </div>
                  <div className="text-neutral-600 font-medium">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Values Section */}
      <section
        id="values-section"
        className="py-16 bg-gradient-to-r from-primary-50 to-secondary-50"
      >
        <Container>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-neutral-900 mb-4">
              Our Values
            </h2>
            <p className="text-xl text-neutral-600">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div
                key={index}
                className="text-center bg-white p-8 rounded-2xl shadow-sm border border-primary-100 hover:shadow-md hover:border-primary-200 transition-all"
              >
                <div className="text-4xl mb-4">{value.icon}</div>
                <h3 className="text-xl font-bold text-neutral-900 mb-4">
                  {value.title}
                </h3>
                <p className="text-neutral-600 leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Timeline Section */}
      <section className="py-16">
        <Container>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-neutral-900 mb-4">
              Our Journey
            </h2>
            <p className="text-xl text-neutral-600">
              Key milestones in building Africa's financial future
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {milestones.map((milestone, index) => (
              <div
                key={index}
                className="relative flex items-start mb-12 last:mb-0"
              >
                {/* Timeline line */}
                {index !== milestones.length - 1 && (
                  <div className="absolute left-6 top-12 w-0.5 h-full bg-neutral-200"></div>
                )}

                {/* Timeline dot */}
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mr-6">
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>

                {/* Content */}
                <div className="flex-grow bg-gradient-to-r from-primary-50 to-secondary-50/60 p-6 rounded-lg border border-primary-200">
                  <div className="text-primary-600 font-bold text-lg mb-2">
                    {milestone.year}
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 mb-3">
                    {milestone.title}
                  </h3>
                  <p className="text-neutral-600 leading-relaxed">
                    {milestone.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Team Section */}
      <section className="py-16 bg-gradient-to-br from-primary-50 via-white to-secondary-50">
        <Container>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-neutral-900 mb-4">
              Meet Our Team
            </h2>
            <p className="text-xl text-neutral-600">
              The people behind AfraPay's mission
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <div
                key={index}
                className="text-center bg-white p-8 rounded-2xl shadow-sm border border-secondary-100"
              >
                <div className="w-24 h-24 bg-gradient-to-br from-primary-200 to-secondary-200 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary-700">
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-2">
                  {member.name}
                </h3>
                <p className="text-primary-500 font-medium mb-4">
                  {member.role}
                </p>
                <p className="text-sm text-neutral-600 leading-relaxed mb-4">
                  {member.bio}
                </p>
                <a
                  href={member.linkedin}
                  className="inline-flex items-center text-primary-500 hover:text-primary-600 font-medium"
                >
                  Connect
                  <svg
                    className="w-4 h-4 ml-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Careers Section */}
      <section className="py-16">
        <Container>
          <div className="text-center">
            <h2 className="text-3xl font-bold text-neutral-900 mb-4">
              Join Our Mission
            </h2>
            <p className="text-xl text-neutral-600 mb-8 max-w-3xl mx-auto">
              We're always looking for talented individuals who share our
              passion for building Africa's financial future. Come help us
              create technology that matters.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/careers"
                className="inline-block bg-gradient-to-r from-primary-600 to-secondary-600 text-white px-8 py-3 rounded-lg font-medium hover:from-primary-700 hover:to-secondary-700 transition-all shadow-md hover:shadow-lg text-center"
              >
                View Open Positions
              </a>
              <button
                onClick={() => {
                  const valuesSection =
                    document.querySelector("#values-section");
                  if (valuesSection) {
                    valuesSection.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className="border border-primary-300 text-primary-700 px-8 py-3 rounded-lg font-medium hover:bg-primary-50 transition-colors"
              >
                Learn More About Culture
              </button>
            </div>
          </div>
        </Container>
      </section>

      {/* Contact CTA */}
      <section
        className="relative py-16 text-white overflow-hidden"
        style={{
          backgroundImage: "url('/Carouselimages/Aboutimage.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary-800/85 via-primary-700/80 to-secondary-700/85" />
        <div
          className="absolute top-0 right-0 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 left-0 w-64 h-64 bg-secondary-500/10 rounded-full blur-2xl"
          aria-hidden="true"
        />
        <Container className="relative">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Get in Touch</h2>
            <p className="text-xl text-primary-100 mb-8">
              Have questions about our mission, products, or partnerships? We'd
              love to hear from you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:sales@afrapayafrica.com?subject=Sales Inquiry&body=Hi AfraPay Team,%0A%0AI'm interested in learning more about your payment solutions for my business.%0A%0APlease get in touch with me.%0A%0AThank you!"
                className="inline-block bg-white text-primary-700 px-8 py-3 rounded-lg font-medium hover:bg-primary-50 transition-colors shadow-sm text-center"
              >
                Contact Sales
              </a>
              <a
                href="mailto:hello@afrapayafrica.com?subject=General Inquiry&body=Hello AfraPay Team,%0A%0AI have a question about your services.%0A%0A%0A%0AThank you!"
                className="inline-block border border-white/50 text-white px-8 py-3 rounded-lg font-medium hover:bg-white/10 transition-colors text-center"
              >
                Send Message
              </a>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
};

export default About;
