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
    chapterTitle: "Module 1: Web Fundamentals (L1–L3)",
    chapterOrder: 1,
    lectures: [
      {
        title: "L1: How Web Actually Works (Very Important)",
        duration: 60,
        order: 1,
        description: "Concepts: Internet vs Web, Client-Server architecture, Request-Response lifecycle, HTTP basics, Browser rendering pipeline. Hands-on: Observe requests. Outcome: Web load mechanics.",
        subLectures: [
          { title: "Concept: Internet vs Web", duration: 10, order: 0 },
          { title: "Concept: Client-Server architecture", duration: 10, order: 1 },
          { title: "Concept: Request-Response lifecycle", duration: 10, order: 2 },
          { title: "Concept: HTTP basics (GET/POST overview)", duration: 10, order: 3 },
          { title: "Concept: Browser rendering pipeline (HTML -> DOM -> Render)", duration: 10, order: 4 },
          { title: "Hands-on: Open DevTools -> Network tab -> observe requests", duration: 5, order: 5 },
          { title: "Outcome: Student understands how a website loads internally", duration: 5, order: 6 }
        ]
      },
      {
        title: "L2: Role of HTML + DevTools",
        duration: 60,
        order: 2,
        description: "Concepts: HTML vs CSS vs JS, DOM, Webpage structure. Hands-on: Inspect tool. Outcome: Website structure analysis.",
        subLectures: [
          { title: "Concept: HTML vs CSS vs JavaScript", duration: 15, order: 0 },
          { title: "Concept: What is DOM?", duration: 15, order: 1 },
          { title: "Concept: Structure of a webpage", duration: 15, order: 2 },
          { title: "Hands-on: Inspect tool (live DOM editing)", duration: 10, order: 3 },
          { title: "Outcome: Student can analyze any website structure", duration: 5, order: 4 }
        ]
      },
      {
        title: "L3: First HTML Page (Practical)",
        duration: 60,
        order: 3,
        description: "Concepts: Basic syntax, tags, attributes, Boilerplate. Hands-on: Create first webpage. Outcome: Valid HTML page.",
        subLectures: [
          { title: "Concept: Basic syntax", duration: 10, order: 0 },
          { title: "Concept: Elements, tags, attributes", duration: 15, order: 1 },
          { title: "Concept: Boilerplate structure", duration: 15, order: 2 },
          { title: "Hands-on: Create first webpage from scratch", duration: 15, order: 3 },
          { title: "Outcome: Student creates valid structured HTML page", duration: 5, order: 4 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 2: Core HTML (L4–L10)",
    chapterOrder: 2,
    lectures: [
      {
        title: "L4: Text & Content Structure",
        duration: 60,
        order: 4,
        description: "Concepts: Headings, paragraphs, strong/bold, emphasis tags. Outcome: Structured readable content.",
        subLectures: [
          { title: "Concept: Headings (h1-h6)", duration: 15, order: 0 },
          { title: "Concept: Paragraphs", duration: 15, order: 1 },
          { title: "Concept: Strong vs bold", duration: 15, order: 2 },
          { title: "Concept: Emphasis tags", duration: 10, order: 3 },
          { title: "Outcome: Structured readable content", duration: 5, order: 4 }
        ]
      },
      {
        title: "L5: Lists & Content Grouping",
        duration: 60,
        order: 5,
        description: "Concepts: Ordered/unordered lists, nesting, logical grouping.",
        subLectures: [
          { title: "Concept: Ordered & unordered lists", duration: 20, order: 0 },
          { title: "Concept: Nesting", duration: 20, order: 1 },
          { title: "Concept: Grouping content logically", duration: 20, order: 2 }
        ]
      },
      {
        title: "L6: Links & Navigation",
        duration: 60,
        order: 6,
        description: "Concepts: Anchor tags, links, navigation structure. Hands-on: Multi-page linking.",
        subLectures: [
          { title: "Concept: Anchor tag", duration: 20, order: 0 },
          { title: "Concept: Internal vs external links", duration: 15, order: 1 },
          { title: "Concept: Navigation structure", duration: 15, order: 2 },
          { title: "Hands-on: Multi-page linking", duration: 10, order: 3 }
        ]
      },
      {
        title: "L7: Images & Media",
        duration: 60,
        order: 7,
        description: "Concepts: Image tags, Alt text, video/audio embeds.",
        subLectures: [
          { title: "Concept: Image tag", duration: 20, order: 0 },
          { title: "Concept: Alt text (accessibility)", duration: 20, order: 1 },
          { title: "Concept: Video/audio embeds", duration: 20, order: 2 }
        ]
      },
      {
        title: "L8: Tables (Practical Use)",
        duration: 60,
        order: 8,
        description: "Concepts: Table structure, data display.",
        subLectures: [
          { title: "Concept: Table structure", duration: 30, order: 0 },
          { title: "Concept: Real-world usage (data display)", duration: 30, order: 1 }
        ]
      },
      {
        title: "L9: Inline vs Block Elements",
        duration: 60,
        order: 9,
        description: "Concepts: Layout behaviors, display properties.",
        subLectures: [
          { title: "Concept: Layout behaviors", duration: 30, order: 0 },
          { title: "Concept: Display understanding (prep for CSS)", duration: 30, order: 1 }
        ]
      },
      {
        title: "L10: HTML Structure Best Practices",
        duration: 60,
        order: 10,
        description: "Concepts: Clean structure, indentation, reusability mindset.",
        subLectures: [
          { title: "Concept: Clean code structure", duration: 20, order: 0 },
          { title: "Concept: Indentation", duration: 20, order: 1 },
          { title: "Concept: Reusability mindset", duration: 20, order: 2 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 3: Forms & Inputs (L11–L14)",
    chapterOrder: 3,
    lectures: [
      {
        title: "L11: Forms Basics",
        duration: 60,
        order: 11,
        description: "Concepts: form tags, input types, labels.",
        subLectures: [
          { title: "Concept: form tag", duration: 20, order: 0 },
          { title: "Concept: input types", duration: 20, order: 1 },
          { title: "Concept: labels", duration: 20, order: 2 }
        ]
      },
      {
        title: "L12: Advanced Inputs",
        duration: 60,
        order: 12,
        description: "Concepts: validation attributes (required, pattern, email, number).",
        subLectures: [
          { title: "Concept: validation attributes", duration: 20, order: 0 },
          { title: "Concept: required, pattern", duration: 20, order: 1 },
          { title: "Concept: email, number", duration: 20, order: 2 }
        ]
      },
      {
        title: "L13: Form UX & Real Usage",
        duration: 60,
        order: 13,
        description: "Concepts: usability, error handling basics.",
        subLectures: [
          { title: "Concept: usability", duration: 30, order: 0 },
          { title: "Concept: error handling basics", duration: 30, order: 1 }
        ]
      },
      {
        title: "L14: Mini Project",
        duration: 60,
        order: 14,
        description: "Build: Contact Form Page. Outcome: Real-world form creation.",
        subLectures: [
          { title: "Build: Contact Form Page", duration: 45, order: 0 },
          { title: "Outcome: Real-world form creation", duration: 15, order: 1 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 4: Semantic + SEO (L15–L18)",
    chapterOrder: 4,
    lectures: [
      {
        title: "L15: Semantic HTML (VERY IMPORTANT)",
        duration: 60,
        order: 15,
        description: "Concepts: structural tags (header, section, article, footer), importance of semantic structure.",
        subLectures: [
          { title: "Concept: header, section, article, footer", duration: 30, order: 0 },
          { title: "Concept: why semantics matter", duration: 30, order: 1 }
        ]
      },
      {
        title: "L16: SEO Basics",
        duration: 60,
        order: 16,
        description: "Concepts: meta tags, title, description, keywords introduction.",
        subLectures: [
          { title: "Concept: meta tags", duration: 20, order: 0 },
          { title: "Concept: title, description", duration: 20, order: 1 },
          { title: "Concept: keywords (intro level)", duration: 20, order: 2 }
        ]
      },
      {
        title: "L17: Accessibility (ARIA Intro)",
        duration: 60,
        order: 17,
        description: "Concepts: screen readers, alt text, basic ARIA roles.",
        subLectures: [
          { title: "Concept: screen readers", duration: 20, order: 0 },
          { title: "Concept: alt text", duration: 20, order: 1 },
          { title: "Concept: basic ARIA roles", duration: 20, order: 2 }
        ]
      },
      {
        title: "L18: Performance Basics",
        duration: 60,
        order: 18,
        description: "Concepts: image optimization, loading strategies.",
        subLectures: [
          { title: "Concept: image optimization", duration: 30, order: 0 },
          { title: "Concept: loading strategies", duration: 30, order: 1 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 5: Advanced + Integration (L19–L22)",
    chapterOrder: 5,
    lectures: [
      {
        title: "L19: Iframes & External Content",
        duration: 60,
        order: 19,
        description: "Concepts: embedding maps, videos.",
        subLectures: [
          { title: "Concept: embedding maps, videos", duration: 60, order: 0 }
        ]
      },
      {
        title: "L20: HTML + API Integration (Intro)",
        duration: 60,
        order: 20,
        description: "Concepts: API introduction, JSON basics. Hands-on: Fetch data and display in HTML.",
        subLectures: [
          { title: "Concept: What is API", duration: 20, order: 0 },
          { title: "Concept: JSON basics", duration: 20, order: 1 },
          { title: "Hands-on: Fetch data (demo) -> show in HTML", duration: 20, order: 2 }
        ]
      },
      {
        title: "L21: Debugging HTML",
        duration: 60,
        order: 21,
        description: "Concepts: common mistakes, fixing layouts.",
        subLectures: [
          { title: "Concept: common mistakes", duration: 30, order: 0 },
          { title: "Concept: fixing broken layouts", duration: 30, order: 1 }
        ]
      },
      {
        title: "L22: Industry Best Practices",
        duration: 60,
        order: 22,
        description: "Concepts: scalable structures, code maintainability.",
        subLectures: [
          { title: "Concept: scalable structure", duration: 30, order: 0 },
          { title: "Concept: maintainability", duration: 30, order: 1 }
        ]
      }
    ]
  },
  {
    chapterTitle: "Module 6: Projects (L23–L25)",
    chapterOrder: 6,
    lectures: [
      {
        title: "L23-L24: Project",
        duration: 120,
        order: 23,
        description: "Build: Personal Portfolio Website. Includes: navigation, sections, contact form.",
        subLectures: [
          { title: "Build: Personal Portfolio Website", duration: 40, order: 0 },
          { title: "Includes: Navigation", duration: 25, order: 1 },
          { title: "Includes: Sections", duration: 25, order: 2 },
          { title: "Includes: Contact form", duration: 30, order: 3 }
        ]
      },
      {
        title: "L25: Evaluation + Presentation",
        duration: 60,
        order: 25,
        description: "Includes: Code review, Viva questions, Mini presentation.",
        subLectures: [
          { title: "Includes: Code review", duration: 20, order: 0 },
          { title: "Includes: Viva questions", duration: 20, order: 1 },
          { title: "Includes: Mini presentation", duration: 20, order: 2 }
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

    // 2. Find or create Syllabus document for "HTML"
    let syllabus = await Syllabus.findOne({ subject: "HTML" });
    if (syllabus) {
      console.log(`Existing HTML Syllabus found (ID: ${syllabus._id}). Cleaning old chapters/lectures...`);
      
      // Clear associated chapters & lectures
      const deletedChapters = await Chapter.deleteMany({ subjectId: syllabus._id });
      console.log(`Deleted ${deletedChapters.deletedCount} old chapters.`);
      
      const deletedLectures = await Lecture.deleteMany({ syllabus: syllabus._id });
      console.log(`Deleted ${deletedLectures.deletedCount} old template lectures.`);

      // Also clean up any BatchLectures for this syllabus (keep BatchSyllabus mapping intact)
      const deletedBatchLectures = await BatchLecture.deleteMany({ syllabus: syllabus._id });
      console.log(`Deleted ${deletedBatchLectures.deletedCount} old batch-specific lectures.`);

      // Reset the syllabus arrays
      syllabus.lectures = [];
      syllabus.topics = [];
      syllabus.name = "HTML";
      syllabus.description = "HTML - LECTURE WISE PLAN ( NIT )";
      syllabus.code = "HTML-NIT";
      syllabus.createdBy = admin._id;
      await syllabus.save();
    } else {
      console.log("No existing HTML Syllabus found. Creating a new one...");
      syllabus = await Syllabus.create({
        subject: "HTML",
        name: "HTML",
        code: "HTML-NIT",
        description: "HTML - LECTURE WISE PLAN ( NIT )",
        createdBy: admin._id,
        lectures: [],
        topics: []
      });
      console.log(`Created new HTML Syllabus (ID: ${syllabus._id}).`);
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
          duration: lectureData.duration || 60,
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
    syllabus.topics = createdLectureIds; // sync topics (alias v2 compatibility)
    await syllabus.save();
    console.log("Updated Syllabus document with all new lectures.");

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

    console.log("Database seeding completed successfully!");
  } catch (error) {
    console.error("Seeding failed with error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MONGODB.");
  }
}

seed();
