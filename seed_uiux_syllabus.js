import mongoose from "mongoose";
import dotenv from "dotenv";
import { Syllabus } from "./models/syllabus.model.js";
import { Chapter } from "./models/chapter.model.js";
import { Lecture } from "./models/lecture.model.js";
import { Admin } from "./models/admin.model.js";
import { BatchSyllabus } from "./models/batchSyllabus.model.js";
import { BatchLecture } from "./models/batchLecture.model.js";

dotenv.config({ path: "./.env" });

const syllabusData = [
  {
    chapterTitle: "Module 1: Basic Figma (Week 1) [Faculty: Qutbuddin]",
    chapterOrder: 1,
    lectures: [
      {
        title: "Lecture 1: Introduction to Figma",
        duration: 120,
        order: 1,
        description: "Lecturer: Qutbuddin | Topics: Introduction to Figma, What Figma is used for, Role of Figma in UI/UX design, Creating a Figma account, Understanding the Figma dashboard, Creating a new design file, Understanding the Figma workspace (Toolbar, Layers panel, Assets panel, Properties panel), Zooming and navigation, Selection tools.",
        subLectures: [
          { title: "Introduction & Figma Dashboard Navigation", duration: 30, order: 1 },
          { title: "Figma Workspace & Toolbar Setup", duration: 30, order: 2 },
          { title: "Selection, Zooming & Navigation Tools", duration: 30, order: 3 },
          { title: "Practical: Creating First Figma File, Pages & Frames", duration: 30, order: 4 }
        ]
      },
      {
        title: "Lecture 2: Basic Design Tools",
        duration: 120,
        order: 2,
        description: "Lecturer: Qutbuddin | Topics: Frames, Rectangles, Circles, Lines, Basic shapes, Text tool, Font size, Font weight, Text alignment, Colors, Fills, Borders, Corner radius, Shadows, Basic effects, Importing images.",
        subLectures: [
          { title: "Working with Frames, Vector Shapes & Lines", duration: 30, order: 1 },
          { title: "Text Tools, Typography Properties & Alignments", duration: 30, order: 2 },
          { title: "Color Fills, Borders, Radius, Shadows & Effects", duration: 30, order: 3 },
          { title: "Practical: Designing Simple Cards, Buttons & Image Sections", duration: 30, order: 4 }
        ]
      },
      {
        title: "Lecture 3: Buttons, Icons and Basic Components",
        duration: 120,
        order: 3,
        description: "Lecturer: Qutbuddin | Topics: Creating buttons, Creating basic icons, Working with images, Organizing layers, Naming layers properly, Grouping elements, Introduction to components, Creating basic reusable components, Understanding component instances.",
        subLectures: [
          { title: "Layer Organization, Grouping & Proper Naming Conventions", duration: 30, order: 1 },
          { title: "Designing Buttons & Basic Custom Vector Icons", duration: 30, order: 2 },
          { title: "Introduction to Reusable Components & Instances", duration: 30, order: 3 },
          { title: "Practical: Creating Primary/Secondary Buttons & Card UI Kit", duration: 30, order: 4 }
        ]
      },
      {
        title: "Lecture 4: Basic Auto Layout, Frames and Constraints",
        duration: 120,
        order: 4,
        description: "Lecturer: Qutbuddin | Topics: Understanding frames (Desktop, Tablet, Mobile frames), Introduction to Auto Layout, Horizontal Auto Layout, Vertical Auto Layout, Spacing between elements, Basic padding, Basic alignment, Introduction to constraints.",
        subLectures: [
          { title: "Device Frames (Desktop, Tablet, Mobile) & Breakpoint Basics", duration: 30, order: 1 },
          { title: "Auto Layout Fundamentals: Horizontal & Vertical Direction", duration: 30, order: 2 },
          { title: "Padding, Spacing & Constraints Setup", duration: 30, order: 3 },
          { title: "Practical: Building Navigation Bar & Responsive Card Layout", duration: 30, order: 4 }
        ]
      },
      {
        title: "Lecture 5: Basic Website Wireframe and Figma Assignment",
        duration: 120,
        order: 5,
        description: "Lecturer: Qutbuddin | Topics: Understanding basic website structure (Header, Navigation, Hero section, Content section, Cards, CTA section, Footer), Organizing a complete Figma file, Layer naming, Basic spacing, Basic alignment.",
        subLectures: [
          { title: "Anatomy of a Complete Website Homepage Layout", duration: 30, order: 1 },
          { title: "Header, Hero Section & Navigation Design", duration: 30, order: 2 },
          { title: "Cards Section, CTA & Footer Wireframing", duration: 30, order: 3 },
          { title: "Practical Assignment: Complete Homepage Wireframe Build", duration: 30, order: 4 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 2: UI/UX Foundations (Week 2) [Faculty: Ayaan]",
    chapterOrder: 2,
    lectures: [
      {
        title: "Lecture 6: Introduction to UI and UX",
        duration: 120,
        order: 6,
        description: "Lecturer: Ayaan | Topics: What is UI Design?, What is UX Design?, Difference between UI and UX, Role of a UI/UX Designer, UI/UX design process, Examples of good and bad user experience.",
        subLectures: [
          { title: "Defining UI vs UX Design & Industry Roles", duration: 40, order: 1 },
          { title: "The End-to-End UI/UX Design Process", duration: 40, order: 2 },
          { title: "Case Studies: Analyzing Good vs Bad User Experiences", duration: 40, order: 3 }
        ]
      },
      {
        title: "Lecture 7: Understanding Users",
        duration: 120,
        order: 7,
        description: "Lecturer: Ayaan | Topics: Understanding target users, Identifying user needs, Identifying user problems, Introduction to user research, User personas, User behavior.",
        subLectures: [
          { title: "User Research Fundamentals & Identifying User Needs", duration: 40, order: 1 },
          { title: "Creating User Personas & Empathy Maps", duration: 40, order: 2 },
          { title: "Analyzing User Behavior Patterns & Pain Points", duration: 40, order: 3 }
        ]
      },
      {
        title: "Lecture 8: User Flow and Journey Mapping",
        duration: 120,
        order: 8,
        description: "Lecturer: Ayaan | Topics: What is a user flow?, Entry points, User actions, Decision points, Journey mapping, Identifying user pain points.",
        subLectures: [
          { title: "User Flow Architecture, Entry Points & Decision Trees", duration: 40, order: 1 },
          { title: "Customer Journey Mapping & Identifying Friction Points", duration: 40, order: 2 },
          { title: "Practical Activity: Diagramming User Flows in Figma", duration: 40, order: 3 }
        ]
      },
      {
        title: "Lecture 9: Wireframing and Information Structure",
        duration: 120,
        order: 9,
        description: "Lecturer: Ayaan | Topics: Purpose of wireframing, Low-fidelity wireframes, Information hierarchy, Content placement, Website structure, Screen planning.",
        subLectures: [
          { title: "Low-Fidelity Wireframing & Screen Planning", duration: 40, order: 1 },
          { title: "Information Hierarchy & Content Placement Strategies", duration: 40, order: 2 },
          { title: "Practical: Refining Week 1 Wireframe with UX Principles", duration: 40, order: 3 }
        ]
      },
      {
        title: "Lecture 10: Layout, Grid, Spacing, Typography and Color",
        duration: 120,
        order: 10,
        description: "Lecturer: Ayaan | Topics: Layout principles, Alignment, Whitespace, Margins, Padding, Grid systems, Typography, Font hierarchy, Color principles, Contrast, Visual hierarchy.",
        subLectures: [
          { title: "Grid Systems, Margins, Padding & Whitespace Control", duration: 40, order: 1 },
          { title: "Typography Scale, Hierarchy & Readability", duration: 40, order: 2 },
          { title: "Color Theory, Contrast Ratios & Visual Hierarchy", duration: 40, order: 3 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 3: Advanced Figma, Prototyping and Animation (Week 3) [Faculty: Ayaan]",
    chapterOrder: 3,
    lectures: [
      {
        title: "Lecture 11: Advanced Auto Layout",
        duration: 120,
        order: 11,
        description: "Lecturer: Ayaan | Topics: Advanced Auto Layout, Nested Auto Layout, Hug contents, Fill container, Fixed dimensions, Advanced spacing systems, Responsive card systems.",
        subLectures: [
          { title: "Nested Auto Layout Structures & Complex Hierarchies", duration: 40, order: 1 },
          { title: "Hug Contents vs Fill Container vs Fixed Sizing Rules", duration: 40, order: 2 },
          { title: "Practical: Building Advanced Responsive Card Systems", duration: 40, order: 3 }
        ]
      },
      {
        title: "Lecture 12: Advanced Components and Variants",
        duration: 120,
        order: 12,
        description: "Lecturer: Ayaan | Topics: Component architecture, Component properties, Variants, States, Reusable systems, Button states, Input states, Menu states.",
        subLectures: [
          { title: "Design System Component Architecture & Properties", duration: 40, order: 1 },
          { title: "Creating Component Variants for Interactive States", duration: 40, order: 2 },
          { title: "Practical: Designing Button States, Input Forms & Menus", duration: 40, order: 3 }
        ]
      },
      {
        title: "Lecture 13: Responsive Design in Figma",
        duration: 120,
        order: 13,
        description: "Lecturer: Ayaan | Topics: Responsive frames, Advanced constraints, Desktop to tablet adaptation, Tablet to mobile adaptation, Responsive components, Flexible layout systems.",
        subLectures: [
          { title: "Multi-Device Constraints & Responsive Breakpoints", duration: 40, order: 1 },
          { title: "Desktop to Tablet & Tablet to Mobile Layout Adaptations", duration: 40, order: 2 },
          { title: "Practical: Converting Fixed Layouts to Flexible Systems", duration: 40, order: 3 }
        ]
      },
      {
        title: "Lecture 14: Prototyping and Interactions",
        duration: 120,
        order: 14,
        description: "Lecturer: Ayaan | Topics: Connecting screens, Prototype flows, Triggers, Actions, Click interactions, Hover interactions, Overlays, Navigation, Transitions.",
        subLectures: [
          { title: "Interactive Screen Connections & Multi-Flow Prototypes", duration: 40, order: 1 },
          { title: "Interaction Triggers: On Click, Hover, Drag & Overlays", duration: 40, order: 2 },
          { title: "Practical: Interactive App Navigation & Modal Overlays", duration: 40, order: 3 }
        ]
      },
      {
        title: "Lecture 15: Advanced Animation and Smart Animate",
        duration: 120,
        order: 15,
        description: "Lecturer: Ayaan | Topics: Smart Animate, Interactive components, Micro-interactions, Button animation, Menu animation, Card animation, Page transitions, Loading animations, Presenting prototypes.",
        subLectures: [
          { title: "Smart Animate Mechanics & Micro-Interactions", duration: 40, order: 1 },
          { title: "Animated Cards, Menus, Buttons & Loading States", duration: 40, order: 2 },
          { title: "Project: End-to-End Interactive & Animated Prototype", duration: 40, order: 3 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 4: WordPress Basics (Weeks 4–5) [Faculty: Ayaan]",
    chapterOrder: 4,
    lectures: [
      {
        title: "Lecture 16: Introduction to WordPress & Web Hosting Setup",
        duration: 120,
        order: 16,
        description: "Lecturer: Ayaan | Topics: Overview of WordPress CMS (WordPress.org vs WordPress.com), Web hosting setup, Local server setup (XAMPP/LocalWP), Database creation & WordPress installation.",
        subLectures: [
          { title: "WordPress Architecture & CMS Ecosystem", duration: 40, order: 1 },
          { title: "LocalWP & XAMPP Local Development Environment Setup", duration: 40, order: 2 },
          { title: "Database Setup & Installing WordPress Manually", duration: 40, order: 3 }
        ]
      },
      {
        title: "Lecture 17: WordPress Dashboard & Settings Navigation",
        duration: 120,
        order: 17,
        description: "Lecturer: Ayaan | Topics: WordPress Admin Dashboard overview, General settings, Permalinks structure, Reading/Writing settings, Discussion & Comment moderation rules.",
        subLectures: [
          { title: "WordPress Admin Panel Tour & Navigation", duration: 40, order: 1 },
          { title: "Configuring SEO-Friendly Permalinks & Core Settings", duration: 40, order: 2 },
          { title: "Managing Content Discussion, Comments & Moderation", duration: 40, order: 3 }
        ]
      },
      {
        title: "Lecture 18: Posts vs Pages & Content Management",
        duration: 120,
        order: 18,
        description: "Lecturer: Ayaan | Topics: Understanding WordPress Posts vs Pages, Categories, Tags, Taxonomy management, Content publishing workflow.",
        subLectures: [
          { title: "Conceptual Difference: Posts vs Static Pages", duration: 40, order: 1 },
          { title: "Creating Categories, Tags & Custom Taxonomies", duration: 40, order: 2 },
          { title: "Drafting, Scheduling & Publishing Content Workflow", duration: 40, order: 3 }
        ]
      },
      {
        title: "Lecture 19: WordPress Themes & Appearance Customization",
        duration: 120,
        order: 19,
        description: "Lecturer: Ayaan | Topics: WordPress Theme directory, Installing themes, Theme Customizer, Child Themes concepts, Site identity & branding setup.",
        subLectures: [
          { title: "Exploring Theme Directory & Premium Themes", duration: 40, order: 1 },
          { title: "Using Theme Customizer for Logos, Colors & Fonts", duration: 40, order: 2 },
          { title: "Child Themes Overview & Style Overrides", duration: 40, order: 3 }
        ]
      },
      {
        title: "Lecture 20: Plugins Ecosystem & Essential Security/Utility Plugins",
        duration: 120,
        order: 20,
        description: "Lecturer: Ayaan | Topics: WordPress Plugin architecture, Searching and installing plugins, Essential security, backup & utility plugins, Plugin conflict troubleshooting.",
        subLectures: [
          { title: "WordPress Plugin Ecosystem Overview", duration: 40, order: 1 },
          { title: "Installing Essential Backup, Security & Utility Plugins", duration: 40, order: 2 },
          { title: "Troubleshooting Plugin Conflicts & Compatibility", duration: 40, order: 3 }
        ]
      },
      {
        title: "Lecture 21: User Roles, Permissions & Access Management",
        duration: 120,
        order: 21,
        description: "Lecturer: Ayaan | Topics: WordPress User roles (Administrator, Editor, Author, Contributor, Subscriber), Custom user roles, Access control plugins.",
        subLectures: [
          { title: "Understanding Default WordPress User Roles & Capabilities", duration: 60, order: 1 },
          { title: "Managing Users & Custom Role Permissions", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 22: Working with Gutenberg Block Editor",
        duration: 120,
        order: 22,
        description: "Lecturer: Ayaan | Topics: Gutenberg Block Editor interface, Core blocks, Reusable blocks, Grouping, Cover images & block layouts.",
        subLectures: [
          { title: "Gutenberg Layout Engine & Core Blocks Navigation", duration: 60, order: 1 },
          { title: "Building Custom Layouts with Reusable & Group Blocks", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 23: Media Library, Asset Optimization & Image Management",
        duration: 120,
        order: 23,
        description: "Lecturer: Ayaan | Topics: Managing Media Library, Image compression (WebP, JPEG), Image SEO (Alt tags, titles), Video embedding.",
        subLectures: [
          { title: "WordPress Media Library Management & Alt Tag Optimization", duration: 60, order: 1 },
          { title: "Image Compression, WebP Conversion & Video Embeds", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 24: Menus, Widgets & Navigation Structure",
        duration: 120,
        order: 24,
        description: "Lecturer: Ayaan | Topics: Creating primary & footer menus, Dropdown menus, Sidebar widgets, Block widgets, Site navigation hierarchy.",
        subLectures: [
          { title: "Configuring Multi-Level Navigation Menus & Sub-menus", duration: 60, order: 1 },
          { title: "Managing Sidebars, Footer Areas & Block Widgets", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 25: WordPress Site Setup Project & Assignment",
        duration: 120,
        order: 25,
        description: "Lecturer: Ayaan | Practical Assignment: Hands-on end-to-end WordPress installation, theme configuration, navigation setup, and basic page publishing.",
        subLectures: [
          { title: "Project Scoping & Requirement Walkthrough", duration: 40, order: 1 },
          { title: "Guided Execution: Site Setup & Customization", duration: 40, order: 2 },
          { title: "Project Review & Instructor Feedback", duration: 40, order: 3 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 5: Elementor and Advanced WordPress (Weeks 6–7) [Faculty: Ayaan]",
    chapterOrder: 5,
    lectures: [
      {
        title: "Lecture 26: Introduction to Elementor Page Builder",
        duration: 120,
        order: 26,
        description: "Lecturer: Ayaan | Topics: Elementor Free vs Pro, Editor interface tour, Global settings (Colors, Fonts), Elements panel.",
        subLectures: [
          { title: "Elementor Interface Overview & Free vs Pro Capabilities", duration: 60, order: 1 },
          { title: "Configuring Global Theme Styles, Colors & Typography Tokens", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 27: Elementor Layouts, Sections, Columns & Flexbox Containers",
        duration: 120,
        order: 27,
        description: "Lecturer: Ayaan | Topics: Flexbox Containers in Elementor, Directions, Alignment, Justification, Gaps, Nested containers.",
        subLectures: [
          { title: "Elementor Flexbox Container Engine & Alignment Rules", duration: 60, order: 1 },
          { title: "Nested Containers, Spacing & Relative/Absolute Positioning", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 28: Essential Elementor Widgets & Styling Properties",
        duration: 120,
        order: 28,
        description: "Lecturer: Ayaan | Topics: Text editor, Heading, Image, Video, Button, Icon Box, Counter, Testimonial & Accordion widgets.",
        subLectures: [
          { title: "Mastering Basic Content & Media Widgets", duration: 60, order: 1 },
          { title: "Advanced Styling: Shadows, Background Overlays & Borders", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 29: Designing Landing Pages with Elementor",
        duration: 120,
        order: 29,
        description: "Lecturer: Ayaan | Topics: High-converting landing page structure, Hero section design, Feature grids, Testimonials & CTA blocks.",
        subLectures: [
          { title: "Landing Page Architecture & High-Converting Hero Sections", duration: 60, order: 1 },
          { title: "Building Feature Grids, Social Proof & Call to Actions", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 30: Elementor Theme Builder & Header/Footer Design",
        duration: 120,
        order: 30,
        description: "Lecturer: Ayaan | Topics: Elementor Theme Builder, Creating global Headers and Footers, Display conditions.",
        subLectures: [
          { title: "Elementor Theme Builder & Global Templates Setup", duration: 60, order: 1 },
          { title: "Building Sticky Headers, Mega Menus & Footer Designs", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 31: Single Post & Page Template Design",
        duration: 120,
        order: 31,
        description: "Lecturer: Ayaan | Topics: Designing Single Post templates, Archive page templates, Dynamic tags & layout loops.",
        subLectures: [
          { title: "Designing Dynamic Single Post & Blog Layouts", duration: 60, order: 1 },
          { title: "Building Custom Archive Pages & Category Templates", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 32: Custom Fields & Dynamic Content with ACF",
        duration: 120,
        order: 32,
        description: "Lecturer: Ayaan | Topics: Advanced Custom Fields (ACF) setup, Custom Post Types (CPT), Connecting ACF fields with Elementor dynamic tags.",
        subLectures: [
          { title: "Creating Custom Post Types & Custom Field Groups", duration: 60, order: 1 },
          { title: "Binding ACF Data Dynamically inside Elementor Layouts", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 33: Forms, Popups & Interactive Lead Capture",
        duration: 120,
        order: 33,
        description: "Lecturer: Ayaan | Topics: Elementor Form widget, Actions after submit, Integration with email marketing, Creating custom Popups.",
        subLectures: [
          { title: "Building Multi-Step Contact Forms & Lead Forms", duration: 60, order: 1 },
          { title: "Designing Custom Popups & Trigger Conditions", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 34: Responsive Web Design in Elementor",
        duration: 120,
        order: 34,
        description: "Lecturer: Ayaan | Topics: Mobile & Tablet editing mode, Custom breakpoints, Hiding/showing elements per device, Responsive typography.",
        subLectures: [
          { title: "Responsive Breakpoints, Fluid Font Sizing & Column Ordering", duration: 60, order: 1 },
          { title: "Device-Specific Visibility Controls & Layout Fixes", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 35: Complete Website Building Project using Elementor",
        duration: 120,
        order: 35,
        description: "Lecturer: Ayaan | Practical Project: End-to-end design & development of a multi-page corporate or agency website using Elementor Pro.",
        subLectures: [
          { title: "Full Site Architecture & Design System Setup", duration: 40, order: 1 },
          { title: "Building Homepage, About, Services & Contact Pages", duration: 40, order: 2 },
          { title: "Final Responsive Polish & Project Submission", duration: 40, order: 3 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 6: WordPress SEO, Optimization & WooCommerce (Weeks 8–9) [Faculty: Ayaan]",
    chapterOrder: 6,
    lectures: [
      {
        title: "Lecture 36: On-Page SEO Principles & Yoast/RankMath Plugin",
        duration: 120,
        order: 36,
        description: "Lecturer: Ayaan | Topics: On-page SEO basics, Meta titles & descriptions, Focus keywords, XML sitemaps, Schema markup with RankMath/Yoast.",
        subLectures: [
          { title: "On-Page SEO Fundamentals & Keyword Placement", duration: 60, order: 1 },
          { title: "Configuring RankMath/Yoast SEO, Sitemaps & Schema", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 37: Website Speed Optimization & Caching Strategies",
        duration: 120,
        order: 37,
        description: "Lecturer: Ayaan | Topics: Google PageSpeed Insights, GTmetrix, Caching plugins (WP Rocket/LiteSpeed), Minification, CDN setup.",
        subLectures: [
          { title: "Analyzing Performance Metrics (LCP, CLS, FID)", duration: 60, order: 1 },
          { title: "Implementing Caching, Minification & CDN Acceleration", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 38: WordPress Security, Backups & Migration Techniques",
        duration: 120,
        order: 38,
        description: "Lecturer: Ayaan | Topics: Hardening WordPress security, SSL certificates, Automated backups (UpdraftPlus), Site migration to live server.",
        subLectures: [
          { title: "WordPress Security Best Practices & Malware Prevention", duration: 60, order: 1 },
          { title: "Full Site Migration from Localhost to Live Domain", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 39: Introduction to E-Commerce & WooCommerce Setup",
        duration: 120,
        order: 39,
        description: "Lecturer: Ayaan | Topics: E-commerce basics, Installing WooCommerce, Store wizard setup, Currency, Store location & Tax settings.",
        subLectures: [
          { title: "Introduction to E-Commerce Models & WooCommerce Setup", duration: 60, order: 1 },
          { title: "Store Location, Currency, Taxes & Base Settings", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 40: Product Catalog, Categories, Tags & Attributes",
        duration: 120,
        order: 40,
        description: "Lecturer: Ayaan | Topics: Simple products creation, Product imagery, Product categories & tags, Custom product attributes (Size, Color).",
        subLectures: [
          { title: "Creating Simple Products, Pricing & Product Images", duration: 60, order: 1 },
          { title: "Managing Categories, Tags & Global Product Attributes", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 41: Variable Products & Digital Downloadable Products",
        duration: 120,
        order: 41,
        description: "Lecturer: Ayaan | Topics: Variable products with multiple variations, SKU management, Virtual & Downloadable digital products setup.",
        subLectures: [
          { title: "Configuring Variable Products with Custom Variations", duration: 60, order: 1 },
          { title: "Setting up Virtual & Downloadable Digital Products", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 42: WooCommerce Checkout, Payments & Shipping Gateways",
        duration: 120,
        order: 42,
        description: "Lecturer: Ayaan | Topics: Payment gateways integration (Razorpay, Stripe, PayPal, COD), Shipping zones, Flat rates & Free shipping rules.",
        subLectures: [
          { title: "Integrating Online Payment Gateways & Cash on Delivery", duration: 60, order: 1 },
          { title: "Configuring Shipping Zones, Rates & Free Shipping Rules", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 43: Store Customization & WooCommerce Elementor Builder",
        duration: 120,
        order: 43,
        description: "Lecturer: Ayaan | Topics: Customizing Single Product Page, Shop Archive Page, Cart & Checkout Pages using Elementor Pro.",
        subLectures: [
          { title: "Customizing Single Product & Shop Archive Layouts", duration: 60, order: 1 },
          { title: "Customizing Cart, Checkout & My Account Pages", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 44: Coupon Systems, Order Management & Customer Notifications",
        duration: 120,
        order: 44,
        description: "Lecturer: Ayaan | Topics: Discount coupons & promotional rules, Managing customer orders, Order status updates, Email notifications setup.",
        subLectures: [
          { title: "Creating Discount Coupons & Promotional Rules", duration: 60, order: 1 },
          { title: "Order Lifecycle Management & Email Notification Setup", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 45: Complete WooCommerce Store Launch Project",
        duration: 120,
        order: 45,
        description: "Lecturer: Ayaan | Practical Project: Building and launching a fully functional e-commerce store with products, payment gateways & custom design.",
        subLectures: [
          { title: "E-Commerce Project Architecture & Product Setup", duration: 40, order: 1 },
          { title: "Payment, Shipping & Store Customization Build", duration: 40, order: 2 },
          { title: "End-to-End Store Testing & Order Flow Audit", duration: 40, order: 3 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 7: Wix Studio (Weeks 10–11) [Faculty: Ayaan]",
    chapterOrder: 7,
    lectures: [
      {
        title: "Lecture 46: Introduction to Wix Studio Platform & Workspace",
        duration: 120,
        order: 46,
        description: "Lecturer: Ayaan | Topics: Overview of Wix Studio ecosystem, Interface tour, Canvas controls, Inspector panel, Workspace hierarchy.",
        subLectures: [
          { title: "Wix Studio Ecosystem & Professional Workspace Tour", duration: 60, order: 1 },
          { title: "Canvas Controls, Inspector Panel & Layers Setup", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 47: Advanced CSS Grid & Flex Layouts in Wix Studio",
        duration: 120,
        order: 47,
        description: "Lecturer: Ayaan | Topics: CSS Grid in Wix Studio, Custom rows/columns, Docking, Stacking, Cell alignment, Cell spanning.",
        subLectures: [
          { title: "Custom CSS Grid Architecture & Docking Controls", duration: 60, order: 1 },
          { title: "Stacking, Cell Spanning & Precision Alignment", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 48: Responsive Breakpoints & Fluid Typography",
        duration: 120,
        order: 48,
        description: "Lecturer: Ayaan | Topics: Managing custom breakpoints, Fluid typography (px vs vw vs %), Responsive sizing behavior (Scale proportionally, Fit to screen).",
        subLectures: [
          { title: "Managing Custom Breakpoints & Screen Widths", duration: 60, order: 1 },
          { title: "Fluid Typography, Proportional Scaling & Fluid Sizing", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 49: Custom Animations, Scroll Effects & Micro-Interactions in Wix Studio",
        duration: 120,
        order: 49,
        description: "Lecturer: Ayaan | Topics: Entry animations, Scroll-driven animations, Parallax effects, Hover triggers, Click interactions.",
        subLectures: [
          { title: "Scroll-Driven Animations & Parallax Backgrounds", duration: 60, order: 1 },
          { title: "Hover Micro-Interactions & Custom Cursor Effects", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 50: Wix Studio Component Library & Global Design Tokens",
        duration: 120,
        order: 50,
        description: "Lecturer: Ayaan | Topics: Custom components creation, Reusable assets, Global styles, Typography tokens, Color palettes.",
        subLectures: [
          { title: "Creating Reusable Components & Design Tokens", duration: 60, order: 1 },
          { title: "Managing Global Typography & Brand Color Palettes", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 51: Content Management System (CMS) & Dynamic Datasets in Wix Studio",
        duration: 120,
        order: 51,
        description: "Lecturer: Ayaan | Topics: Wix Studio CMS collections, Datasets, Repeater layouts, Dynamic pages creation.",
        subLectures: [
          { title: "Creating CMS Collections & Setting up Datasets", duration: 60, order: 1 },
          { title: "Binding Datasets to Repeaters & Dynamic Pages", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 52: Custom Code Integration with Velo by Wix",
        duration: 120,
        order: 52,
        description: "Lecturer: Ayaan | Topics: Introduction to Velo JavaScript framework, Event handlers, Page API, Custom interactions using code.",
        subLectures: [
          { title: "Introduction to Velo JavaScript Development Environment", duration: 60, order: 1 },
          { title: "Writing Event Handlers & Dynamic UI Code Features", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 53: Wix Studio E-Commerce & Business Solutions",
        duration: 120,
        order: 53,
        description: "Lecturer: Ayaan | Topics: Setting up Wix Stores, Bookings, Events, Paid Plans & Custom Checkout in Wix Studio.",
        subLectures: [
          { title: "Wix Stores Setup & Product Layout Customization", duration: 60, order: 1 },
          { title: "Integrating Bookings, Events & Membership Subscriptions", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 54: Client Handoff, Workspaces & Collaboration in Wix Studio",
        duration: 120,
        order: 54,
        description: "Lecturer: Ayaan | Topics: Managing client roles, Team collaboration, Reusable templates, Site transfer & Handoff documentation.",
        subLectures: [
          { title: "Team Workspaces, Roles & Live Collaboration Tools", duration: 60, order: 1 },
          { title: "Client Site Transfer, Permissions & Handoff Process", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 55: Full Wix Studio Responsive Website Project",
        duration: 120,
        order: 55,
        description: "Lecturer: Ayaan | Practical Project: End-to-end building of a modern, highly responsive portfolio or agency website using Wix Studio.",
        subLectures: [
          { title: "Wix Studio Project Architecture & Grid Setup", duration: 40, order: 1 },
          { title: "Building Dynamic Layouts, Animations & CMS Features", duration: 40, order: 2 },
          { title: "Responsive Polish Across All Breakpoints & Final Review", duration: 40, order: 3 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 8: Shopify (Weeks 12–13) [Faculty: Ayaan]",
    chapterOrder: 8,
    lectures: [
      {
        title: "Lecture 56: Introduction to Shopify E-Commerce Platform & Dashboard",
        duration: 120,
        order: 56,
        description: "Lecturer: Ayaan | Topics: Shopify platform architecture, Account creation, Partner dashboard overview, Store admin navigation.",
        subLectures: [
          { title: "Shopify Ecosystem & Partner Account Setup", duration: 60, order: 1 },
          { title: "Shopify Admin Dashboard Tour & Navigation", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 57: Store Setup, Domain Configuration & Payment Settings",
        duration: 120,
        order: 57,
        description: "Lecturer: Ayaan | Topics: Store preferences, Currency setup, Custom domain linking, Payment providers configuration.",
        subLectures: [
          { title: "General Preferences, Store Policies & Custom Domain", duration: 60, order: 1 },
          { title: "Configuring Shopify Payments & Third-Party Gateways", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 58: Theme Selection & Customization using Shopify Theme Editor",
        duration: 120,
        order: 58,
        description: "Lecturer: Ayaan | Topics: Free vs Premium themes, Dawn theme architecture, Theme Editor 2.0, Sections, Blocks, Global settings.",
        subLectures: [
          { title: "Shopify 2.0 Theme Architecture & Sections/Blocks Engine", duration: 60, order: 1 },
          { title: "Customizing Homepage Sections, Colors & Typography", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 59: Managing Products, Collections & Inventory Systems",
        duration: 120,
        order: 59,
        description: "Lecturer: Ayaan | Topics: Adding physical products, Variants, Automated collections, Manual collections, Inventory tracking.",
        subLectures: [
          { title: "Adding Products, High-Res Media & Variants", duration: 60, order: 1 },
          { title: "Creating Manual & Automated Product Collections", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 60: Customer Accounts, Checkout Customization & Discounts",
        duration: 120,
        order: 60,
        description: "Lecturer: Ayaan | Topics: Managing customer profiles, Checkout settings, Creating automatic discounts & gift cards.",
        subLectures: [
          { title: "Customer Account Preferences & Checkout Flow Setup", duration: 60, order: 1 },
          { title: "Creating Discount Codes, Automatic Discounts & Gift Cards", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 61: Essential Shopify Apps & Integration Marketplace",
        duration: 120,
        order: 61,
        description: "Lecturer: Ayaan | Topics: Shopify App Store, Installing review apps, Upsell apps, Live chat & Marketing integration.",
        subLectures: [
          { title: "Navigating Shopify App Store & Essential Utilities", duration: 60, order: 1 },
          { title: "Integrating Customer Reviews, Upsells & Live Chat", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 62: Basic Liquid Templating & Theme Code Modifications",
        duration: 120,
        order: 62,
        description: "Lecturer: Ayaan | Topics: Introduction to Liquid template language, Editing theme code, Custom CSS overrides, Adding custom sections.",
        subLectures: [
          { title: "Understanding Liquid Objects, Tags & Filters", duration: 60, order: 1 },
          { title: "Custom CSS Overrides & Adding Custom Schema Sections", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 63: Shopify Store SEO, Marketing Tools & Analytics",
        duration: 120,
        order: 63,
        description: "Lecturer: Ayaan | Topics: Product SEO (Meta tags, URL handles), Facebook Pixel/Google Analytics setup, Sales reports overview.",
        subLectures: [
          { title: "Product & Collection Page SEO Optimization", duration: 60, order: 1 },
          { title: "Connecting Analytics, Pixel & Sales Reports", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 64: Payment Gateways, Order Fulfillment & Shipping Configuration",
        duration: 60, order: 64,
        description: "Lecturer: Ayaan | Topics: Shipping profiles, Rates, Order processing workflow, Fulfilling orders, Print shipping labels.",
        subLectures: [
          { title: "Setting up Custom Shipping Zones & Calculated Rates", duration: 60, order: 1 },
          { title: "Order Lifecycle: Processing, Fulfilling & Tracking Orders", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 65: Complete High-Converting Shopify Store Build Project",
        duration: 120,
        order: 65,
        description: "Lecturer: Ayaan | Practical Project: End-to-end building and publishing of a fully functional e-commerce store on Shopify.",
        subLectures: [
          { title: "Shopify Store Setup & Branding Configuration", duration: 40, order: 1 },
          { title: "Catalog Upload, Theme Design & App Integrations", duration: 40, order: 2 },
          { title: "Checkout Audit, Mobile Responsiveness & Final Review", duration: 40, order: 3 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 9: CorelDRAW for Web Designers (Week 14) [Faculty: Qutbuddin]",
    chapterOrder: 9,
    lectures: [
      {
        title: "Lecture 66: CorelDRAW Interface and Basic Tools",
        duration: 120,
        order: 66,
        description: "Lecturer: Qutbuddin | Topics: Introduction to CorelDRAW, Understanding the interface, Property bar, Toolbox, Pages, Layers, Selection tools, Shape tools, Basic object manipulation.",
        subLectures: [
          { title: "CorelDRAW Workspace, Toolbox & Property Bar Setup", duration: 40, order: 1 },
          { title: "Selection, Transformation & Shape Tools", duration: 40, order: 2 },
          { title: "Practical: Creating and Organizing Basic Vector Objects", duration: 40, order: 3 }
        ]
      },
      {
        title: "Lecture 67: Shapes, Icons and UI Elements",
        duration: 120,
        order: 67,
        description: "Lecturer: Qutbuddin | Topics: Working with shapes, Pen and curve tools, Basic vector drawing, Combining objects, Creating icons, Creating buttons, Creating basic UI elements.",
        subLectures: [
          { title: "Vector Drawing with Pen, Curve & Boolean Tools", duration: 40, order: 1 },
          { title: "Combining Shapes to Design Vector Icons & UI Elements", duration: 40, order: 2 },
          { title: "Practical: Creating a Complete Vector Icon Asset Set", duration: 40, order: 3 }
        ]
      },
      {
        title: "Lecture 68: Logo Design Basics",
        duration: 120,
        order: 68,
        description: "Lecturer: Qutbuddin | Topics: Introduction to logo design, Logo types, Shape construction, Typography in logos, Color selection, Basic brand consistency.",
        subLectures: [
          { title: "Logo Types, Shape Construction & Grid Alignment", duration: 40, order: 1 },
          { title: "Typography Integration & Brand Color Harmony", duration: 40, order: 2 },
          { title: "Practical: Designing a Simple Brand Logo in CorelDRAW", duration: 40, order: 3 }
        ]
      },
      {
        title: "Lecture 69: Posters and Banners",
        duration: 120,
        order: 69,
        description: "Lecturer: Qutbuddin | Topics: Poster structure, Banner structure, Typography hierarchy, Image placement, Alignment, Color balance, Export preparation.",
        subLectures: [
          { title: "Poster & Banner Composition Rules & Grid Systems", duration: 40, order: 1 },
          { title: "Visual Hierarchy, Image Masking & Color Balance", duration: 40, order: 2 },
          { title: "Practical: Designing a Promotional Digital Web Banner", duration: 40, order: 3 }
        ]
      },
      {
        title: "Lecture 70: Exporting Assets for Web",
        duration: 120,
        order: 70,
        description: "Lecturer: Qutbuddin | Topics: Export formats (JPG, PNG, SVG, PDF), Transparent backgrounds, Image dimensions, Web optimization, Exporting icons, Exporting logos, Exporting website assets.",
        subLectures: [
          { title: "Export Formats (SVG, PNG, JPG, PDF) & Transparent Backgrounds", duration: 40, order: 1 },
          { title: "Image Resolution, Web Optimization & Dimension Scaling", duration: 40, order: 2 },
          { title: "Practical Assignment: Exporting Complete Set of Web Assets", duration: 40, order: 3 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 10: Responsive Design and Accessibility (Week 15) [Faculty: Ayaan]",
    chapterOrder: 10,
    lectures: [
      {
        title: "Lecture 71: Mobile and Tablet Breakpoints Strategy",
        duration: 120,
        order: 71,
        description: "Lecturer: Ayaan | Topics: Standard device resolutions, Defining media query breakpoints, Mobile-first vs Desktop-first design strategies.",
        subLectures: [
          { title: "Defining Standard Breakpoints across Mobile, Tablet & Desktop", duration: 60, order: 1 },
          { title: "Mobile-First vs Desktop-First UX & Technical Considerations", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 72: Responsive Layout Systems & Adaptive Interfaces",
        duration: 120,
        order: 72,
        description: "Lecturer: Ayaan | Topics: Fluid grids, Elastic containers, Adaptive images & picture tags, Responsive UI patterns.",
        subLectures: [
          { title: "Fluid Container Mechanics & Percentage-Based Grids", duration: 60, order: 1 },
          { title: "Adaptive Image Rendering & Media Performance Optimization", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 73: Flexbox and Grid Principles for Web Layouts",
        duration: 120,
        order: 73,
        description: "Lecturer: Ayaan | Topics: CSS Flexbox concepts, CSS Grid concepts, Axis alignment, Gap control, Layout reflow across viewports.",
        subLectures: [
          { title: "Flexbox Layout Mechanics & One-Dimensional Reflow", duration: 60, order: 1 },
          { title: "CSS Grid Architecture & Two-Dimensional Page Structuring", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 74: Cross-Browser & Multi-Device Testing Methodologies",
        duration: 120,
        order: 74,
        description: "Lecturer: Ayaan | Topics: Browser compatibility issues, BrowserStack/DevTools emulation, Touch vs Click interaction handling.",
        subLectures: [
          { title: "Browser Emulation Tools & Cross-Browser Testing Workflows", duration: 60, order: 1 },
          { title: "Debugging Layout Quirks, Touch Target Sizes & Input Behaviors", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 75: Web Accessibility (WCAG), Color Contrast & Performance Testing",
        duration: 120,
        order: 75,
        description: "Lecturer: Ayaan | Topics: WCAG 2.1 Guidelines, Color contrast ratios, ARIA attributes, Keyboard navigation, Lighthouse audit scores.",
        subLectures: [
          { title: "WCAG Accessibility Principles & Contrast Compliance Audit", duration: 60, order: 1 },
          { title: "Keyboard Navigation, ARIA Tags & Google Lighthouse Audit", duration: 60, order: 2 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 11: Portfolio Development (Week 16) [Faculty: Ayaan]",
    chapterOrder: 11,
    lectures: [
      {
        title: "Lecture 76: Personal Brand Identity & Portfolio Strategy",
        duration: 120,
        order: 76,
        description: "Lecturer: Ayaan | Topics: Defining personal designer brand, Value proposition, Portfolio goals, Target employer vs client focus.",
        subLectures: [
          { title: "Defining Personal Designer Brand Identity & Positioning", duration: 60, order: 1 },
          { title: "Structuring Portfolio Strategy for Jobs vs Freelancing", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 77: Selecting & Curating Top Design Work",
        duration: 120,
        order: 77,
        description: "Lecturer: Ayaan | Topics: Selecting best 3-5 projects, Project storytelling, Before/After transformations, Visual presentation assets.",
        subLectures: [
          { title: "Project Selection Criteria & Quality over Quantity", duration: 60, order: 1 },
          { title: "Visual Presentation Mockups & Asset Preparation", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 78: Designing & Structuring Portfolio Site Layout",
        duration: 120,
        order: 78,
        description: "Lecturer: Ayaan | Topics: Homepage layout for portfolios, Work grid, About page, Contact section, Resume download integration.",
        subLectures: [
          { title: "Anatomy of High-Converting Designer Portfolio Layout", duration: 60, order: 1 },
          { title: "Wireframing Work Grid, About Page & Contact Channels", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 79: Building Interactive Web Portfolio",
        duration: 120,
        order: 79,
        description: "Lecturer: Ayaan | Topics: Hands-on portfolio build using WordPress/Wix Studio/Figma Web, Micro-interactions, Smooth scrolling.",
        subLectures: [
          { title: "Building Portfolio Structure & Project Gallery", duration: 60, order: 1 },
          { title: "Adding Micro-Interactions, Smooth Scroll & Mobile Responsive Polish", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 80: Hosting, Domain Setup & Publishing Portfolio Site",
        duration: 120,
        order: 80,
        description: "Lecturer: Ayaan | Topics: Connecting custom domain, Hosting setup, Live publishing, Social media links (LinkedIn/Behance/Dribbble).",
        subLectures: [
          { title: "Connecting Custom Domain Name & SSL Security", duration: 60, order: 1 },
          { title: "Live Site Publishing & Integrating Behance/Dribbble/LinkedIn Profiles", duration: 60, order: 2 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 12: Case Study Development (Week 17) [Faculty: Ayaan]",
    chapterOrder: 12,
    lectures: [
      {
        title: "Lecture 81: Anatomy of a Professional UI/UX Case Study",
        duration: 120,
        order: 81,
        description: "Lecturer: Ayaan | Topics: Structure of a winning UI/UX case study, Title & Hook, Problem statement, Role & Timeline, Tools used.",
        subLectures: [
          { title: "Anatomy of Top 1% UI/UX Case Studies", duration: 60, order: 1 },
          { title: "Drafting Problem Statement, Project Scope & Personal Role", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 82: Documenting User Research, Persona & Problem Statement",
        duration: 120,
        order: 82,
        description: "Lecturer: Ayaan | Topics: Writing research insights, Displaying user personas, Competitive analysis diagrams, Empathy maps.",
        subLectures: [
          { title: "Formatting Research Findings & Survey Data for Case Studies", duration: 60, order: 1 },
          { title: "Designing Visual User Personas & Competitor Benchmark Matrix", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 83: Showcasing Design Iterations, Wireframes & Solutions",
        duration: 120,
        order: 83,
        description: "Lecturer: Ayaan | Topics: Presenting sketch iterations, Low-fi to High-fi evolution, Explaining UX decisions, UI component showcases.",
        subLectures: [
          { title: "Documenting Evolution from Rough Sketches to High-Fi UI", duration: 60, order: 1 },
          { title: "Articulating Design Rationale & UI Component Systems", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 84: Creating High-Impact Visuals, Mockups & Prototypes for Presentation",
        duration: 120,
        order: 84,
        description: "Lecturer: Ayaan | Topics: 3D device mockups, Animated GIFs/Videos of prototype interactions, Behance/Medium case study formatting.",
        subLectures: [
          { title: "Generating 3D Device Mockups & Interactive Screen Preview Videos", duration: 60, order: 1 },
          { title: "Formatting Case Studies for Behance, Medium & Personal Site", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 85: Finalizing & Publishing Complete Case Study",
        duration: 120,
        order: 85,
        description: "Lecturer: Ayaan | Topics: Final proofreading, Usability metrics, Key takeaways, Publishing case study live & sharing on LinkedIn.",
        subLectures: [
          { title: "Refining Case Study Copy, Outcome Metrics & Retrospective Lessons", duration: 60, order: 1 },
          { title: "Final Publication & Social Media Distribution Strategy", duration: 60, order: 2 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 13: Final Projects, Review and Presentation (Week 18) [Faculty: Ayaan]",
    chapterOrder: 13,
    lectures: [
      {
        title: "Lecture 86: Final Project Scoping & Client Requirement Brief",
        duration: 120,
        order: 86,
        description: "Lecturer: Ayaan | Topics: Assignment of real-world client brief, Defining deliverables, Project milestone roadmap, Team/Individual setup.",
        subLectures: [
          { title: "Deconstructing Client Brief & Defining Deliverable Scopes", duration: 60, order: 1 },
          { title: "Setting Milestones, Design Sprint Schedule & Workflows", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 87: End-to-End Client Style UI/UX & Web Project Execution - Phase 1",
        duration: 120,
        order: 87,
        description: "Lecturer: Ayaan | Topics: User research execution, Wireframing, System architecture & Initial Figma UI designs review.",
        subLectures: [
          { title: "Phase 1 Execution: Research, Flows & Low-Fi Wireframing", duration: 60, order: 1 },
          { title: "Design Review & Mid-Sprint Feedback Session", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 88: End-to-End Client Style UI/UX & Web Project Execution - Phase 2",
        duration: 120,
        order: 88,
        description: "Lecturer: Ayaan | Topics: Web development phase (WordPress/Wix Studio/Shopify), Interactive prototyping, Responsiveness build.",
        subLectures: [
          { title: "Phase 2 Execution: Web Development & Interactive Prototype Build", duration: 60, order: 1 },
          { title: "Mobile & Tablet Responsiveness Audit & Interactions Testing", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 89: Final Design Corrections, Refinements & Portfolio Review",
        duration: 120,
        order: 89,
        description: "Lecturer: Ayaan | Topics: QA bug fixing, Visual refinement, Usability check, Portfolio alignment check.",
        subLectures: [
          { title: "Quality Assurance, Bug Fixing & Visual Refinement", duration: 60, order: 1 },
          { title: "Portfolio Integration Check & Pre-Presentation Readiness", duration: 60, order: 2 }
        ]
      },
      {
        title: "Lecture 90: Project Presentation, Review & Graduation Evaluation",
        duration: 120,
        order: 90,
        description: "Lecturer: Ayaan | Topics: Student project presentations, Live demo, Jury feedback, Course completion evaluation & certification.",
        subLectures: [
          { title: "Student Live Project Presentations & Prototype Demos", duration: 60, order: 1 },
          { title: "Jury Evaluation, Feedback Session & Course Graduation", duration: 60, order: 2 }
        ]
      }
    ]
  }
];

async function seed() {
  try {
    console.log("Connecting to MONGODB...");
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("Connected to database successfully.");

    // 1. Get default admin to assign as creator
    const admin = await Admin.findOne({});
    if (!admin) {
      throw new Error("No Admin user found in the database. Please create an Admin first.");
    }
    console.log(`Using Admin "${admin.name}" (ID: ${admin._id}) as creator.`);

    const subjectName = "UI/UX & Web Design";
    const subjectCode = "UIUX-WEB-DESIGN";

    // 2. Find or create Syllabus document for "UI/UX & Web Design"
    let syllabus = await Syllabus.findOne({ subject: subjectName });
    if (!syllabus) {
      // Also check if stored as "UI/UX and Web Design"
      syllabus = await Syllabus.findOne({ subject: "UI/UX and Web Design" });
    }

    if (syllabus) {
      console.log(`Existing UI/UX & Web Design Syllabus found (ID: ${syllabus._id}). Cleaning old chapters/lectures...`);
      
      // Clear associated chapters & lectures
      const deletedChapters = await Chapter.deleteMany({ subjectId: syllabus._id });
      console.log(`Deleted ${deletedChapters.deletedCount} old chapters.`);
      
      const deletedLectures = await Lecture.deleteMany({ syllabus: syllabus._id });
      console.log(`Deleted ${deletedLectures.deletedCount} old template lectures.`);

      // Also clean up any BatchLectures for this syllabus
      const deletedBatchLectures = await BatchLecture.deleteMany({ syllabus: syllabus._id });
      console.log(`Deleted ${deletedBatchLectures.deletedCount} old batch-specific lectures.`);

      // Reset the syllabus arrays
      syllabus.lectures = [];
      syllabus.topics = [];
      syllabus.subject = subjectName;
      syllabus.name = subjectName;
      syllabus.description = "UI/UX & Web Design - 90 Lectures / 180 Teaching Hours Complete Syllabus";
      syllabus.code = subjectCode;
      syllabus.createdBy = admin._id;
      await syllabus.save();
    } else {
      console.log("Creating a new UI/UX & Web Design Syllabus...");
      syllabus = await Syllabus.create({
        subject: subjectName,
        name: subjectName,
        code: subjectCode,
        description: "UI/UX & Web Design - 90 Lectures / 180 Teaching Hours Complete Syllabus",
        createdBy: admin._id,
        lectures: [],
        topics: []
      });
      console.log(`Created new UI/UX & Web Design Syllabus (ID: ${syllabus._id}).`);
    }

    const createdLectureIds = [];

    // 3. Loop through and create Chapters & Lectures
    for (const chapterData of syllabusData) {
      console.log(`Creating Chapter: "${chapterData.chapterTitle}"...`);
      const chapter = await Chapter.create({
        subjectId: syllabus._id,
        title: chapterData.chapterTitle,
        order: chapterData.chapterOrder
      });

      console.log(`Creating lectures for chapter: "${chapter.title}"...`);
      for (const lectureData of chapterData.lectures) {
        const lecture = await Lecture.create({
          syllabus: syllabus._id,
          title: lectureData.title,
          description: lectureData.description || "",
          chapterId: chapter._id.toString(),
          duration: lectureData.duration || 120,
          lectureType: "Normal",
          order: lectureData.order,
          completionStatus: "Pending",
          subLectures: (lectureData.subLectures || []).map((sl) => ({
            title: sl.title,
            duration: sl.duration || 0,
            order: sl.order,
            completionStatus: "Pending"
          }))
        });

        createdLectureIds.push(lecture._id);
        console.log(` - Created Lecture: "${lecture.title}" (ID: ${lecture._id})`);
      }
    }

    // 4. Update the Syllabus document to include all created lectures/topics
    syllabus.lectures = createdLectureIds;
    syllabus.topics = createdLectureIds; // sync topics
    await syllabus.save();
    console.log(`Updated Syllabus document with all ${createdLectureIds.length} lectures.`);

    // 5. Propagate to active batches if any BatchSyllabus exists
    const activeBatchSyllabi = await BatchSyllabus.find({ syllabus: syllabus._id });
    console.log(`Found ${activeBatchSyllabi.length} active batch assignments for this syllabus.`);
    
    if (activeBatchSyllabi.length > 0) {
      console.log("Propagating new lectures to active batches...");
      const templateLectures = await Lecture.find({ syllabus: syllabus._id });
      
      let propagatedCount = 0;
      for (const bs of activeBatchSyllabi) {
        const batchLectureDocs = templateLectures.map((lecture) => ({
          batch: bs.batch,
          syllabus: syllabus._id,
          templateLecture: lecture._id,
          title: lecture.title,
          description: lecture.description,
          chapterId: lecture.chapterId,
          duration: lecture.duration,
          lectureType: lecture.lectureType,
          order: lecture.order,
          completionStatus: "Pending",
          subLectures: lecture.subLectures.map(sl => ({
            title: sl.title,
            duration: sl.duration,
            order: sl.order,
            completionStatus: "Pending"
          }))
        }));
        const inserted = await BatchLecture.insertMany(batchLectureDocs);
        propagatedCount += inserted.length;
      }
      console.log(`Propagated ${propagatedCount} lectures across ${activeBatchSyllabi.length} batches.`);
    }

    console.log("Database seeding for UI/UX & Web Design completed successfully!");
  } catch (error) {
    console.error("Seeding failed with error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MONGODB.");
  }
}

seed();
