import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Section,
  Grid,
  Button,
  Badge,
  Card,
  CardContent,
  ApplicationFormModal,
} from "../components";
import { Icon } from "../components/common/Icons";
import SEOHead from "../components/seo/SEOHead";
import { SCHEMA_CAREERS } from "../components/seo/schemas";
import api from "../services/api";

// ── Fallback data — shown when the API is unavailable ────────────────────────
const FALLBACK_DEPARTMENTS = [
  "All",
  "Engineering",
  "Product",
  "Operations",
  "Finance",
  "Marketing",
  "Support",
];

const FALLBACK_BENEFITS = [
  {
    icon: "zap",
    title: "Competitive Salary",
    description:
      "Salaries benchmarked to the top quartile of the East African tech market, reviewed annually.",
    color: "bg-primary-50 text-primary-600",
  },
  {
    icon: "shield",
    title: "Health Insurance",
    description:
      "Comprehensive medical, dental, and vision cover for you and your immediate family.",
    color: "bg-success-50 text-success-600",
  },
  {
    icon: "globe",
    title: "Flexible & Remote",
    description:
      "Many roles are fully remote or hybrid. We trust you to do great work wherever you are.",
    color: "bg-secondary-50 text-secondary-600",
  },
  {
    icon: "star",
    title: "Equity & Bonuses",
    description:
      "All full-time employees receive equity options and are eligible for performance bonuses.",
    color: "bg-warning-50 text-warning-600",
  },
  {
    icon: "book",
    title: "Learning Budget",
    description:
      "SSP 5,000 / year per employee for courses, conferences, books, and certifications.",
    color: "bg-primary-50 text-primary-600",
  },
  {
    icon: "users",
    title: "Mission-Driven Team",
    description:
      "Work alongside people genuinely passionate about financial inclusion across Africa.",
    color: "bg-success-50 text-success-600",
  },
];

const FALLBACK_VALUES = [
  {
    icon: "zap",
    color: "bg-primary-50 text-primary-600",
    title: "Move Fast",
    body: "We ship, learn, and iterate. Speed with quality is our default.",
  },
  {
    icon: "checkCircle",
    color: "bg-success-50 text-success-600",
    title: "Own It",
    body: "Every team member takes full ownership of their work and its impact.",
  },
  {
    icon: "globe",
    color: "bg-secondary-50 text-secondary-600",
    title: "Africa First",
    body: "Everything we build is designed for African realities, not adapted from elsewhere.",
  },
  {
    icon: "shield",
    color: "bg-warning-50 text-warning-600",
    title: "Radical Honesty",
    body: "We give direct, respectful feedback and expect the same in return.",
  },
];

const FALLBACK_LEVEL_COLORS = {
  "Entry-level": "bg-success-100 text-success-700",
  "Mid-level": "bg-primary-100 text-primary-700",
  Senior: "bg-secondary-100 text-secondary-700",
  Lead: "bg-warning-100 text-warning-700",
};

const Careers = () => {
  const navigate = useNavigate();
  const [activeDept, setActiveDept] = useState("All");
  const [search, setSearch] = useState("");
  const [applicationModal, setApplicationModal] = useState({
    isOpen: false,
    role: null,
  });

  // ── API state ──────────────────────────────────────────────────────────────
  const [openRoles, setOpenRoles] = useState([]);
  const [departments, setDepartments] = useState(FALLBACK_DEPARTMENTS);
  const [benefits, setBenefits] = useState(FALLBACK_BENEFITS);
  const [values, setValues] = useState(FALLBACK_VALUES);
  const [levelColors, setLevelColors] = useState(FALLBACK_LEVEL_COLORS);
  const [rolesNotice, setRolesNotice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchCareersData = async () => {
      try {
        const data = await api.get("/careers");
        const payload = data?.data ?? data;
        if (cancelled) return;

        if (payload.roles !== undefined) setOpenRoles(payload.roles);
        if (payload.departments?.length) setDepartments(payload.departments);
        if (payload.benefits?.length) setBenefits(payload.benefits);
        if (payload.values?.length) setValues(payload.values);
        if (payload.levelColors) setLevelColors(payload.levelColors);
        if (payload.rolesNotice) setRolesNotice(payload.rolesNotice);
      } catch {
        // Network / server error — fallback data already in state, nothing to do
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCareersData();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = openRoles.filter((r) => {
    const matchDept = activeDept === "All" || r.department === activeDept;
    const matchSearch =
      search === "" ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchDept && matchSearch;
  });

  const handleApplyClick = (role) => {
    setApplicationModal({
      isOpen: true,
      role,
    });
  };

  const handleCloseModal = () => {
    setApplicationModal({
      isOpen: false,
      role: null,
    });
  };

  return (
    <div className="min-h-screen">
      <SEOHead
        title="Careers – Join the AfraPay Team"
        description="Join AfraPay and help build Africa's financial future. We're hiring engineers, product managers, compliance specialists, and more. Remote-friendly roles in East Africa."
        keywords="AfraPay careers, jobs Africa, fintech jobs Juba, remote jobs East Africa, payment engineer"
        structuredData={SCHEMA_CAREERS}
      />
      {/* Hero */}
      <section
        className="relative text-white py-24 overflow-hidden"
        style={{
          backgroundImage: "url('/Carouselimages/Careersimage.png')",
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
          <div className="max-w-2xl">
            <Badge
              variant="outline"
              className="mb-6 border-white/30 text-white bg-white/10"
            >
              💼 Join the Team
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Build Africa's{" "}
              <span className="text-primary-300">Financial Future</span>
            </h1>
            <p className="text-lg md:text-xl text-neutral-200 max-w-xl leading-relaxed">
              We're a passionate team on a mission to make financial services
              accessible to every South Sudanese and, eventually, every African.
              Come build with us.
            </p>
            <div className="flex flex-wrap gap-4 mt-8">
              <div className="bg-white/10 border border-white/20 rounded-full px-5 py-2 text-sm font-medium">
                🌍 {loading ? "…" : openRoles.length} open roles
              </div>
              <div className="bg-white/10 border border-white/20 rounded-full px-5 py-2 text-sm font-medium">
                📍 Juba · Wau · Malakal · Remote
              </div>
              <div className="bg-white/10 border border-white/20 rounded-full px-5 py-2 text-sm font-medium">
                ⚡ Fast hiring process
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Values */}
      <Section spacing="xl" className="bg-white">
        <Container>
          <div className="text-center mb-12">
            <Badge
              variant="outline"
              className="mb-4 border-primary-200 text-primary-600"
            >
              💡 Our Values
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
              How We Work
            </h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Our values aren't wall decorations — they're how we make decisions
              every day.
            </p>
          </div>
          <Grid cols={{ base: 1, md: 2, lg: 4 }} gap={6}>
            {values.map((v) => (
              <Card
                key={v.title}
                className="group relative p-6 border-neutral-100 bg-white overflow-hidden cursor-default
                  transition-all duration-300 ease-out
                  hover:-translate-y-2 hover:shadow-xl hover:shadow-primary-100 hover:border-primary-300"
              >
                {/* Subtle gradient wash on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary-50/0 to-primary-100/0 group-hover:from-primary-50/60 group-hover:to-primary-100/30 transition-all duration-300 pointer-events-none rounded-xl" />
                <CardContent className="relative">
                  <div
                    className={`w-12 h-12 ${v.color} rounded-xl flex items-center justify-center mb-4
                      transition-all duration-300 group-hover:scale-110 group-hover:rounded-2xl group-hover:shadow-md`}
                  >
                    <Icon
                      name={v.icon}
                      className="w-6 h-6 transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                  <h3 className="font-bold text-neutral-900 mb-2 transition-colors duration-300 group-hover:text-primary-700">
                    {v.title}
                  </h3>
                  <p className="text-sm text-neutral-500 leading-relaxed transition-colors duration-300 group-hover:text-neutral-600">
                    {v.body}
                  </p>
                  {/* Bottom accent line */}
                  <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary-500 group-hover:w-full transition-all duration-500 ease-out rounded-b-xl" />
                </CardContent>
              </Card>
            ))}
          </Grid>
        </Container>
      </Section>

      {/* Benefits */}
      <Section spacing="xl" className="bg-primary-50">
        <Container>
          <div className="text-center mb-12">
            <Badge
              variant="outline"
              className="mb-4 border-primary-200 text-primary-600"
            >
              🎁 Benefits & Perks
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
              We Take Care of Our Team
            </h2>
          </div>
          <Grid cols={{ base: 1, md: 2, lg: 3 }} gap={6}>
            {benefits.map((b) => (
              <Card
                key={b.title}
                className="group relative p-6 bg-white border-neutral-100 overflow-hidden cursor-default
                  transition-all duration-300 ease-out
                  hover:-translate-y-2 hover:shadow-xl hover:shadow-primary-100 hover:border-primary-300"
              >
                {/* Subtle gradient wash on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary-50/0 to-primary-100/0 group-hover:from-primary-50/60 group-hover:to-primary-100/30 transition-all duration-300 pointer-events-none rounded-xl" />
                <CardContent className="relative">
                  <div
                    className={`w-12 h-12 ${b.color} rounded-xl flex items-center justify-center mb-4
                      transition-all duration-300 group-hover:scale-110 group-hover:rounded-2xl group-hover:shadow-md`}
                  >
                    <Icon
                      name={b.icon}
                      className="w-6 h-6 transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                  <h3 className="font-bold text-neutral-900 mb-2 transition-colors duration-300 group-hover:text-primary-700">
                    {b.title}
                  </h3>
                  <p className="text-sm text-neutral-500 leading-relaxed transition-colors duration-300 group-hover:text-neutral-600">
                    {b.description}
                  </p>
                  {/* Bottom accent line */}
                  <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary-500 group-hover:w-full transition-all duration-500 ease-out rounded-b-xl" />
                </CardContent>
              </Card>
            ))}
          </Grid>
        </Container>
      </Section>

      {/* Open roles */}
      <Section spacing="xl" className="bg-white">
        <Container>
          <div className="text-center mb-10">
            <Badge
              variant="outline"
              className="mb-4 border-secondary-200 text-secondary-600"
            >
              📋 Open Positions
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
              Find Your Role
            </h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              We're hiring across engineering, product, operations, and more.
            </p>
          </div>

          {/* Search + filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Icon
                name="search"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400"
              />
              <input
                type="text"
                placeholder="Search roles or skills…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl bg-white text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-10">
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setActiveDept(dept)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                  activeDept === dept
                    ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                    : "bg-white text-neutral-600 border-neutral-200 hover:border-primary-300 hover:text-primary-600"
                }`}
              >
                {dept}
              </button>
            ))}
          </div>

          {/* Notice banner when DB returned a message */}
          {rolesNotice && (
            <div className="mb-6 flex items-start gap-3 bg-warning-50 border border-warning-200 text-warning-800 rounded-xl px-5 py-4 text-sm">
              <Icon name="clock" className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{rolesNotice}</span>
            </div>
          )}

          {/* Loading skeleton */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="p-6 border border-neutral-100 rounded-xl animate-pulse bg-white"
                >
                  <div className="h-5 w-1/3 bg-neutral-200 rounded mb-3" />
                  <div className="h-4 w-1/4 bg-neutral-100 rounded mb-4" />
                  <div className="h-3 w-full bg-neutral-100 rounded mb-2" />
                  <div className="h-3 w-5/6 bg-neutral-100 rounded" />
                </div>
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="space-y-4">
              {filtered.map((role) => (
                <Card
                  key={role.id}
                  className="p-6 border-neutral-100 hover:shadow-md hover:border-primary-200 transition-all"
                >
                  <CardContent>
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold text-neutral-900">
                            {role.title}
                          </h3>
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full ${levelColors[role.level]}`}
                          >
                            {role.level}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-neutral-500 mb-3">
                          <span className="flex items-center gap-1">
                            <Icon name="briefcase" className="w-4 h-4" />
                            {role.department}
                          </span>
                          <span className="flex items-center gap-1">
                            <Icon name="mapPin" className="w-4 h-4" />
                            {role.location}
                          </span>
                          <span className="flex items-center gap-1">
                            <Icon name="clock" className="w-4 h-4" />
                            {role.type}
                          </span>
                        </div>
                        <p className="text-neutral-600 text-sm leading-relaxed mb-4">
                          {role.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {role.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded-full font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <Button
                          size="md"
                          onClick={() => handleApplyClick(role)}
                          className="bg-primary-600 hover:bg-primary-700 text-white font-bold whitespace-nowrap"
                        >
                          Apply Now
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-neutral-900 mb-2">
                No roles found
              </h3>
              <p className="text-neutral-500 mb-6">
                Try a different search term or department filter.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setActiveDept("All");
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </Container>
      </Section>

      {/* Spontaneous application */}
      <Section spacing="lg" className="bg-primary-50">
        <Container>
          <Card className="p-8 md:p-12 border-primary-100 bg-white max-w-3xl mx-auto text-center">
            <CardContent>
              <div className="text-5xl mb-5">💌</div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-3">
                Don't See a Perfect Fit?
              </h2>
              <p className="text-neutral-600 leading-relaxed mb-8 max-w-xl mx-auto">
                We're always interested in extraordinary people. Send us your CV
                and a short note about how you'd contribute to our mission — we
                read every one.
              </p>
              <a href="mailto:careers@afrapayafrica.com">
                <Button
                  size="lg"
                  className="bg-primary-600 hover:bg-primary-700 text-white font-bold"
                >
                  <Icon name="mail" className="w-5 h-5 inline mr-2" />
                  careers@afrapayafrica.com
                </Button>
              </a>
            </CardContent>
          </Card>
        </Container>
      </Section>

      {/* CTA */}
      <Section
        spacing="lg"
        className="bg-gradient-to-r from-primary-700 via-primary-600 to-secondary-600 text-white"
      >
        <Container>
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Make an Impact?
            </h2>
            <p className="text-xl text-primary-100 mb-8 max-w-xl mx-auto">
              Join a team that's reshaping finance for millions of people across
              South Sudan.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="xl"
                onClick={() => {
                  document
                    .querySelector("#open-roles")
                    ?.scrollIntoView({ behavior: "smooth" });
                  window.scrollTo({ top: 800, behavior: "smooth" });
                }}
                className="bg-white text-primary-700 hover:bg-primary-50 font-bold px-10"
              >
                View Open Roles
              </Button>
              <Button
                variant="outline"
                size="xl"
                onClick={() => navigate("/about")}
                className="border-2 border-white/50 !text-white !bg-transparent hover:!bg-white/10 font-bold px-10"
              >
                <Icon name="users" className="w-5 h-5 inline mr-2" />
                Meet the Team
              </Button>
            </div>
          </div>
        </Container>
      </Section>

      {/* Application Form Modal */}
      <ApplicationFormModal
        isOpen={applicationModal.isOpen}
        onClose={handleCloseModal}
        role={applicationModal.role}
      />
    </div>
  );
};

export default Careers;
